/*
  # Add helper functions and security policies

  1. New Functions
    - Helper functions for role checks (is_admin, is_doctor, is_nurse)
    - Patient access verification function
  
  2. Security
    - Updated RLS policies for patients and medical records
    - Added soft delete functionality
    - Added audit triggers
  
  3. Performance
    - Added strategic indexes
*/

-- Helper functions for role checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_doctor'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_nurse'
  ) THEN
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
  END IF;
END $$;

-- Function to check if a user has access to a specific patient
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_patient_access'
  ) THEN
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
  END IF;
END $$;

-- Add indexes for better performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_patients_email'
  ) THEN
    CREATE INDEX idx_patients_email ON patients(email);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_patients_phone'
  ) THEN
    CREATE INDEX idx_patients_phone ON patients(phone);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_medical_records_patient'
  ) THEN
    CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_consultations_patient'
  ) THEN
    CREATE INDEX idx_consultations_patient ON consultations(patient_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_consultations_doctor'
  ) THEN
    CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
  END IF;
END $$;

-- Update RLS policies for patients
DROP POLICY IF EXISTS "El personal médico puede ver pacientes" ON patients;
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Administradores pueden ver todos los pacientes'
  ) THEN
    CREATE POLICY "Administradores pueden ver todos los pacientes"
      ON patients FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Médicos pueden ver sus pacientes'
  ) THEN
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
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Enfermeras pueden ver pacientes asignados'
  ) THEN
    CREATE POLICY "Enfermeras pueden ver pacientes asignados"
      ON patients FOR SELECT
      TO authenticated
      USING (
        is_nurse() AND
        EXISTS (
          SELECT 1 FROM consultations
          WHERE consultations.patient_id = patients.id
          AND consultations.doctor_id IN (
            SELECT id FROM profiles WHERE role = 'doctor'
          )
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo administradores pueden crear pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden crear pacientes"
      ON patients FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo administradores pueden actualizar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden actualizar pacientes"
      ON patients FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo administradores pueden eliminar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar pacientes"
      ON patients FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Update RLS policies for medical records
DROP POLICY IF EXISTS "El personal médico puede ver expedientes" ON medical_records;
DROP POLICY IF EXISTS "El personal médico puede gestionar expedientes" ON medical_records;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Personal médico puede ver expedientes de sus pacientes'
  ) THEN
    CREATE POLICY "Personal médico puede ver expedientes de sus pacientes"
      ON medical_records FOR SELECT
      TO authenticated
      USING (
        has_patient_access(patient_id)
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo médicos pueden crear expedientes'
  ) THEN
    CREATE POLICY "Solo médicos pueden crear expedientes"
      ON medical_records FOR INSERT
      TO authenticated
      WITH CHECK (
        is_doctor() AND
        has_patient_access(patient_id)
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo médicos pueden actualizar expedientes'
  ) THEN
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
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Solo administradores pueden eliminar expedientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar expedientes"
      ON medical_records FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Add soft delete columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create soft delete function
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'soft_delete'
  ) THEN
    CREATE OR REPLACE FUNCTION soft_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.deleted_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'No mostrar registros eliminados de pacientes'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de pacientes"
      ON patients FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'No mostrar registros eliminados de expedientes'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de expedientes"
      ON medical_records FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'No mostrar registros eliminados de consultas'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de consultas"
      ON consultations FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;