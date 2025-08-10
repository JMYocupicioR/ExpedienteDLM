-- =====================================================
-- MIGRACIÓN: Corrección del Sistema de Recetas
-- Fecha: 2024-12-01
-- Descripción: Crear tablas faltantes y corregir esquema de prescripciones
-- =====================================================

-- =====================================================
-- 1. CREAR TABLA DE PLANTILLAS DE RECETAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prescription_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  style_definition JSONB NOT NULL DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Un médico, una plantilla de formato
);

-- RLS para prescription_templates
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_templates_select_policy"
ON prescription_templates FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "prescription_templates_modify_policy"
ON prescription_templates FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_prescription_templates
  BEFORE UPDATE ON public.prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- 2. CREAR TABLA DE RELACIÓN CONSULTA-RECETA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consultation_prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consultation_id, prescription_id)
);

-- RLS para consultation_prescriptions
ALTER TABLE public.consultation_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultation_prescriptions_select_policy"
ON consultation_prescriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM consultations c
    WHERE c.id = consultation_id 
    AND (c.doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'nurse'))
  )
);

CREATE POLICY "consultation_prescriptions_modify_policy"
ON consultation_prescriptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM consultations c
    WHERE c.id = consultation_id 
    AND (c.doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM consultations c
    WHERE c.id = consultation_id 
    AND c.doctor_id = auth.uid()
  )
);

-- =====================================================
-- 3. ACTUALIZAR TABLA PRESCRIPTIONS CON CAMPOS FALTANTES
-- =====================================================

-- Agregar campos faltantes a la tabla prescriptions
ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Función para calcular fecha de expiración automática
CREATE OR REPLACE FUNCTION public.calculate_prescription_expiry(medications JSONB)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  max_duration INTEGER := 30; -- Por defecto 30 días
  medication JSONB;
BEGIN
  -- Buscar la duración más larga en los medicamentos
  FOR medication IN SELECT jsonb_array_elements(medications)
  LOOP
    IF (medication->>'duration')::INTEGER IS NOT NULL THEN
      max_duration := GREATEST(max_duration, (medication->>'duration')::INTEGER);
    END IF;
  END LOOP;
  
  RETURN NOW() + (max_duration || ' days')::INTERVAL;
END;
$$;

-- Actualizar prescripciones existentes sin fecha de expiración
UPDATE public.prescriptions 
SET expires_at = calculate_prescription_expiry(medications)
WHERE expires_at IS NULL;

-- =====================================================
-- 4. CREAR TABLA DE PLANTILLAS DE MEDICAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.medication_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  medications JSONB NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para medication_templates
ALTER TABLE public.medication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medication_templates_select_policy"
ON medication_templates FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid() OR 
  is_public = true OR 
  auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);

CREATE POLICY "medication_templates_modify_policy"
ON medication_templates FOR ALL
TO authenticated
USING (
  doctor_id = auth.uid() OR 
  auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
)
WITH CHECK (
  doctor_id = auth.uid()
);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_medication_templates
  BEFORE UPDATE ON public.medication_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- 5. CREAR TABLA DE HISTORIAL DE RECETAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prescription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'modified', 'dispensed', 'cancelled'
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para prescription_history
ALTER TABLE public.prescription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_history_select_policy"
ON prescription_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.id = prescription_id 
    AND (p.doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'nurse'))
  )
);

CREATE POLICY "prescription_history_insert_policy"
ON prescription_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.id = prescription_id 
    AND p.doctor_id = auth.uid()
  )
);

-- =====================================================
-- 6. CREAR FUNCIÓN PARA AUDITORÍA AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.prescription_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Registrar cambios en prescription_history
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.prescription_history (
      prescription_id,
      action,
      new_values,
      performed_by
    ) VALUES (
      NEW.id,
      'created',
      to_jsonb(NEW),
      NEW.doctor_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.prescription_history (
      prescription_id,
      action,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      NEW.id,
      'modified',
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.doctor_id
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Crear trigger de auditoría
DROP TRIGGER IF EXISTS prescription_audit ON public.prescriptions;
CREATE TRIGGER prescription_audit
  AFTER INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION prescription_audit_trigger();

-- =====================================================
-- 7. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_expires_at ON prescriptions(expires_at);

CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_consultation ON consultation_prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_prescription ON consultation_prescriptions(prescription_id);

CREATE INDEX IF NOT EXISTS idx_medication_templates_doctor ON medication_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medication_templates_category ON medication_templates(category);
CREATE INDEX IF NOT EXISTS idx_medication_templates_public ON medication_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_prescription_history_prescription ON prescription_history(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_history_action ON prescription_history(action);

-- =====================================================
-- 8. INSERTAR DATOS DE EJEMPLO PARA CATÁLOGO DE MEDICAMENTOS
-- =====================================================

-- Solo insertar si no existen medicamentos
INSERT INTO public.medications_catalog (name, generic_name, active_ingredient, therapeutic_group, form, strength, is_controlled, requires_prescription, contraindications, side_effects)
SELECT * FROM (VALUES
  ('Paracetamol', 'Acetaminofén', 'Acetaminofén', 'Analgésico/Antipirético', 'Tableta', '500mg', false, false, ARRAY['Insuficiencia hepática grave'], ARRAY['Hepatotoxicidad en sobredosis']),
  ('Ibuprofeno', 'Ibuprofeno', 'Ibuprofeno', 'AINE', 'Tableta', '400mg', false, false, ARRAY['Úlcera péptica activa', 'Insuficiencia renal grave'], ARRAY['Molestias gastrointestinales', 'Mareo']),
  ('Amoxicilina', 'Amoxicilina', 'Amoxicilina', 'Antibiótico penicilina', 'Cápsula', '500mg', false, true, ARRAY['Alergia a penicilinas'], ARRAY['Diarrea', 'Náuseas', 'Rash cutáneo']),
  ('Losartán', 'Losartán', 'Losartán potásico', 'ARA II', 'Tableta', '50mg', false, true, ARRAY['Embarazo', 'Hiperpotasemia'], ARRAY['Mareo', 'Fatiga', 'Hipotensión']),
  ('Metformina', 'Metformina', 'Metformina clorhidrato', 'Antidiabético', 'Tableta', '850mg', false, true, ARRAY['Insuficiencia renal', 'Acidosis metabólica'], ARRAY['Molestias gastrointestinales', 'Sabor metálico'])
) AS new_medications(name, generic_name, active_ingredient, therapeutic_group, form, strength, is_controlled, requires_prescription, contraindications, side_effects)
WHERE NOT EXISTS (SELECT 1 FROM public.medications_catalog LIMIT 1);

-- =====================================================
-- 9. DATOS DE INTERACCIONES MEDICAMENTOSAS BÁSICAS
-- =====================================================

INSERT INTO public.drug_interactions (
  medication_a_ingredient, 
  medication_b_ingredient, 
  severity, 
  interaction_type, 
  clinical_effect, 
  recommendation
)
SELECT * FROM (VALUES
  ('Warfarina', 'Ibuprofeno', 'severe', 'Farmacódinámica', 'Aumento del riesgo de sangrado', 'Evitar uso concomitante. Considerar paracetamol como alternativa.'),
  ('Metformina', 'Alcohol', 'moderate', 'Farmacológica', 'Aumento del riesgo de acidosis láctica', 'Evitar consumo excesivo de alcohol.'),
  ('Losartán', 'Potasio', 'moderate', 'Farmacódinámica', 'Hiperpotasemia', 'Monitorear niveles de potasio sérico.'),
  ('Amoxicilina', 'Anticonceptivos orales', 'mild', 'Farmacológica', 'Reducción de la eficacia anticonceptiva', 'Usar métodos anticonceptivos adicionales.')
) AS new_interactions(medication_a_ingredient, medication_b_ingredient, severity, interaction_type, clinical_effect, recommendation)
WHERE NOT EXISTS (SELECT 1 FROM public.drug_interactions WHERE medication_a_ingredient = 'Warfarina' AND medication_b_ingredient = 'Ibuprofeno');

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE public.prescription_templates IS 'Plantillas de formato visual para recetas por médico';
COMMENT ON TABLE public.consultation_prescriptions IS 'Relación entre consultas médicas y prescripciones';
COMMENT ON TABLE public.medication_templates IS 'Plantillas de medicamentos reutilizables por médico';
COMMENT ON TABLE public.prescription_history IS 'Historial de cambios en prescripciones para auditoría';

-- Actualizar función de validación para incluir nuevos esquemas
CREATE OR REPLACE FUNCTION public.validate_jsonb_schema(data JSONB, schema_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid BOOLEAN := TRUE;
BEGIN
  CASE schema_name
    WHEN 'vital_signs' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        (data->>'systolic_pressure' IS NULL OR jsonb_typeof(data->'systolic_pressure') IN ('string', 'number')) AND
        (data->>'diastolic_pressure' IS NULL OR jsonb_typeof(data->'diastolic_pressure') IN ('string', 'number')) AND
        (data->>'heart_rate' IS NULL OR jsonb_typeof(data->'heart_rate') IN ('string', 'number')) AND
        (data->>'respiratory_rate' IS NULL OR jsonb_typeof(data->'respiratory_rate') IN ('string', 'number')) AND
        (data->>'temperature' IS NULL OR jsonb_typeof(data->'temperature') IN ('string', 'number'))
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'prescription' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        data ? 'medications' AND
        jsonb_typeof(data->'medications') = 'array' AND
        jsonb_array_length(data->'medications') <= 20
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'prescription_template' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        (data ? 'elements' OR data ? 'style_definition')
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'physical_examination' THEN
      IF NOT (jsonb_typeof(data) = 'object') THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'physical_exam_template' THEN
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        data ? 'sections' AND
        jsonb_typeof(data->'sections') = 'array'
      ) THEN
        is_valid := FALSE;
      END IF;
      
    ELSE
      IF NOT (jsonb_typeof(data) IN ('object', 'array')) THEN
        is_valid := FALSE;
      END IF;
  END CASE;
  
  RETURN is_valid;
END;
$$;
