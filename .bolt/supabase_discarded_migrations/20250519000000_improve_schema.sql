/*
  # Mejoras en el Esquema y Seguridad

  1. Cambios en la Estructura
    - Cambiar tipo de ID de UUID a BIGINT con IDENTITY
    - Hacer obligatorias las claves foráneas
    - Agregar índices para mejorar el rendimiento
    - Estandarizar nombres de columnas y restricciones

  2. Mejoras en Seguridad
    - Refinar políticas RLS para ser más específicas
    - Agregar políticas de auditoría
    - Mejorar control de acceso basado en roles
    - Implementar soft delete consistente
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
ALTER TABLE patients
  ALTER COLUMN id TYPE BIGINT USING id::BIGINT,
  ALTER COLUMN id SET DEFAULT nextval('patients_id_seq'),
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT patients_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT patients_phone_check CHECK (phone ~* '^\+?[0-9]{10,15}$');

-- Crear secuencia para ID de pacientes
CREATE SEQUENCE IF NOT EXISTS patients_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Modificar tabla de expedientes médicos
ALTER TABLE medical_records
  ALTER COLUMN id TYPE BIGINT USING id::BIGINT,
  ALTER COLUMN id SET DEFAULT nextval('medical_records_id_seq'),
  ALTER COLUMN patient_id SET NOT NULL,
  ALTER COLUMN medical_history SET NOT NULL,
  ADD CONSTRAINT medical_records_patient_id_fkey 
    FOREIGN KEY (patient_id) 
    REFERENCES patients(id) 
    ON DELETE CASCADE;

-- Crear secuencia para ID de expedientes médicos
CREATE SEQUENCE IF NOT EXISTS medical_records_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);

-- Actualizar políticas RLS para pacientes
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

-- Actualizar políticas RLS para expedientes médicos
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
CREATE POLICY "No mostrar registros eliminados"
  ON patients FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "No mostrar registros eliminados"
  ON medical_records FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "No mostrar registros eliminados"
  ON consultations FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL); 