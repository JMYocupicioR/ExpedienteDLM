/*
  # Schema Improvements and Security Policies
  
  1. Access Control
    - Adds patient access control function
    - Updates security policies for patients and medical records
  
  2. Data Validation
    - Adds email and phone validation
    - Sets NOT NULL constraints
  
  3. Performance
    - Adds performance-optimizing indexes
    
  4. Data Protection
    - Implements soft delete functionality
    - Adds deletion tracking
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

-- Modificar tabla de pacientes
DO $$ 
BEGIN
  -- Add NOT NULL constraints if they don't exist
  ALTER TABLE patients ALTER COLUMN email SET NOT NULL;
  ALTER TABLE patients ALTER COLUMN phone SET NOT NULL;
  
  -- Add check constraints if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'patients_email_check'
  ) THEN
    ALTER TABLE patients 
    ADD CONSTRAINT patients_email_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'patients_phone_check'
  ) THEN
    ALTER TABLE patients 
    ADD CONSTRAINT patients_phone_check 
    CHECK (phone ~* '^\+?[0-9]{10,15}$');
  END IF;
END $$;

-- Modificar tabla de expedientes médicos
DO $$ 
BEGIN
  ALTER TABLE medical_records ALTER COLUMN patient_id SET NOT NULL;
  ALTER TABLE medical_records ALTER COLUMN medical_history SET NOT NULL;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'medical_records_patient_id_fkey'
  ) THEN
    ALTER TABLE medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey 
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
DROP POLICY IF EXISTS "Administradores pueden ver todos los pacientes" ON patients;
DROP POLICY IF EXISTS "Médicos pueden ver sus pacientes" ON patients;
DROP POLICY IF EXISTS "Enfermeras pueden ver pacientes asignados" ON patients;
DROP POLICY IF EXISTS "Solo administradores pueden crear pacientes" ON patients;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar pacientes" ON patients;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar pacientes" ON patients;

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

-- Actualizar políticas RLS para expedientes médicos
DROP POLICY IF EXISTS "El personal médico puede ver expedientes" ON medical_records;
DROP POLICY IF EXISTS "El personal médico puede gestionar expedientes" ON medical_records;
DROP POLICY IF EXISTS "Personal médico puede ver expedientes de sus pacientes" ON medical_records;
DROP POLICY IF EXISTS "Solo médicos pueden crear expedientes" ON medical_records;
DROP POLICY IF EXISTS "Solo médicos pueden actualizar expedientes" ON medical_records;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar expedientes" ON medical_records;

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

-- Agregar columna de soft delete a todas las tablas principales
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Crear función para soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para soft delete
DROP TRIGGER IF EXISTS soft_delete_patients ON patients;
DROP TRIGGER IF EXISTS soft_delete_medical_records ON medical_records;
DROP TRIGGER IF EXISTS soft_delete_consultations ON consultations;

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

-- Actualizar políticas para considerar soft delete
DROP POLICY IF EXISTS "No mostrar registros eliminados de pacientes" ON patients;
DROP POLICY IF EXISTS "No mostrar registros eliminados de expedientes" ON medical_records;
DROP POLICY IF EXISTS "No mostrar registros eliminados de consultas" ON consultations;

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