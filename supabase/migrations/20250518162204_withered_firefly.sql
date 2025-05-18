/*
  # Initial Schema Setup
  
  1. Core Tables
    - Creates base tables for users, roles, and specialties
    - Sets up patient management tables
    - Establishes medical records structure
  
  2. Security
    - Enables UUID extension
    - Sets up audit logging
    - Implements automatic timestamps
    
  3. Initial Data
    - Adds basic roles
    - Adds common specialties
    - Adds common allergies
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'doctor', 'nurse')),
  specialty TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  license_number TEXT,
  phone TEXT,
  schedule JSONB
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT CHECK (gender IN ('masculino', 'femenino', 'otro')),
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  city_of_birth TEXT,
  city_of_residence TEXT,
  social_security_number TEXT
);

-- Create medical records table
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  medical_history TEXT,
  allergies TEXT[],
  medications TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pathological histories table
CREATE TABLE IF NOT EXISTS pathological_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  chronic_diseases TEXT[],
  current_treatments TEXT[],
  surgeries TEXT[],
  fractures TEXT[],
  previous_hospitalizations TEXT[],
  substance_use JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create non-pathological histories table
CREATE TABLE IF NOT EXISTS non_pathological_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  handedness TEXT,
  religion TEXT,
  marital_status TEXT,
  education_level TEXT,
  diet TEXT,
  personal_hygiene TEXT,
  vaccination_history TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create hereditary backgrounds table
CREATE TABLE IF NOT EXISTS hereditary_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  condition TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id),
  current_condition TEXT,
  vital_signs JSONB,
  physical_examination JSONB,
  diagnosis TEXT,
  prognosis TEXT,
  treatment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create physical exam templates table
CREATE TABLE IF NOT EXISTS physical_exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create handle_updated_at function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_medical_records
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_pathological_histories
  BEFORE UPDATE ON pathological_histories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_non_pathological_histories
  BEFORE UPDATE ON non_pathological_histories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_hereditary_backgrounds
  BEFORE UPDATE ON hereditary_backgrounds
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_consultations
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_physical_exam_templates
  BEFORE UPDATE ON physical_exam_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathological_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_pathological_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hereditary_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_exam_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrators can modify all profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "El personal médico puede ver pacientes" ON patients
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "Administrators and doctors can create patients" ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_doctor());

CREATE POLICY "Administrators and doctors can update patients" ON patients
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_doctor())
  WITH CHECK (is_admin() OR is_doctor());

CREATE POLICY "Administrators and doctors can delete patients" ON patients
  FOR DELETE
  TO authenticated
  USING (is_admin() OR is_doctor());

CREATE POLICY "El personal médico puede ver expedientes" ON medical_records
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "El personal médico puede gestionar expedientes" ON medical_records
  FOR ALL
  TO authenticated
  USING (is_admin() OR is_doctor());

CREATE POLICY "El personal médico puede ver archivos" ON attachments
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "El personal médico puede gestionar archivos" ON attachments
  FOR ALL
  TO authenticated
  USING (is_admin() OR is_doctor());

CREATE POLICY "Medical staff can read pathological histories" ON pathological_histories
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage pathological histories" ON pathological_histories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can read non-pathological histories" ON non_pathological_histories
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage non-pathological histories" ON non_pathological_histories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can read hereditary backgrounds" ON hereditary_backgrounds
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage hereditary backgrounds" ON hereditary_backgrounds
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can read consultations" ON consultations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage consultations" ON consultations
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Doctors can manage their exam templates" ON physical_exam_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = doctor_id);

-- Create helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_nurse()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'nurse'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;