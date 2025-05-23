/*
  # Add prescription templates functionality

  1. New Tables
    - `prescription_templates`
      - `id` (uuid, primary key)
      - `doctor_id` (uuid, references profiles)
      - `name` (text)
      - `category` (text)
      - `medications` (jsonb)
      - `diagnosis` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz)

  2. Security
    - Enable RLS on `prescription_templates` table
    - Add policies for doctors to manage their templates
    - Add policies for medical staff to view templates
*/

-- Create prescription templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  medications JSONB NOT NULL,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_category ON prescription_templates(category);

-- Enable RLS
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Policies for prescription templates
CREATE POLICY "Doctors can manage their templates"
  ON prescription_templates
  FOR ALL
  TO authenticated
  USING (
    (is_doctor() AND doctor_id = auth.uid()) OR
    is_admin()
  )
  WITH CHECK (
    (is_doctor() AND doctor_id = auth.uid()) OR
    is_admin()
  );

CREATE POLICY "Medical staff can view templates"
  ON prescription_templates
  FOR SELECT
  TO authenticated
  USING (
    is_doctor() OR is_admin()
  );

CREATE POLICY "No mostrar plantillas eliminadas"
  ON prescription_templates
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Add triggers for timestamps and soft delete
CREATE TRIGGER set_timestamp_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER soft_delete_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

-- Add audit logging trigger
CREATE TRIGGER audit_prescription_templates
  AFTER INSERT OR UPDATE OR DELETE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

-- Insert some default templates
INSERT INTO prescription_templates (doctor_id, name, category, medications, diagnosis, notes)
SELECT 
  profiles.id,
  'Tratamiento Hipertensión',
  'Cardiovascular',
  '[{
    "name": "Enalapril",
    "dosage": "10mg",
    "frequency": "Una vez al día",
    "duration": "30 días",
    "instructions": "En ayunas"
  }]'::jsonb,
  'Hipertensión arterial',
  'Controlar presión arterial semanalmente'
FROM profiles 
WHERE role = 'doctor'
LIMIT 1;

INSERT INTO prescription_templates (doctor_id, name, category, medications, diagnosis, notes)
SELECT 
  profiles.id,
  'Antibiótico Infección',
  'Infectología',
  '[{
    "name": "Amoxicilina",
    "dosage": "500mg",
    "frequency": "Cada 8 horas",
    "duration": "7 días",
    "instructions": "Con alimentos"
  }]'::jsonb,
  'Infección bacteriana',
  'Completar todo el tratamiento'
FROM profiles 
WHERE role = 'doctor'
LIMIT 1;