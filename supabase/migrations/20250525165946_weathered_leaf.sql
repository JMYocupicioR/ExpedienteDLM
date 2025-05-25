/*
  # Schema Improvements and Security Updates
  
  1. Security Functions
    - Patient access verification function
  2. Table Modifications
    - Email and phone validation
    - Required fields enforcement
    - Foreign key constraints
  3. Performance Improvements
    - Indexes for common queries
    - Text search capabilities
  4. Soft Delete
    - Added to all main tables
    - Triggers and policies
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
          AND consultations.nurse_id = auth.uid()
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modificar tabla de pacientes
DO $$ 
BEGIN
  ALTER TABLE patients ALTER COLUMN email SET NOT NULL;
  ALTER TABLE patients ALTER COLUMN phone SET NOT NULL;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_email_check'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_email_check 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_phone_check'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_phone_check 
      CHECK (phone ~* '^\+?[0-9]{10,15}$');
  END IF;
END $$;

-- Modificar tabla de expedientes médicos
DO $$ 
BEGIN
  ALTER TABLE medical_records ALTER COLUMN patient_id SET NOT NULL;
  ALTER TABLE medical_records ALTER COLUMN medical_history SET NOT NULL;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_patient_id_fkey'
  ) THEN
    ALTER TABLE medical_records ADD CONSTRAINT medical_records_patient_id_fkey 
      FOREIGN KEY (patient_id) 
      REFERENCES patients(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);

-- Actualizar políticas RLS para pacientes
DROP POLICY IF EXISTS "El personal médico puede ver pacientes" ON patients;
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Administradores pueden ver todos los pacientes'
  ) THEN
    CREATE POLICY "Administradores pueden ver todos los pacientes"
      ON patients FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Médicos pueden ver sus pacientes'
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
    SELECT 1 FROM pg_policies WHERE policyname = 'Enfermeras pueden ver pacientes asignados'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo administradores pueden crear pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden crear pacientes"
      ON patients FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo administradores pueden actualizar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden actualizar pacientes"
      ON patients FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo administradores pueden eliminar pacientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar pacientes"
      ON patients FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Actualizar políticas RLS para expedientes médicos
DROP POLICY IF EXISTS "El personal médico puede ver expedientes" ON medical_records;
DROP POLICY IF EXISTS "El personal médico puede gestionar expedientes" ON medical_records;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Personal médico puede ver expedientes de sus pacientes'
  ) THEN
    CREATE POLICY "Personal médico puede ver expedientes de sus pacientes"
      ON medical_records FOR SELECT
      TO authenticated
      USING (
        has_patient_access(patient_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo médicos pueden crear expedientes'
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
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo médicos pueden actualizar expedientes'
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
    SELECT 1 FROM pg_policies WHERE policyname = 'Solo administradores pueden eliminar expedientes'
  ) THEN
    CREATE POLICY "Solo administradores pueden eliminar expedientes"
      ON medical_records FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Agregar columna de soft delete a todas las tablas principales
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Crear función para soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para soft delete
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'soft_delete_patients'
  ) THEN
    CREATE TRIGGER soft_delete_patients
      BEFORE UPDATE ON patients
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'soft_delete_medical_records'
  ) THEN
    CREATE TRIGGER soft_delete_medical_records
      BEFORE UPDATE ON medical_records
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'soft_delete_consultations'
  ) THEN
    CREATE TRIGGER soft_delete_consultations
      BEFORE UPDATE ON consultations
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'soft_delete_prescriptions'
  ) THEN
    CREATE TRIGGER soft_delete_prescriptions
      BEFORE UPDATE ON prescriptions
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;
END $$;

-- Actualizar políticas para considerar soft delete
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'No mostrar registros eliminados de pacientes'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de pacientes"
      ON patients FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'No mostrar registros eliminados de expedientes'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de expedientes"
      ON medical_records FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'No mostrar registros eliminados de consultas'
  ) THEN
    CREATE POLICY "No mostrar registros eliminados de consultas"
      ON consultations FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'No mostrar recetas eliminadas'
  ) THEN
    CREATE POLICY "No mostrar recetas eliminadas"
      ON prescriptions FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- Agregar índices para búsqueda de texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_email_trgm ON patients USING gin (email gin_trgm_ops);

-- Agregar vector de búsqueda para pacientes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION patients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'patients_search_vector_trigger'
  ) THEN
    CREATE TRIGGER patients_search_vector_trigger
      BEFORE INSERT OR UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION patients_search_vector_update();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_search_vector ON patients USING gin(search_vector);