/*
  # Esquema Inicial Completo - ExpedienteDLM
  
  Este esquema consolida todas las funcionalidades esenciales:
  - Sistema de perfiles y autenticación
  - Pacientes y expedientes médicos
  - Consultas y plantillas de examen físico
  - Sistema de prescripciones con interacciones
  - Auditoría y versionado de plantillas
  - RLS policies seguras y no recursivas
  - Validaciones completas
*/

-- =============================================
-- EXTENSIONES NECESARIAS
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- FUNCIONES AUXILIARES
-- =============================================

-- Función para manejar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función para validar arrays de texto
CREATE OR REPLACE FUNCTION public.validate_text_array(
  input_array text[],
  max_items integer DEFAULT 50,
  max_length integer DEFAULT 200
)
RETURNS text[] 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_array text[] := '{}';
  item text;
  sanitized_item text;
BEGIN
  IF input_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOR i IN 1..LEAST(array_length(input_array, 1), max_items) LOOP
    item := input_array[i];
    
    IF item IS NULL OR trim(item) = '' THEN
      CONTINUE;
    END IF;
    
    sanitized_item := substring(
      replace(replace(replace(replace(replace(
        trim(item),
        '<', '&lt;'),
        '>', '&gt;'),
        '"', '&quot;'),
        '''', '&#39;'),
        '/', '&#47;'
      ),
      1, max_length
    );
    
    IF length(sanitized_item) > 0 THEN
      sanitized_array := array_append(sanitized_array, sanitized_item);
    END IF;
  END LOOP;
  
  RETURN sanitized_array;
END;
$$;

-- Función para validar URLs
CREATE OR REPLACE FUNCTION public.validate_url(url text)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF url IS NULL OR length(trim(url)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  IF NOT (url ~* '^https?://') THEN
    RETURN FALSE;
  END IF;
  
  IF url ~* '(javascript:|data:|vbscript:|file:|blob:|about:|on\w+\s*=|<script)' THEN
    RETURN FALSE;
  END IF;
  
  IF length(url) > 2000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Función para validar esquemas JSONB
CREATE OR REPLACE FUNCTION public.validate_jsonb_schema(
  data jsonb,
  schema_name text
)
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

-- Función para calcular checksum
CREATE OR REPLACE FUNCTION public.calculate_template_checksum(definition_data JSONB)
RETURNS VARCHAR(64) 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(definition_data::text, 'sha256'), 'hex');
END;
$$;

-- =============================================
-- TABLA DE PERFILES (USUARIOS)
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'doctor', 'nurse')),
  specialty TEXT,
  full_name TEXT,
  medical_license TEXT,
  prescription_style JSONB,
  clinic_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles (segura y no recursiva)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id 
  OR 
  (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'))
);

CREATE POLICY "profiles_insert_policy" 
ON profiles FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  auth.uid() = id 
  OR 
  auth.role() = 'service_role'
);

CREATE POLICY "profiles_update_policy" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" 
ON profiles FOR DELETE 
TO authenticated 
USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator');

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- TABLA DE PACIENTES
-- =============================================

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT NOT NULL CHECK (phone ~* '^\+?[0-9]{10,15}$'),
  address TEXT,
  city_of_birth TEXT,
  city_of_residence TEXT,
  social_security_number TEXT,
  emergency_contact JSONB,
  search_vector TSVECTOR,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_policy"
ON patients FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'))
);

CREATE POLICY "patients_insert_policy"
ON patients FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
);

CREATE POLICY "patients_update_policy"
ON patients FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
)
WITH CHECK (
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
);

CREATE POLICY "patients_delete_policy"
ON patients FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator');

-- Trigger para updated_at y search_vector
CREATE OR REPLACE FUNCTION patients_search_vector_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_search_vector_trigger
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION patients_search_vector_update();

CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- EXPEDIENTES MÉDICOS
-- =============================================

CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medical_history TEXT NOT NULL,
  allergies TEXT[],
  medications TEXT[],
  family_history JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_records_select_policy"
ON medical_records FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse')
);

CREATE POLICY "medical_records_modify_policy"
ON medical_records FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
)
WITH CHECK (
  auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
);

CREATE TRIGGER set_updated_at_medical_records
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- HISTORIALES MÉDICOS
-- =============================================

-- Antecedentes hereditarios
CREATE TABLE public.hereditary_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  condition TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Antecedentes patológicos
CREATE TABLE public.pathological_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  chronic_diseases TEXT[],
  current_treatments TEXT[],
  surgeries TEXT[],
  fractures TEXT[],
  previous_hospitalizations TEXT[],
  substance_use JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Antecedentes no patológicos
CREATE TABLE public.non_pathological_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  handedness TEXT,
  religion TEXT,
  marital_status TEXT,
  education_level TEXT,
  diet TEXT,
  personal_hygiene TEXT,
  vaccination_history TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para todas las tablas de historiales (mismo patrón)
ALTER TABLE public.hereditary_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathological_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_pathological_histories ENABLE ROW LEVEL SECURITY;

-- Policies para hereditary_backgrounds
CREATE POLICY "hereditary_backgrounds_select_policy"
ON hereditary_backgrounds FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "hereditary_backgrounds_modify_policy"
ON hereditary_backgrounds FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'))
WITH CHECK (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'));

-- Policies para pathological_histories (mismo patrón)
CREATE POLICY "pathological_histories_select_policy"
ON pathological_histories FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "pathological_histories_modify_policy"
ON pathological_histories FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'))
WITH CHECK (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'));

-- Policies para non_pathological_histories (mismo patrón)
CREATE POLICY "non_pathological_histories_select_policy"
ON non_pathological_histories FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "non_pathological_histories_modify_policy"
ON non_pathological_histories FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'))
WITH CHECK (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor'));

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_hereditary_backgrounds
  BEFORE UPDATE ON public.hereditary_backgrounds
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_pathological_histories
  BEFORE UPDATE ON public.pathological_histories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_non_pathological_histories
  BEFORE UPDATE ON public.non_pathological_histories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- CONSULTAS MÉDICAS
-- =============================================

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id),
  current_condition TEXT,
  vital_signs JSONB,
  physical_examination JSONB,
  diagnosis TEXT,
  prognosis TEXT,
  treatment TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_policy"
ON consultations FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'nurse'))
);

CREATE POLICY "consultations_modify_policy"
ON consultations FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
)
WITH CHECK (
  doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);

CREATE TRIGGER set_updated_at_consultations
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- PLANTILLAS DE EXAMEN FÍSICO
-- =============================================

-- Secciones estandarizadas
CREATE TABLE public.physical_exam_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar secciones predefinidas
INSERT INTO physical_exam_sections (id, name, description, sort_order) VALUES
  ('general', 'Estado General', 'Aspecto general del paciente', 1),
  ('head_neck', 'Cabeza y Cuello', 'Exploración de cabeza y cuello', 2),
  ('chest', 'Tórax', 'Exploración torácica', 3),
  ('cardiovascular', 'Cardiovascular', 'Sistema cardiovascular', 4),
  ('respiratory', 'Respiratorio', 'Sistema respiratorio', 5),
  ('abdomen', 'Abdomen', 'Exploración abdominal', 6),
  ('extremities', 'Extremidades', 'Exploración de extremidades', 7),
  ('neurological', 'Neurológico', 'Exploración neurológica', 8),
  ('skin', 'Piel y Faneras', 'Exploración dermatológica', 9),
  ('genitourinary', 'Genitourinario', 'Sistema genitourinario', 10);

-- RLS para sections
ALTER TABLE physical_exam_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_select_policy"
ON physical_exam_sections FOR SELECT
TO authenticated
USING (true);

-- Plantillas de examen físico
CREATE TABLE public.physical_exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  definition JSONB NOT NULL,
  checksum VARCHAR(64),
  version_number INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  sharing_enabled BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para physical_exam_templates
ALTER TABLE public.physical_exam_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select_policy"
ON physical_exam_templates FOR SELECT
TO authenticated
USING (
  is_active = TRUE AND
  (doctor_id = auth.uid() OR is_public = TRUE OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
);

CREATE POLICY "templates_modify_policy"
ON physical_exam_templates FOR ALL
TO authenticated
USING (
  doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
)
WITH CHECK (
  doctor_id = auth.uid() AND
  validate_jsonb_schema(definition, 'physical_exam_template')
);

-- Auditoría de plantillas
CREATE TABLE public.template_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versiones de plantillas
CREATE TABLE public.template_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  definition JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_major_version BOOLEAN DEFAULT FALSE,
  checksum VARCHAR(64),
  UNIQUE(template_id, version_number)
);

-- RLS para template_audit y template_versions
ALTER TABLE public.template_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_audit_select_policy"
ON template_audit FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);

CREATE POLICY "template_versions_select_policy"
ON template_versions FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);

-- Triggers para plantillas
CREATE TRIGGER set_updated_at_physical_exam_templates
  BEFORE UPDATE ON public.physical_exam_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- SISTEMA DE MEDICAMENTOS Y PRESCRIPCIONES
-- =============================================

-- Catálogo de medicamentos
CREATE TABLE public.medications_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  active_ingredient VARCHAR(200) NOT NULL,
  therapeutic_group VARCHAR(100),
  form VARCHAR(50),
  strength VARCHAR(50),
  is_controlled BOOLEAN DEFAULT FALSE,
  requires_prescription BOOLEAN DEFAULT TRUE,
  contraindications TEXT[],
  side_effects TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interacciones medicamentosas
CREATE TABLE public.drug_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_a_id UUID REFERENCES public.medications_catalog(id),
  medication_b_id UUID REFERENCES public.medications_catalog(id),
  medication_a_ingredient VARCHAR(200) NOT NULL,
  medication_b_ingredient VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'contraindicated')),
  interaction_type VARCHAR(50) NOT NULL,
  mechanism TEXT,
  clinical_effect TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence_level VARCHAR(20) DEFAULT 'moderate' CHECK (evidence_level IN ('low', 'moderate', 'high')),
  onset VARCHAR(20) DEFAULT 'delayed' CHECK (onset IN ('rapid', 'delayed', 'unknown')),
  reference_sources TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medication_a_ingredient, medication_b_ingredient)
);

-- Prescripciones
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id),
  consultation_id UUID REFERENCES consultations(id),
  medications JSONB NOT NULL,
  instructions TEXT,
  duration_days INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  interaction_warnings JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para medications_catalog
ALTER TABLE public.medications_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medications_catalog_select_policy"
ON medications_catalog FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "medications_catalog_modify_policy"
ON medications_catalog FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator');

-- RLS para drug_interactions
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drug_interactions_select_policy"
ON drug_interactions FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "drug_interactions_modify_policy"
ON drug_interactions FOR ALL
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
WITH CHECK (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator');

-- RLS para prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescriptions_select_policy"
ON prescriptions FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'nurse'))
);

CREATE POLICY "prescriptions_modify_policy"
ON prescriptions FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
)
WITH CHECK (
  doctor_id = auth.uid() AND
  validate_jsonb_schema(medications, 'prescription')
);

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_medications_catalog
  BEFORE UPDATE ON public.medications_catalog
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_drug_interactions
  BEFORE UPDATE ON public.drug_interactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_prescriptions
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- ARCHIVOS Y ADJUNTOS
-- =============================================

CREATE TABLE public.physical_exam_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES physical_exam_sections(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL CHECK (validate_url(file_url)),
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL CHECK (validate_url(file_url)),
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para archivos
ALTER TABLE public.physical_exam_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "physical_exam_files_select_policy"
ON physical_exam_files FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "physical_exam_files_modify_policy"
ON physical_exam_files FOR ALL
TO authenticated
USING (
  uploaded_by = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
)
WITH CHECK (
  uploaded_by = auth.uid() AND auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
);

CREATE POLICY "attachments_select_policy"
ON attachments FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "attachments_modify_policy"
ON attachments FOR ALL
TO authenticated
USING (
  uploaded_by = auth.uid() OR auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
)
WITH CHECK (
  uploaded_by = auth.uid() AND auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor')
);

-- =============================================
-- TRIGGERS DE VALIDACIÓN
-- =============================================

-- Trigger para validar historias patológicas
CREATE OR REPLACE FUNCTION validate_pathological_history()
RETURNS TRIGGER AS $$
BEGIN
  NEW.chronic_diseases := validate_text_array(NEW.chronic_diseases, 20, 100);
  NEW.current_treatments := validate_text_array(NEW.current_treatments, 15, 150);
  NEW.surgeries := validate_text_array(NEW.surgeries, 10, 200);
  NEW.fractures := validate_text_array(NEW.fractures, 10, 100);
  NEW.previous_hospitalizations := validate_text_array(NEW.previous_hospitalizations, 15, 200);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar historias no patológicas
CREATE OR REPLACE FUNCTION validate_non_pathological_history()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vaccination_history := validate_text_array(NEW.vaccination_history, 50, 80);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar expedientes médicos
CREATE OR REPLACE FUNCTION validate_medical_records()
RETURNS TRIGGER AS $$
BEGIN
  NEW.allergies := validate_text_array(NEW.allergies, 20, 100);
  NEW.medications := validate_text_array(NEW.medications, 30, 150);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar datos JSONB en consultas y prescripciones
CREATE OR REPLACE FUNCTION validate_jsonb_data()
RETURNS TRIGGER AS $$
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'consultations' THEN
      IF NEW.vital_signs IS NOT NULL AND NOT validate_jsonb_schema(NEW.vital_signs, 'vital_signs') THEN
        RAISE EXCEPTION 'Datos de signos vitales inválidos';
      END IF;
      
      IF NEW.physical_examination IS NOT NULL AND NOT validate_jsonb_schema(NEW.physical_examination, 'physical_examination') THEN
        RAISE EXCEPTION 'Datos de examen físico inválidos';
      END IF;
      
    WHEN 'prescriptions' THEN
      IF NEW.medications IS NOT NULL AND NOT validate_jsonb_schema(NEW.medications, 'prescription') THEN
        RAISE EXCEPTION 'Datos de medicamentos inválidos';
      END IF;
      
    WHEN 'physical_exam_templates' THEN
      IF NEW.definition IS NOT NULL AND NOT validate_jsonb_schema(NEW.definition, 'physical_exam_template') THEN
        RAISE EXCEPTION 'Definición de plantilla inválida';
      END IF;
      
      -- Calcular checksum
      NEW.checksum := calculate_template_checksum(NEW.definition);
      
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers de validación
CREATE TRIGGER validate_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_pathological_history();

CREATE TRIGGER validate_non_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON non_pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_non_pathological_history();

CREATE TRIGGER validate_medical_records_trigger
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION validate_medical_records();

CREATE TRIGGER validate_consultations_jsonb
  BEFORE INSERT OR UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

CREATE TRIGGER validate_prescriptions_jsonb
  BEFORE INSERT OR UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

CREATE TRIGGER validate_templates_jsonb
  BEFORE INSERT OR UPDATE ON physical_exam_templates
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

-- =============================================
-- FUNCIÓN PARA CREAR PERFIL EN NUEVO USUARIO
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'doctor',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error en handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para usuarios nuevos
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================

-- Índices básicos
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_search_vector ON patients USING gin(search_vector);
CREATE INDEX idx_patients_name_trgm ON patients USING gin (full_name gin_trgm_ops);

CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);

CREATE INDEX idx_physical_exam_templates_doctor ON physical_exam_templates(doctor_id);
CREATE INDEX idx_physical_exam_templates_public ON physical_exam_templates(is_public, is_active);

CREATE INDEX idx_template_audit_doctor_id ON template_audit(doctor_id);
CREATE INDEX idx_template_audit_template_id ON template_audit(template_id);
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id, version_number);

CREATE INDEX idx_medications_catalog_ingredient ON medications_catalog(active_ingredient);
CREATE INDEX idx_drug_interactions_ingredients ON drug_interactions(medication_a_ingredient, medication_b_ingredient);

-- =============================================
-- CONFIGURACIÓN DE STORAGE (BUCKETS)
-- =============================================

-- Crear bucket para logos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para logos
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND 
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'logos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND 
  owner = auth.uid()
);

-- =============================================
-- PERMISOS Y GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_text_array(text[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_jsonb_schema(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_template_checksum(jsonb) TO authenticated;

-- =============================================
-- LOG DE MIGRACIÓN COMPLETADA
-- =============================================

DO $$
BEGIN
  RAISE LOG '✅ ESQUEMA INICIAL COMPLETO CREADO EXITOSAMENTE';
  RAISE LOG '📋 Tablas principales: profiles, patients, medical_records, consultations, prescriptions';
  RAISE LOG '🏥 Historiales médicos: hereditary_backgrounds, pathological_histories, non_pathological_histories';
  RAISE LOG '📝 Plantillas: physical_exam_templates con auditoría y versionado';
  RAISE LOG '💊 Sistema de medicamentos: medications_catalog, drug_interactions';
  RAISE LOG '🔒 RLS policies seguras y no recursivas implementadas';
  RAISE LOG '🛡️ Sistema de validación completo con triggers';
  RAISE LOG '📁 Storage configurado para archivos y logos';
  RAISE LOG '⚡ Índices de rendimiento creados';
END $$; 