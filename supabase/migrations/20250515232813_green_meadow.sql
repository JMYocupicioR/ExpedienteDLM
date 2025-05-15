/*
  # Add new fields to medical records

  1. Changes
    - Add new columns to patients table for personal identification
    - Create new tables for medical history tracking
    - Add relationships and constraints

  2. Security
    - Enable RLS on new tables
    - Add policies for medical staff access
*/

-- Add new columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city_of_birth text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city_of_residence text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS social_security_number text;

-- Create hereditary background table
CREATE TABLE IF NOT EXISTS hereditary_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  condition text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pathological history table
CREATE TABLE IF NOT EXISTS pathological_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  chronic_diseases text[],
  current_treatments text[],
  surgeries text[],
  fractures text[],
  previous_hospitalizations text[],
  substance_use jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create non-pathological history table
CREATE TABLE IF NOT EXISTS non_pathological_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  handedness text,
  religion text,
  marital_status text,
  education_level text,
  diet text,
  personal_hygiene text,
  vaccination_history text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id),
  current_condition text,
  vital_signs jsonb,
  physical_examination jsonb,
  diagnosis text,
  prognosis text,
  treatment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create physical examination templates table
CREATE TABLE IF NOT EXISTS physical_exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  fields jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE hereditary_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathological_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_pathological_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_exam_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Medical staff can read hereditary backgrounds"
  ON hereditary_backgrounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
    )
  );

CREATE POLICY "Medical staff can manage hereditary backgrounds"
  ON hereditary_backgrounds
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
    )
  );

-- Repeat similar policies for other tables
CREATE POLICY "Medical staff can read pathological histories"
  ON pathological_histories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage pathological histories"
  ON pathological_histories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can read non-pathological histories"
  ON non_pathological_histories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage non-pathological histories"
  ON non_pathological_histories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can read consultations"
  ON consultations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Medical staff can manage consultations"
  ON consultations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
  ));

CREATE POLICY "Doctors can manage their exam templates"
  ON physical_exam_templates FOR ALL TO authenticated
  USING (auth.uid() = doctor_id);

-- Add updated_at triggers
CREATE TRIGGER set_timestamp_hereditary_backgrounds
  BEFORE UPDATE ON hereditary_backgrounds
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

CREATE TRIGGER set_timestamp_consultations
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_physical_exam_templates
  BEFORE UPDATE ON physical_exam_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();