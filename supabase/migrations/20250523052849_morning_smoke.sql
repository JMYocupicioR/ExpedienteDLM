/*
  # Add Prescriptions Schema
  
  1. New Tables
    - `prescriptions`: Stores medical prescriptions
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `doctor_id` (uuid, references profiles)
      - `diagnosis` (text)
      - `medications` (jsonb)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `status` (text)
      - `deleted_at` (timestamptz)
    
    - `prescription_templates`: Stores predefined prescription templates
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
    - Enable RLS on both tables
    - Add policies for doctors and administrators
    - Add audit logging
*/

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  diagnosis TEXT NOT NULL,
  medications JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'dispensed')),
  deleted_at TIMESTAMPTZ
);

-- Create prescription templates table
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor ON prescription_templates(doctor_id);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Policies for prescriptions
CREATE POLICY "Doctors can manage their prescriptions"
  ON prescriptions
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

CREATE POLICY "Medical staff can view prescriptions"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (
    has_patient_access(patient_id)
  );

CREATE POLICY "No mostrar recetas eliminadas"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

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
CREATE TRIGGER set_timestamp_prescriptions
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER soft_delete_prescriptions
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

-- Add audit logging triggers
CREATE TRIGGER audit_prescriptions
  AFTER INSERT OR UPDATE OR DELETE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_prescription_templates
  AFTER INSERT OR UPDATE OR DELETE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();