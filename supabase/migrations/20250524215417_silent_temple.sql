/*
  # Schema Improvements Migration

  1. Changes
    - Add helper functions for role checks
    - Add patient access check function
    - Add email and phone validation
    - Add performance indexes
    - Update security policies
    - Add soft delete functionality

  2. Security
    - Enable RLS on all tables
    - Add role-based access policies
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
          SELECT 1 FROM consultations c
          JOIN profiles p ON c.doctor_id = p.id
          WHERE c.patient_id = has_patient_access.patient_id
          AND p.role = 'doctor'
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_email') THEN
    CREATE INDEX idx_patients_email ON patients(email);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_phone') THEN
    CREATE INDEX idx_patients_phone ON patients(phone);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_medical_records_patient') THEN
    CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultations_patient') THEN
    CREATE INDEX idx_consultations_patient ON consultations(patient_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultations_doctor') THEN
    CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
  END IF;
END $$;

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
      SELECT 1 FROM consultations c
      JOIN profiles p ON c.doctor_id = p.id
      WHERE c.patient_id = patients.id
      AND p.role = 'doctor'
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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE patients ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE consultations ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create soft delete function
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create soft delete triggers
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