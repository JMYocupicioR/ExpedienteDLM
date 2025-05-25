/*
  # Improve database schema and security

  1. Security Functions
    - Add function to check patient access
    - Add helper functions for role checks
  
  2. Schema Improvements
    - Add email and phone validation
    - Add soft delete functionality
    - Add better indexing
  
  3. Security Policies
    - Update RLS policies for patients
    - Update RLS policies for medical records
    - Add soft delete policies
*/

-- Helper functions for role checks
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

-- Function to check if a user has access to a specific patient
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
          AND consultations.nurse_id = auth.uid()
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify patients table
ALTER TABLE patients
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT patients_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT patients_phone_check CHECK (phone ~* '^\+?[0-9]{10,15}$');

-- Modify medical records table
ALTER TABLE medical_records
  ALTER COLUMN patient_id SET NOT NULL,
  ALTER COLUMN medical_history SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);

-- Update RLS policies for patients
DROP POLICY IF EXISTS "El personal médico puede ver pacientes" ON patients;
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

CREATE POLICY "Administradores pueden ver todos los pacientes"
  ON patients FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Médicos pueden ver sus pacientes"
  ON patients FOR SELECT
  TO authenticated
  USING (
    is_doctor() AND
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = patients.id
      AND consultations.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Enfermeras pueden ver pacientes asignados"
  ON patients FOR SELECT
  TO authenticated
  USING (
    is_nurse() AND
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = patients.id
      AND consultations.nurse_id = auth.uid()
    )
  );

CREATE POLICY "Solo administradores pueden crear pacientes"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Solo administradores pueden actualizar pacientes"
  ON patients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Solo administradores pueden eliminar pacientes"
  ON patients FOR DELETE
  TO authenticated
  USING (is_admin());

-- Update RLS policies for medical records
DROP POLICY IF EXISTS "El personal médico puede ver expedientes" ON medical_records;
DROP POLICY IF EXISTS "El personal médico puede gestionar expedientes" ON medical_records;

CREATE POLICY "Personal médico puede ver expedientes de sus pacientes"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    has_patient_access(patient_id)
  );

CREATE POLICY "Solo médicos pueden crear expedientes"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    is_doctor() AND
    has_patient_access(patient_id)
  );

CREATE POLICY "Solo médicos pueden actualizar expedientes"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (
    is_doctor() AND
    has_patient_access(patient_id)
  )
  WITH CHECK (
    is_doctor() AND
    has_patient_access(patient_id)
  );

CREATE POLICY "Solo administradores pueden eliminar expedientes"
  ON medical_records FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add soft delete columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create soft delete function
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create soft delete triggers
CREATE TRIGGER soft_delete_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_medical_records
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

CREATE TRIGGER soft_delete_consultations
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

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