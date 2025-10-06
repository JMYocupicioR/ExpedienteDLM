-- Migración: Crear tablas base para sistema de estudios médicos
-- Fecha: 2025-01-10
-- Descripción: Crea las tablas medical_tests y medical_test_files desde cero

-- 1. Crear tabla medical_tests
CREATE TABLE IF NOT EXISTS medical_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('gabinete', 'laboratorio', 'otro')),
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ordered', 'in_progress', 'completed')) DEFAULT 'ordered',
  ordered_date DATE,
  result_date DATE,
  lab_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para medical_tests
CREATE INDEX IF NOT EXISTS idx_medical_tests_patient ON medical_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_tests_doctor ON medical_tests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_tests_category ON medical_tests(category);
CREATE INDEX IF NOT EXISTS idx_medical_tests_status ON medical_tests(status);
CREATE INDEX IF NOT EXISTS idx_medical_tests_ordered_date ON medical_tests(ordered_date);

COMMENT ON TABLE medical_tests IS 'Estudios médicos solicitados (laboratorios, gabinete, etc.)';

-- 2. Crear tabla medical_test_files
CREATE TABLE IF NOT EXISTS medical_test_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_test_id UUID NOT NULL REFERENCES medical_tests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para medical_test_files
CREATE INDEX IF NOT EXISTS idx_medical_test_files_test ON medical_test_files(medical_test_id);
CREATE INDEX IF NOT EXISTS idx_medical_test_files_uploaded_by ON medical_test_files(uploaded_by);

COMMENT ON TABLE medical_test_files IS 'Archivos adjuntos a estudios médicos (PDFs, imágenes, etc.)';

-- 3. Trigger para updated_at en medical_tests
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_medical_tests_updated_at ON medical_tests;
CREATE TRIGGER update_medical_tests_updated_at
  BEFORE UPDATE ON medical_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Políticas RLS para medical_tests
ALTER TABLE medical_tests ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios de la misma clínica pueden ver estudios
CREATE POLICY "Users can view medical tests from their clinic patients"
  ON medical_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE p.id = medical_tests.patient_id
        AND pr.id = auth.uid()
    )
  );

-- Política de inserción: médicos pueden crear estudios para pacientes de su clínica
CREATE POLICY "Doctors can create medical tests for their clinic patients"
  ON medical_tests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE p.id = medical_tests.patient_id
        AND pr.id = auth.uid()
        AND pr.role IN ('doctor', 'admin')
    )
  );

-- Política de actualización: médicos pueden actualizar estudios de su clínica
CREATE POLICY "Doctors can update medical tests from their clinic patients"
  ON medical_tests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE p.id = medical_tests.patient_id
        AND pr.id = auth.uid()
        AND pr.role IN ('doctor', 'admin')
    )
  );

-- Política de eliminación: solo admins pueden eliminar
CREATE POLICY "Admins can delete medical tests from their clinic patients"
  ON medical_tests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE p.id = medical_tests.patient_id
        AND pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  );

-- 5. Políticas RLS para medical_test_files
ALTER TABLE medical_test_files ENABLE ROW LEVEL SECURITY;

-- Lectura: usuarios de la clínica pueden ver archivos
CREATE POLICY "Users can view files from their clinic medical tests"
  ON medical_test_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = medical_test_files.medical_test_id
        AND pr.id = auth.uid()
    )
  );

-- Inserción: usuarios pueden subir archivos a estudios de su clínica
CREATE POLICY "Users can upload files to their clinic medical tests"
  ON medical_test_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = medical_test_files.medical_test_id
        AND pr.id = auth.uid()
    )
  );

-- Eliminación: usuarios pueden eliminar archivos de estudios de su clínica
CREATE POLICY "Users can delete files from their clinic medical tests"
  ON medical_test_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = medical_test_files.medical_test_id
        AND pr.id = auth.uid()
    )
  );
