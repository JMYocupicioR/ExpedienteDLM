-- =====================================================
-- MIGRACIÓN: Sistema de Notificaciones Clínicas Proactivas
-- Fecha: 2025-08-13
-- Descripción: Implementa reglas clínicas automáticas para cumplir con NOM-024
-- =====================================================

-- 1. CREAR TABLA PARA REGLAS CLÍNICAS
CREATE TABLE IF NOT EXISTS public.clinical_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_condition TEXT NOT NULL, -- Condición objetivo (ej: "diabetes_tipo_2", "hipertension")
  trigger_logic TEXT NOT NULL, -- Lógica del trigger (ej: "no_consultation_in_months:6")
  notification_template TEXT NOT NULL, -- Plantilla del mensaje
  suggested_action JSONB NOT NULL DEFAULT '{}', -- Acción sugerida en formato JSON
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  clinic_id UUID REFERENCES public.clinics(id) -- Reglas específicas por clínica
);

-- 2. AÑADIR CAMPO SUGGESTED_ACTION A NOTIFICATIONS (SI NO EXISTE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'suggested_action'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN suggested_action JSONB;
    END IF;
END $$;

-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_clinical_rules_active ON public.clinical_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_clinical_rules_condition ON public.clinical_rules(target_condition);
CREATE INDEX IF NOT EXISTS idx_clinical_rules_clinic ON public.clinical_rules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_suggested_action ON public.notifications USING GIN (suggested_action);

-- 4. HABILITAR RLS PARA CLINICAL_RULES
ALTER TABLE public.clinical_rules ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA CLINICAL_RULES
-- Solo staff médico y administradores pueden gestionar reglas
CREATE POLICY "Medical staff can view clinic rules" 
  ON public.clinical_rules 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = clinical_rules.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
        AND cur.role_in_clinic IN ('doctor', 'admin_staff')
    )
  );

CREATE POLICY "Medical staff can manage clinic rules" 
  ON public.clinical_rules 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = clinical_rules.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
        AND cur.role_in_clinic IN ('doctor', 'admin_staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = clinical_rules.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
        AND cur.role_in_clinic IN ('doctor', 'admin_staff')
    )
  );

-- 6. FUNCIÓN PARA PROCESAR REGLAS CLÍNICAS
CREATE OR REPLACE FUNCTION public.process_clinical_rules()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule_record RECORD;
  patient_record RECORD;
  notification_count INTEGER := 0;
  processed_rules INTEGER := 0;
  rule_logic TEXT;
  trigger_months INTEGER;
  target_condition_pattern TEXT;
  notification_message TEXT;
  suggested_action_data JSONB;
  doctor_id UUID;
  result JSON;
BEGIN
  -- Log inicio del procesamiento
  RAISE NOTICE 'Iniciando procesamiento de reglas clínicas a las %', NOW();
  
  -- Iterar sobre todas las reglas activas
  FOR rule_record IN 
    SELECT * FROM public.clinical_rules 
    WHERE is_active = true
    ORDER BY created_at
  LOOP
    processed_rules := processed_rules + 1;
    RAISE NOTICE 'Procesando regla: % (ID: %)', rule_record.name, rule_record.id;
    
    -- Parsear la lógica del trigger
    rule_logic := rule_record.trigger_logic;
    
    -- Manejar diferentes tipos de lógica
    IF rule_logic LIKE 'no_consultation_in_months:%' THEN
      -- Extraer el número de meses
      trigger_months := CAST(SPLIT_PART(rule_logic, ':', 2) AS INTEGER);
      target_condition_pattern := '%' || rule_record.target_condition || '%';
      
      RAISE NOTICE 'Buscando pacientes con % sin consulta en % meses', rule_record.target_condition, trigger_months;
      
      -- Buscar pacientes que cumplan con la condición
      FOR patient_record IN
        SELECT DISTINCT 
          p.id as patient_id,
          p.full_name as patient_name,
          p.primary_doctor_id,
          p.clinic_id,
          MAX(c.created_at) as last_consultation
        FROM public.patients p
        LEFT JOIN public.consultations c ON c.patient_id = p.id
        WHERE p.is_active = true
          AND (rule_record.clinic_id IS NULL OR p.clinic_id = rule_record.clinic_id)
          AND EXISTS (
            SELECT 1 FROM public.consultations c2
            WHERE c2.patient_id = p.id
              AND (c2.diagnosis ILIKE target_condition_pattern 
                   OR c2.current_condition ILIKE target_condition_pattern)
          )
        GROUP BY p.id, p.full_name, p.primary_doctor_id, p.clinic_id
        HAVING (
          MAX(c.created_at) IS NULL 
          OR MAX(c.created_at) < NOW() - (trigger_months || ' months')::INTERVAL
        )
      LOOP
        -- Determinar el doctor a notificar
        doctor_id := patient_record.primary_doctor_id;
        
        -- Si no hay doctor primario, buscar el último doctor que atendió al paciente
        IF doctor_id IS NULL THEN
          SELECT c.doctor_id INTO doctor_id
          FROM public.consultations c
          WHERE c.patient_id = patient_record.patient_id
          ORDER BY c.created_at DESC
          LIMIT 1;
        END IF;
        
        -- Si aún no hay doctor, buscar un doctor activo de la clínica
        IF doctor_id IS NULL THEN
          SELECT cur.user_id INTO doctor_id
          FROM public.clinic_user_relationships cur
          WHERE cur.clinic_id = patient_record.clinic_id
            AND cur.role_in_clinic = 'doctor'
            AND cur.status = 'approved'
            AND cur.is_active = true
          ORDER BY cur.created_at
          LIMIT 1;
        END IF;
        
        -- Solo proceder si encontramos un doctor
        IF doctor_id IS NOT NULL THEN
          -- Construir el mensaje de notificación
          notification_message := REPLACE(rule_record.notification_template, '{patient_name}', patient_record.patient_name);
          notification_message := REPLACE(notification_message, '{condition}', rule_record.target_condition);
          notification_message := REPLACE(notification_message, '{months}', trigger_months::TEXT);
          
          -- Construir la acción sugerida
          suggested_action_data := jsonb_build_object(
            'type', 'schedule_appointment',
            'label', 'Agendar Cita de Seguimiento',
            'data', jsonb_build_object(
              'patient_id', patient_record.patient_id,
              'patient_name', patient_record.patient_name,
              'priority', 'normal',
              'notes', 'Seguimiento automático por regla clínica: ' || rule_record.name,
              'rule_id', rule_record.id
            )
          );
          
          -- Verificar si ya existe una notificación similar reciente (últimas 48 horas)
          IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = doctor_id
              AND related_entity_type = 'clinical_rule'
              AND related_entity_id = rule_record.id::TEXT
              AND message LIKE '%' || patient_record.patient_name || '%'
              AND created_at > NOW() - INTERVAL '48 hours'
          ) THEN
            -- Crear la notificación
            INSERT INTO public.notifications (
              user_id,
              message,
              title,
              related_entity_type,
              related_entity_id,
              priority,
              suggested_action
            ) VALUES (
              doctor_id,
              notification_message,
              'Alerta Clínica: ' || rule_record.name,
              'clinical_rule',
              rule_record.id::TEXT,
              'normal',
              suggested_action_data
            );
            
            notification_count := notification_count + 1;
            RAISE NOTICE 'Notificación creada para paciente % (Doctor: %)', patient_record.patient_name, doctor_id;
          ELSE
            RAISE NOTICE 'Notificación duplicada evitada para paciente %', patient_record.patient_name;
          END IF;
        ELSE
          RAISE NOTICE 'No se encontró doctor para notificar sobre paciente %', patient_record.patient_name;
        END IF;
      END LOOP;
      
    ELSIF rule_logic LIKE 'medication_reminder_days:%' THEN
      -- Lógica futura para recordatorios de medicamentos
      RAISE NOTICE 'Tipo de regla no implementado aún: %', rule_logic;
      
    ELSIF rule_logic LIKE 'test_due_months:%' THEN
      -- Lógica futura para recordatorios de estudios
      RAISE NOTICE 'Tipo de regla no implementado aún: %', rule_logic;
      
    ELSE
      RAISE NOTICE 'Tipo de regla desconocido: %', rule_logic;
    END IF;
  END LOOP;
  
  -- Construir resultado
  result := json_build_object(
    'success', true,
    'processed_rules', processed_rules,
    'notifications_created', notification_count,
    'processed_at', NOW()
  );
  
  RAISE NOTICE 'Procesamiento completado. Reglas procesadas: %, Notificaciones creadas: %', 
    processed_rules, notification_count;
  
  RETURN result;
END;
$$;

-- 7. FUNCIÓN AUXILIAR PARA CREAR REGLAS CLÍNICAS PREDEFINIDAS
CREATE OR REPLACE FUNCTION public.create_default_clinical_rules(p_clinic_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_count INTEGER := 0;
BEGIN
  -- Regla para diabetes sin seguimiento
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Diabetes - 6 meses',
    'Alerta cuando un paciente con diabetes no ha tenido consulta en 6 meses',
    'diabetes',
    'no_consultation_in_months:6',
    'El paciente {patient_name} con diabetes no ha tenido consulta de seguimiento en {months} meses. Se recomienda agendar cita para control glucémico.',
    '{"type": "schedule_appointment", "label": "Agendar Control Diabético", "priority": "high"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  -- Regla para hipertensión sin seguimiento
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Hipertensión - 4 meses',
    'Alerta cuando un paciente con hipertensión no ha tenido consulta en 4 meses',
    'hipertension',
    'no_consultation_in_months:4',
    'El paciente {patient_name} con hipertensión no ha tenido consulta de seguimiento en {months} meses. Se recomienda agendar cita para control de presión arterial.',
    '{"type": "schedule_appointment", "label": "Agendar Control de Presión", "priority": "high"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  -- Regla para enfermedades cardíacas
  INSERT INTO public.clinical_rules (
    name,
    description,
    target_condition,
    trigger_logic,
    notification_template,
    suggested_action,
    clinic_id,
    created_by
  ) VALUES (
    'Seguimiento Cardiopatía - 3 meses',
    'Alerta cuando un paciente con enfermedad cardíaca no ha tenido consulta en 3 meses',
    'cardio',
    'no_consultation_in_months:3',
    'El paciente {patient_name} con enfermedad cardíaca no ha tenido consulta de seguimiento en {months} meses. Se recomienda evaluación cardiológica urgente.',
    '{"type": "schedule_appointment", "label": "Agendar Evaluación Cardíaca", "priority": "urgent"}',
    p_clinic_id,
    auth.uid()
  ) ON CONFLICT DO NOTHING;
  
  IF FOUND THEN
    created_count := created_count + 1;
  END IF;
  
  RETURN created_count;
END;
$$;

-- 8. TRIGGER PARA UPDATED_AT
DROP TRIGGER IF EXISTS update_clinical_rules_modtime ON public.clinical_rules;
CREATE TRIGGER update_clinical_rules_modtime 
    BEFORE UPDATE ON public.clinical_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. CONCEDER PERMISOS
GRANT ALL ON public.clinical_rules TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_clinical_rules TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_clinical_rules TO authenticated;

-- 10. CREAR REGLAS CLÍNICAS PREDEFINIDAS (GLOBALES)
SELECT public.create_default_clinical_rules();

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.clinical_rules IS 'Reglas clínicas automáticas para generar notificaciones proactivas (cumplimiento NOM-024)';
COMMENT ON COLUMN public.clinical_rules.target_condition IS 'Condición médica objetivo (ej: diabetes, hipertension, cardio)';
COMMENT ON COLUMN public.clinical_rules.trigger_logic IS 'Lógica que dispara la regla (ej: no_consultation_in_months:6)';
COMMENT ON COLUMN public.clinical_rules.notification_template IS 'Plantilla del mensaje con variables {patient_name}, {condition}, {months}';
COMMENT ON COLUMN public.clinical_rules.suggested_action IS 'Acción sugerida en formato JSON con type, label y data';

COMMENT ON FUNCTION public.process_clinical_rules() IS 'Procesa todas las reglas clínicas activas y genera notificaciones según corresponda';
COMMENT ON FUNCTION public.create_default_clinical_rules(UUID) IS 'Crea reglas clínicas predefinidas para una clínica específica o globalmente';

-- =====================================================
-- RESUMEN DE LA MIGRACIÓN:
-- =====================================================
-- ✅ Tabla clinical_rules creada para definir reglas automáticas
-- ✅ Campo suggested_action añadido a notifications
-- ✅ Función process_clinical_rules() implementada para procesamiento automático
-- ✅ Función create_default_clinical_rules() para reglas predefinidas
-- ✅ Políticas RLS implementadas para acceso seguro
-- ✅ Índices optimizados para consultas eficientes
-- ✅ Reglas predefinidas creadas para diabetes, hipertensión y cardiopatías
-- ✅ Cumple con NOM-024 para alertas preventivas
-- ✅ Sistema preparado para Cron Job automático
-- =====================================================
