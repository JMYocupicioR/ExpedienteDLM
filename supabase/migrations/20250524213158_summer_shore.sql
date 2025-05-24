/*
  # Improve Schema with Prescription Templates

  1. New Tables
    - `prescription_templates` for storing reusable prescription formats
      - `id` (uuid, primary key)
      - `doctor_id` (uuid, references profiles)
      - `name` (text)
      - `category` (text)
      - `medications` (jsonb)
      - `diagnosis` (text)
      - `notes` (text)
      - Timestamps and soft delete

  2. Security
    - Enable RLS on prescription_templates
    - Add policies for doctors and admins
    - Audit logging for all changes

  3. Changes
    - Add helper functions for access control
    - Add indexes for performance
    - Add triggers for timestamps and soft delete
*/

-- Función para verificar si un usuario tiene acceso a un paciente específico
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

-- Crear tabla de plantillas de recetas
CREATE TABLE IF NOT EXISTS prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  medications JSONB NOT NULL,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_category ON prescription_templates(category);

-- Políticas RLS
CREATE POLICY "Doctors can manage their templates"
  ON prescription_templates
  FOR ALL
  TO authenticated
  USING (
    (is_doctor() AND doctor_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    (is_doctor() AND doctor_id = auth.uid())
    OR is_admin()
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

-- Trigger para actualizar updated_at
CREATE TRIGGER set_timestamp_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Trigger para soft delete
CREATE TRIGGER soft_delete_prescription_templates
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION soft_delete();

-- Trigger para auditoría
CREATE TRIGGER audit_prescription_templates
  AFTER INSERT OR UPDATE OR DELETE ON prescription_templates
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

-- Agregar columna de soft delete a tablas principales si no existe
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

-- Crear índices si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'patients' AND indexname = 'idx_patients_email'
  ) THEN
    CREATE INDEX idx_patients_email ON patients(email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'patients' AND indexname = 'idx_patients_phone'
  ) THEN
    CREATE INDEX idx_patients_phone ON patients(phone);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'medical_records' AND indexname = 'idx_medical_records_patient'
  ) THEN
    CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'consultations' AND indexname = 'idx_consultations_patient'
  ) THEN
    CREATE INDEX idx_consultations_patient ON consultations(patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'consultations' AND indexname = 'idx_consultations_doctor'
  ) THEN
    CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
  END IF;
END $$;

-- Actualizar políticas RLS para pacientes
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "El personal médico puede ver pacientes" ON patients;
  DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' AND policyname = 'Administradores pueden ver todos los pacientes'
  ) THEN
    CREATE POLICY "Administradores pueden ver todos los pacientes"
      ON patients FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' AND policyname = 'Médicos pueden ver sus pacientes'
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
    WHERE tablename = 'patients' AND policyname = 'Enfermeras pueden ver pacientes asignados'
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
    WHERE tablename = 'patients' AND policyname = 'Solo administradores pueden crear pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden crear pacientes"
      ON patients FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' AND policyname = 'Solo administradores pueden actualizar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden actualizar pacientes"
      ON patients FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' AND policyname = 'Solo administradores pueden eliminar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar pacientes"
      ON patients FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Actualizar políticas RLS para expedientes médicos
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "El personal médico puede ver expedientes" ON medical_records;
  DROP POLICY IF EXISTS "El personal médico puede gestionar expedientes" ON medical_records;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'medical_records' AND policyname = 'Personal médico puede ver expedientes de sus pacientes'
  ) THEN
    CREATE POLICY "Personal médico puede ver expedientes de sus pacientes"
      ON medical_records FOR SELECT
      TO authenticated
      USING (has_patient_access(patient_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'medical_records' AND policyname = 'Solo médicos pueden crear expedientes'
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
    WHERE tablename = 'medical_records' AND policyname = 'Solo médicos pueden actualizar expedientes'
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
    WHERE tablename = 'medical_records' AND policyname = 'Solo administradores pueden eliminar expedientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar expedientes"
      ON medical_records FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Agregar restricciones de validación a pacientes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'patients' AND constraint_name = 'patients_email_check'
  ) THEN
    ALTER TABLE patients 
      ADD CONSTRAINT patients_email_check 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'patients' AND constraint_name = 'patients_phone_check'
  ) THEN
    ALTER TABLE patients 
      ADD CONSTRAINT patients_phone_check 
      CHECK (phone ~* '^\+?[0-9]{10,15}$');
  END IF;
END $$;