/*
  # Migración para Mejorar Validación de Permisos y Especialidades Médicas
  
  1. Problemas identificados:
    - Falta validación de especialidades médicas para medicamentos controlados
    - Políticas RLS insuficientes para roles específicos
    - No hay verificación de licencias médicas activas
    
  2. Correcciones:
    - Crear tabla de especialidades médicas
    - Implementar validación de licencias médicas
    - Mejorar políticas RLS por rol y especialidad
    - Agregar auditoría de acciones críticas
*/

-- ===== CREAR TABLA DE ESPECIALIDADES MÉDICAS =====
CREATE TABLE IF NOT EXISTS public.medical_specialties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  can_prescribe_controlled BOOLEAN DEFAULT FALSE,
  required_certifications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== INSERTAR ESPECIALIDADES MÉDICAS ESTÁNDAR =====
INSERT INTO public.medical_specialties (code, name, description, can_prescribe_controlled, required_certifications) VALUES
('medicina_general', 'Medicina General', 'Atención médica primaria y preventiva', FALSE, ARRAY['titulo_medico']),
('medicina_interna', 'Medicina Interna', 'Diagnóstico y tratamiento de enfermedades internas del adulto', TRUE, ARRAY['titulo_medico', 'especialidad_medicina_interna']),
('cardiologia', 'Cardiología', 'Diagnóstico y tratamiento de enfermedades cardiovasculares', TRUE, ARRAY['titulo_medico', 'especialidad_cardiologia']),
('neurologia', 'Neurología', 'Diagnóstico y tratamiento de enfermedades del sistema nervioso', TRUE, ARRAY['titulo_medico', 'especialidad_neurologia']),
('anestesiologia', 'Anestesiología', 'Administración de anestesia y cuidados perioperatorios', TRUE, ARRAY['titulo_medico', 'especialidad_anestesiologia']),
('psiquiatria', 'Psiquiatría', 'Diagnóstico y tratamiento de trastornos mentales', TRUE, ARRAY['titulo_medico', 'especialidad_psiquiatria']),
('oncologia', 'Oncología', 'Diagnóstico y tratamiento del cáncer', TRUE, ARRAY['titulo_medico', 'especialidad_oncologia']),
('pediatria', 'Pediatría', 'Atención médica de niños y adolescentes', FALSE, ARRAY['titulo_medico', 'especialidad_pediatria']),
('ginecologia', 'Ginecología', 'Salud reproductiva femenina', FALSE, ARRAY['titulo_medico', 'especialidad_ginecologia']),
('dermatologia', 'Dermatología', 'Diagnóstico y tratamiento de enfermedades de la piel', FALSE, ARRAY['titulo_medico', 'especialidad_dermatologia'])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  can_prescribe_controlled = EXCLUDED.can_prescribe_controlled,
  required_certifications = EXCLUDED.required_certifications,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ===== CREAR TABLA DE MEDICAMENTOS CONTROLADOS =====
CREATE TABLE IF NOT EXISTS public.controlled_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'narcotic', 'psychotropic', 'benzodiazepine', etc.
  schedule VARCHAR(10) NOT NULL, -- 'I', 'II', 'III', 'IV', 'V'
  requires_specialist BOOLEAN DEFAULT TRUE,
  allowed_specialties TEXT[], -- códigos de especialidades que pueden prescribir
  max_prescription_days INTEGER DEFAULT 7,
  requires_justification BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== INSERTAR MEDICAMENTOS CONTROLADOS COMUNES =====
INSERT INTO public.controlled_medications (name, category, schedule, requires_specialist, allowed_specialties, max_prescription_days, requires_justification) VALUES
('tramadol', 'narcotic', 'IV', TRUE, ARRAY['medicina_interna', 'anestesiologia', 'neurologia'], 5, TRUE),
('morfina', 'narcotic', 'II', TRUE, ARRAY['anestesiologia', 'oncologia', 'medicina_interna'], 3, TRUE),
('fentanilo', 'narcotic', 'II', TRUE, ARRAY['anestesiologia', 'oncologia'], 3, TRUE),
('oxycodone', 'narcotic', 'II', TRUE, ARRAY['anestesiologia', 'oncologia', 'medicina_interna'], 3, TRUE),
('alprazolam', 'benzodiazepine', 'IV', TRUE, ARRAY['psiquiatria', 'neurologia', 'medicina_interna'], 7, TRUE),
('lorazepam', 'benzodiazepine', 'IV', TRUE, ARRAY['psiquiatria', 'neurologia', 'medicina_interna'], 7, TRUE),
('clonazepam', 'benzodiazepine', 'IV', TRUE, ARRAY['psiquiatria', 'neurologia'], 14, TRUE),
('diazepam', 'benzodiazepine', 'IV', TRUE, ARRAY['psiquiatria', 'neurologia', 'medicina_interna'], 10, TRUE),
('metilfenidato', 'psychotropic', 'II', TRUE, ARRAY['psiquiatria', 'neurologia'], 30, TRUE),
('anfetamina', 'psychotropic', 'II', TRUE, ARRAY['psiquiatria'], 30, TRUE)
ON CONFLICT DO NOTHING;

-- ===== ACTUALIZAR TABLA PROFILES CON ESPECIALIDADES =====
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS medical_license VARCHAR(50),
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS specialty_code VARCHAR(50) REFERENCES public.medical_specialties(code),
ADD COLUMN IF NOT EXISTS certifications TEXT[],
ADD COLUMN IF NOT EXISTS is_license_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_prescribe_controlled BOOLEAN DEFAULT FALSE;

-- ===== FUNCIÓN PARA VALIDAR LICENCIA MÉDICA =====
CREATE OR REPLACE FUNCTION public.validate_medical_license(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  specialty_record medical_specialties%ROWTYPE;
BEGIN
  -- Obtener perfil del usuario
  SELECT * INTO profile_record FROM profiles WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que es doctor
  IF profile_record.role != 'doctor' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar licencia activa
  IF NOT profile_record.is_license_active THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar fecha de expiración de licencia
  IF profile_record.license_expiry_date IS NOT NULL AND 
     profile_record.license_expiry_date < CURRENT_DATE THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar especialidad válida
  IF profile_record.specialty_code IS NOT NULL THEN
    SELECT * INTO specialty_record 
    FROM medical_specialties 
    WHERE code = profile_record.specialty_code;
    
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== FUNCIÓN PARA VERIFICAR PERMISOS DE MEDICAMENTO CONTROLADO =====
CREATE OR REPLACE FUNCTION public.can_prescribe_controlled_medication(
  user_id UUID,
  medication_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  medication_record controlled_medications%ROWTYPE;
  specialty_can_prescribe BOOLEAN := FALSE;
BEGIN
  -- Validar licencia médica básica
  IF NOT validate_medical_license(user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Obtener información del medicamento controlado
  SELECT * INTO medication_record 
  FROM controlled_medications 
  WHERE LOWER(name) = LOWER(medication_name);
  
  IF NOT FOUND THEN
    -- Si no está en la lista de controlados, permitir
    RETURN TRUE;
  END IF;
  
  -- Obtener perfil del usuario
  SELECT * INTO profile_record FROM profiles WHERE id = user_id;
  
  -- Verificar si el usuario puede prescribir medicamentos controlados
  IF NOT profile_record.can_prescribe_controlled THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si la especialidad está autorizada para este medicamento
  IF medication_record.allowed_specialties IS NOT NULL THEN
    specialty_can_prescribe := profile_record.specialty_code = ANY(medication_record.allowed_specialties);
    
    IF NOT specialty_can_prescribe THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== FUNCIÓN PARA AUDITAR PRESCRIPCIONES DE MEDICAMENTOS CONTROLADOS =====
CREATE TABLE IF NOT EXISTS public.prescription_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions(id),
  doctor_id UUID REFERENCES public.profiles(id),
  patient_id UUID REFERENCES public.patients(id),
  medication_name TEXT NOT NULL,
  is_controlled BOOLEAN DEFAULT FALSE,
  specialty_code VARCHAR(50),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== TRIGGER PARA AUDITAR PRESCRIPCIONES =====
CREATE OR REPLACE FUNCTION public.audit_prescription()
RETURNS TRIGGER AS $$
DECLARE
  med JSONB;
  is_controlled BOOLEAN;
  profile_record profiles%ROWTYPE;
BEGIN
  -- Obtener información del doctor
  SELECT * INTO profile_record FROM profiles WHERE id = NEW.doctor_id;
  
  -- Auditar cada medicamento en la prescripción
  FOR med IN SELECT * FROM jsonb_array_elements(NEW.medications) LOOP
    -- Verificar si es medicamento controlado
    SELECT COUNT(*) > 0 INTO is_controlled
    FROM controlled_medications
    WHERE LOWER(name) = LOWER(med->>'name');
    
    -- Insertar registro de auditoría
    INSERT INTO prescription_audit (
      prescription_id,
      doctor_id,
      patient_id,
      medication_name,
      is_controlled,
      specialty_code,
      action,
      justification
    ) VALUES (
      NEW.id,
      NEW.doctor_id,
      NEW.patient_id,
      med->>'name',
      is_controlled,
      profile_record.specialty_code,
      TG_OP,
      NEW.notes
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_prescription_trigger ON prescriptions;
CREATE TRIGGER audit_prescription_trigger
  AFTER INSERT OR UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION audit_prescription();

-- ===== POLÍTICAS RLS MEJORADAS =====

-- Política para profiles con validación de especialidad
DROP POLICY IF EXISTS "Users can view their own profile and doctors can view other doctors" ON profiles;
CREATE POLICY "Users can view their own profile and doctors can view other doctors"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Usuario puede ver su propio perfil
    id = auth.uid() OR
    -- Doctores y administradores pueden ver otros profiles
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
      AND validate_medical_license(auth.uid())
    ))
  );

-- Política para prescriptions con validación de medicamentos controlados
DROP POLICY IF EXISTS "Doctors can create prescriptions with controlled medication validation" ON prescriptions;
CREATE POLICY "Doctors can create prescriptions with controlled medication validation"
  ON prescriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verificar que es doctor con licencia válida
    validate_medical_license(auth.uid()) AND
    -- Verificar que el doctor puede prescribir todos los medicamentos
    (SELECT bool_and(
      can_prescribe_controlled_medication(auth.uid(), med->>'name')
    ) FROM jsonb_array_elements(medications) AS med) AND
    -- Verificar estructura de medicamentos válida
    validate_jsonb_schema(medications, 'medications') AND
    -- Verificar que el doctor_id coincide con el usuario autenticado
    doctor_id = auth.uid()
  );

-- Política para consultas con validación de especialidad
DROP POLICY IF EXISTS "Doctors can manage consultations within their specialty" ON consultations;
CREATE POLICY "Doctors can manage consultations within their specialty"
  ON consultations
  FOR ALL
  TO authenticated
  USING (
    -- Verificar licencia médica válida
    validate_medical_license(auth.uid()) AND
    -- Doctor puede ver sus propias consultas
    doctor_id = auth.uid()
  )
  WITH CHECK (
    -- Verificar licencia médica válida para creación/actualización
    validate_medical_license(auth.uid()) AND
    -- Verificar que el doctor_id coincide
    doctor_id = auth.uid()
  );

-- Política para plantillas de exploración física
DROP POLICY IF EXISTS "Doctors can manage their own templates with limits" ON physical_exam_templates;
CREATE POLICY "Doctors can manage their own templates with limits"
  ON physical_exam_templates
  FOR ALL
  TO authenticated
  USING (
    -- Verificar licencia médica válida
    validate_medical_license(auth.uid()) AND
    -- Doctor puede ver sus propias plantillas
    doctor_id = auth.uid()
  )
  WITH CHECK (
    -- Verificar licencia médica válida
    validate_medical_license(auth.uid()) AND
    -- Verificar que el doctor_id coincide
    doctor_id = auth.uid() AND
    -- Verificar estructura de plantilla válida
    validate_jsonb_schema(definition, 'physical_exam_template')
  );

-- ===== FUNCIÓN PARA OBTENER PERMISOS DE USUARIO =====
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  specialty_record medical_specialties%ROWTYPE;
  permissions JSONB := '{}';
BEGIN
  -- Obtener perfil del usuario
  SELECT * INTO profile_record FROM profiles WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "User not found"}';
  END IF;
  
  -- Permisos básicos por rol
  permissions := jsonb_build_object(
    'role', profile_record.role,
    'can_access_dashboard', profile_record.role IN ('doctor', 'administrator', 'nurse'),
    'can_manage_patients', profile_record.role IN ('doctor', 'administrator', 'nurse'),
    'can_create_consultations', profile_record.role IN ('doctor', 'administrator'),
    'can_create_prescriptions', profile_record.role IN ('doctor', 'administrator'),
    'is_license_valid', validate_medical_license(user_id)
  );
  
  -- Permisos específicos para doctores
  IF profile_record.role = 'doctor' THEN
    -- Obtener información de especialidad
    IF profile_record.specialty_code IS NOT NULL THEN
      SELECT * INTO specialty_record 
      FROM medical_specialties 
      WHERE code = profile_record.specialty_code;
      
      permissions := permissions || jsonb_build_object(
        'specialty', jsonb_build_object(
          'code', specialty_record.code,
          'name', specialty_record.name,
          'can_prescribe_controlled', specialty_record.can_prescribe_controlled
        )
      );
    END IF;
    
    permissions := permissions || jsonb_build_object(
      'can_prescribe_controlled', profile_record.can_prescribe_controlled,
      'license_expires', profile_record.license_expiry_date,
      'certifications', profile_record.certifications
    );
  END IF;
  
  -- Permisos administrativos
  IF profile_record.role = 'administrator' THEN
    permissions := permissions || jsonb_build_object(
      'can_manage_users', TRUE,
      'can_view_audit_logs', TRUE,
      'can_manage_templates', TRUE,
      'can_override_validations', TRUE
    );
  END IF;
  
  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== VISTAS PARA FACILITAR CONSULTAS =====

-- Vista de doctores con información de especialidad
CREATE OR REPLACE VIEW public.doctors_with_specialty AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.medical_license,
  p.license_expiry_date,
  p.specialty_code,
  p.is_license_active,
  p.can_prescribe_controlled,
  ms.name as specialty_name,
  ms.description as specialty_description,
  ms.can_prescribe_controlled as specialty_allows_controlled,
  validate_medical_license(p.id) as is_license_valid
FROM profiles p
LEFT JOIN medical_specialties ms ON p.specialty_code = ms.code
WHERE p.role = 'doctor';

-- Vista de prescripciones con información de auditoría
CREATE OR REPLACE VIEW public.prescriptions_with_audit AS
SELECT 
  p.*,
  dwm.specialty_name,
  dwm.specialty_allows_controlled,
  dwm.is_license_valid,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.medications) as med
      JOIN controlled_medications cm ON LOWER(cm.name) = LOWER(med->>'name')
    ) THEN TRUE 
    ELSE FALSE 
  END as contains_controlled_medications
FROM prescriptions p
JOIN doctors_with_specialty dwm ON p.doctor_id = dwm.id;

-- ===== ÍNDICES PARA MEJORAR RENDIMIENTO =====
CREATE INDEX IF NOT EXISTS idx_profiles_specialty_code ON profiles(specialty_code);
CREATE INDEX IF NOT EXISTS idx_profiles_license_active ON profiles(is_license_active) WHERE role = 'doctor';
CREATE INDEX IF NOT EXISTS idx_controlled_medications_name ON controlled_medications USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_prescription_audit_doctor_id ON prescription_audit(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_audit_created_at ON prescription_audit(created_at);

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON TABLE medical_specialties IS 'Catálogo de especialidades médicas reconocidas';
COMMENT ON TABLE controlled_medications IS 'Lista de medicamentos controlados con restricciones específicas';
COMMENT ON TABLE prescription_audit IS 'Auditoría de prescripciones para trazabilidad y compliance';

COMMENT ON FUNCTION validate_medical_license(UUID) IS 'Valida que un doctor tenga licencia médica activa y vigente';
COMMENT ON FUNCTION can_prescribe_controlled_medication(UUID, TEXT) IS 'Verifica si un doctor puede prescribir un medicamento controlado específico';
COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Obtiene permisos completos de un usuario basado en rol y especialidad';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Sistema de permisos y especialidades médicas implementado con validación de licencias y auditoría';
END $$; 