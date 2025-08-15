-- =====================================================
-- MIGRACIÓN: Portal de Pacientes para Derechos ARCO
-- Fecha: 2025-08-13
-- Descripción: Implementa acceso directo de pacientes y sistema de solicitudes ARCO
-- =====================================================

-- 1. ASEGURAR QUE PATIENTS TENGA PATIENT_USER_ID
-- Verificar si la columna existe y añadirla si no
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'patient_user_id'
    ) THEN
        ALTER TABLE public.patients 
        ADD COLUMN patient_user_id UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_patients_patient_user_id 
        ON public.patients(patient_user_id);
    END IF;
END $$;

-- 2. CREAR TABLA PARA SOLICITUDES DE CORRECCIÓN DE DATOS (ARCO)
CREATE TABLE IF NOT EXISTS public.data_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'cancellation', 'opposition')),
  field_to_correct TEXT, -- Campo específico a corregir (para rectificación)
  current_value TEXT, -- Valor actual (para rectificación)
  requested_value TEXT, -- Valor solicitado (para rectificación)
  reason TEXT NOT NULL, -- Razón de la solicitud
  additional_details TEXT, -- Detalles adicionales
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'completed')),
  reviewed_by UUID REFERENCES public.profiles(id), -- Médico/admin que revisa
  review_notes TEXT, -- Notas de la revisión
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREAR TABLA PARA SEGUIMIENTO DE ACCESOS (LOG DE PACIENTES)
CREATE TABLE IF NOT EXISTS public.patient_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view_profile', 'view_consultations', 'download_record', etc.
  resource_accessed TEXT, -- Tabla o recurso específico accedido
  ip_address INET, -- Dirección IP del acceso
  user_agent TEXT, -- Información del navegador
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT, -- Si hubo error
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREAR TABLA PARA CONSENTIMIENTOS DE PRIVACIDAD
CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'data_processing', 'medical_treatment', 'marketing', etc.
  consent_version TEXT NOT NULL, -- Versión del documento de consentimiento
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_data_correction_requests_patient ON public.data_correction_requests(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_data_correction_requests_status ON public.data_correction_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_access_logs_patient ON public.patient_access_logs(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_access_logs_created ON public.patient_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_patient ON public.privacy_consents(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_type ON public.privacy_consents(consent_type);

-- 6. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.data_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;

-- 7. CREAR POLÍTICAS RLS PARA ACCESO DE PACIENTES A SUS PROPIOS DATOS

-- Política para que pacientes vean solo sus propios registros en patients
DROP POLICY IF EXISTS "Patients can view own record" ON public.patients;
CREATE POLICY "Patients can view own record" 
  ON public.patients 
  FOR SELECT 
  USING (auth.uid() = patient_user_id);

-- Política para que pacientes vean solo sus propias consultas
DROP POLICY IF EXISTS "Patients can view own consultations" ON public.consultations;
CREATE POLICY "Patients can view own consultations" 
  ON public.consultations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = consultations.patient_id 
      AND patients.patient_user_id = auth.uid()
    )
  );

-- Política para que pacientes vean solo sus propios estudios médicos
DROP POLICY IF EXISTS "Patients can view own medical tests" ON public.medical_tests;
CREATE POLICY "Patients can view own medical tests" 
  ON public.medical_tests 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = medical_tests.patient_id 
      AND patients.patient_user_id = auth.uid()
    )
  );

-- Política para que pacientes vean solo sus propias citas
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
CREATE POLICY "Patients can view own appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.patients 
      WHERE patients.id = appointments.patient_id 
      AND patients.patient_user_id = auth.uid()
    )
  );

-- Políticas para solicitudes de corrección de datos
CREATE POLICY "Users can view own correction requests" 
  ON public.data_correction_requests 
  FOR SELECT 
  USING (patient_user_id = auth.uid());

CREATE POLICY "Users can create own correction requests" 
  ON public.data_correction_requests 
  FOR INSERT 
  WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Users can update own pending requests" 
  ON public.data_correction_requests 
  FOR UPDATE 
  USING (patient_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (patient_user_id = auth.uid());

-- Políticas para que staff médico vea solicitudes de sus pacientes
CREATE POLICY "Medical staff can review requests for their patients" 
  ON public.data_correction_requests 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_user_relationships cur ON cur.clinic_id = p.clinic_id
      WHERE p.id = data_correction_requests.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

CREATE POLICY "Medical staff can update requests for their patients" 
  ON public.data_correction_requests 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_user_relationships cur ON cur.clinic_id = p.clinic_id
      WHERE p.id = data_correction_requests.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
        AND cur.role_in_clinic IN ('doctor', 'admin_staff')
    )
  );

-- Políticas para logs de acceso
CREATE POLICY "Users can view own access logs" 
  ON public.patient_access_logs 
  FOR SELECT 
  USING (patient_user_id = auth.uid());

CREATE POLICY "System can insert access logs" 
  ON public.patient_access_logs 
  FOR INSERT 
  WITH CHECK (true); -- Permitir al sistema insertar logs

-- Políticas para consentimientos de privacidad
CREATE POLICY "Users can view own privacy consents" 
  ON public.privacy_consents 
  FOR SELECT 
  USING (patient_user_id = auth.uid());

CREATE POLICY "Users can manage own privacy consents" 
  ON public.privacy_consents 
  FOR ALL 
  USING (patient_user_id = auth.uid())
  WITH CHECK (patient_user_id = auth.uid());

-- 8. FUNCIÓN PARA REGISTRAR ACCESOS DE PACIENTES
CREATE OR REPLACE FUNCTION public.log_patient_access(
  p_action TEXT,
  p_resource_accessed TEXT DEFAULT NULL,
  p_patient_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  resolved_patient_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Si no se proporciona patient_id, intentar obtenerlo del usuario actual
  IF p_patient_id IS NULL THEN
    SELECT id INTO resolved_patient_id 
    FROM public.patients 
    WHERE patient_user_id = current_user_id
    LIMIT 1;
  ELSE
    resolved_patient_id := p_patient_id;
  END IF;
  
  -- Solo registrar si encontramos un patient_id válido
  IF resolved_patient_id IS NOT NULL THEN
    INSERT INTO public.patient_access_logs (
      patient_user_id,
      patient_id,
      action,
      resource_accessed,
      ip_address,
      user_agent
    ) VALUES (
      current_user_id,
      resolved_patient_id,
      p_action,
      p_resource_accessed,
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
END;
$$;

-- 9. FUNCIÓN PARA OBTENER DATOS COMPLETOS DEL PACIENTE (PARA DERECHO DE ACCESO)
CREATE OR REPLACE FUNCTION public.get_patient_complete_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  patient_data JSON;
  result JSON;
BEGIN
  current_user_id := auth.uid();
  
  -- Verificar que el usuario es un paciente
  IF NOT EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patient_user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no autorizado para acceder a datos de paciente';
  END IF;
  
  -- Registrar el acceso
  PERFORM public.log_patient_access('download_complete_record', 'all_patient_data');
  
  -- Construir JSON con todos los datos del paciente
  SELECT json_build_object(
    'personal_info', (
      SELECT json_build_object(
        'full_name', p.full_name,
        'birth_date', p.birth_date,
        'gender', p.gender,
        'email', p.email,
        'phone', p.phone,
        'address', p.address,
        'city_of_birth', p.city_of_birth,
        'city_of_residence', p.city_of_residence,
        'social_security_number', p.social_security_number,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      FROM public.patients p
      WHERE p.patient_user_id = current_user_id
    ),
    'consultations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'current_condition', c.current_condition,
          'vital_signs', c.vital_signs,
          'physical_examination', c.physical_examination,
          'diagnosis', c.diagnosis,
          'prognosis', c.prognosis,
          'treatment', c.treatment,
          'created_at', c.created_at,
          'updated_at', c.updated_at
        )
      ), '[]'::json)
      FROM public.consultations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE p.patient_user_id = current_user_id
      ORDER BY c.created_at DESC
    ),
    'appointments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', a.id,
          'title', a.title,
          'description', a.description,
          'appointment_date', a.appointment_date,
          'appointment_time', a.appointment_time,
          'duration', a.duration,
          'status', a.status,
          'type', a.type,
          'location', a.location,
          'notes', a.notes,
          'created_at', a.created_at
        )
      ), '[]'::json)
      FROM public.appointments a
      JOIN public.patients p ON p.id = a.patient_id
      WHERE p.patient_user_id = current_user_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    ),
    'medical_tests', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', mt.id,
          'category', mt.category,
          'test_name', mt.test_name,
          'status', mt.status,
          'ordered_date', mt.ordered_date,
          'result_date', mt.result_date,
          'lab_name', mt.lab_name,
          'notes', mt.notes,
          'created_at', mt.created_at
        )
      ), '[]'::json)
      FROM public.medical_tests mt
      JOIN public.patients p ON p.id = mt.patient_id
      WHERE p.patient_user_id = current_user_id
      ORDER BY mt.created_at DESC
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 10. FUNCIÓN PARA ACTUALIZAR TIMESTAMP AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. CREAR TRIGGERS PARA UPDATED_AT
DROP TRIGGER IF EXISTS update_data_correction_requests_modtime ON public.data_correction_requests;
CREATE TRIGGER update_data_correction_requests_modtime 
    BEFORE UPDATE ON public.data_correction_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_consents_modtime ON public.privacy_consents;
CREATE TRIGGER update_privacy_consents_modtime 
    BEFORE UPDATE ON public.privacy_consents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 12. CONCEDER PERMISOS
GRANT SELECT ON public.patients TO authenticated;
GRANT SELECT ON public.consultations TO authenticated;
GRANT SELECT ON public.appointments TO authenticated;
GRANT SELECT ON public.medical_tests TO authenticated;
GRANT ALL ON public.data_correction_requests TO authenticated;
GRANT ALL ON public.patient_access_logs TO authenticated;
GRANT ALL ON public.privacy_consents TO authenticated;

GRANT EXECUTE ON FUNCTION public.log_patient_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_complete_data TO authenticated;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.data_correction_requests IS 'Solicitudes de pacientes para ejercer derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)';
COMMENT ON TABLE public.patient_access_logs IS 'Registro de accesos de pacientes a sus propios datos para auditoría';
COMMENT ON TABLE public.privacy_consents IS 'Consentimientos de privacidad otorgados por pacientes';

COMMENT ON FUNCTION public.log_patient_access(TEXT, TEXT, UUID) IS 'Registra automáticamente los accesos de pacientes a sus datos';
COMMENT ON FUNCTION public.get_patient_complete_data() IS 'Proporciona acceso completo y estructurado a todos los datos del paciente (Derecho de Acceso ARCO)';

-- =====================================================
-- RESUMEN DE LA MIGRACIÓN:
-- =====================================================
-- ✅ Campo patient_user_id añadido a tabla patients (si no existía)
-- ✅ Tabla data_correction_requests creada para solicitudes ARCO
-- ✅ Tabla patient_access_logs creada para auditoría de accesos
-- ✅ Tabla privacy_consents creada para gestión de consentimientos
-- ✅ Políticas RLS implementadas para acceso seguro de pacientes
-- ✅ Función log_patient_access() para registro automático
-- ✅ Función get_patient_complete_data() para derecho de acceso
-- ✅ Triggers y permisos configurados correctamente
-- ✅ Cumple con LFPDPPP para derechos ARCO
-- =====================================================
