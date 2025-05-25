/*
  # Improve schema with prescription templates

  1. New Tables
    - `prescription_templates`
      - Template storage for common prescriptions
      - Includes medications, dosage, and instructions
      - Links to specific doctors

  2. Security
    - RLS policies for prescription templates
    - Access control based on doctor ownership
    - Soft delete functionality

  3. Functions & Triggers
    - Audit logging for all changes
    - Automatic timestamp management
    - Soft delete triggers
*/

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
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_category ON prescription_templates(category);

-- Enable RLS
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Doctors can manage their templates"
  ON prescription_templates
  TO authenticated
  USING ((is_doctor() AND doctor_id = auth.uid()) OR is_admin())
  WITH CHECK ((is_doctor() AND doctor_id = auth.uid()) OR is_admin());

CREATE POLICY "Medical staff can view templates"
  ON prescription_templates
  FOR SELECT
  TO authenticated
  USING (is_doctor() OR is_admin());

CREATE POLICY "No mostrar plantillas eliminadas"
  ON prescription_templates
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Add audit trigger
CREATE TRIGGER audit_prescription_templates
  AFTER INSERT OR UPDATE OR DELETE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Add updated_at trigger
CREATE TRIGGER set_timestamp_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Add soft delete trigger
CREATE TRIGGER soft_delete_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

-- Add helper functions
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_nurse()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'nurse'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check patient access
CREATE OR REPLACE FUNCTION has_patient_access(patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      role = 'administrator'
      OR (
        role = 'doctor'
        AND EXISTS (
          SELECT 1 FROM consultations
          WHERE consultations.patient_id = has_patient_access.patient_id
          AND consultations.doctor_id = auth.uid()
        )
      )
      OR (
        role = 'nurse'
        AND EXISTS (
          SELECT 1 FROM consultations
          WHERE consultations.patient_id = has_patient_access.patient_id
          AND consultations.doctor_id IN (
            SELECT id FROM profiles WHERE role = 'doctor'
          )
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);

-- Add email and phone validation
ALTER TABLE patients 
  ADD CONSTRAINT patients_email_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE patients 
  ADD CONSTRAINT patients_phone_check 
  CHECK (phone ~* '^\+?[0-9]{10,15}$');

-- Add soft delete columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create soft delete function if not exists
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add soft delete triggers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'soft_delete_patients'
  ) THEN
    CREATE TRIGGER soft_delete_patients
      BEFORE UPDATE ON patients
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'soft_delete_medical_records'
  ) THEN
    CREATE TRIGGER soft_delete_medical_records
      BEFORE UPDATE ON medical_records
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'soft_delete_consultations'
  ) THEN
    CREATE TRIGGER soft_delete_consultations
      BEFORE UPDATE ON consultations
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;
END $$;

-- Add soft delete policies
CREATE POLICY "No mostrar registros eliminados de pacientes"
  ON patients FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "No mostrar registros eliminados de expedientes"
  ON medical_records FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "No mostrar registros eliminados de consultas"
  ON consultations FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);