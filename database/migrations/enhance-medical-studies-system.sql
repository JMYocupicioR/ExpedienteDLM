-- Migración: Mejoras al sistema de estudios médicos
-- Fecha: 2025-01-10
-- Descripción: Agrega campos para vinculación con consultas, revisión de estudios y resultados estructurados

-- 1. Extender tabla medical_tests
ALTER TABLE medical_tests
  ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS results_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('routine', 'urgent', 'stat')) DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS interpretation TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN medical_tests.consultation_id IS 'Consulta que solicitó este estudio';
COMMENT ON COLUMN medical_tests.reviewed_by IS 'Médico que revisó los resultados';
COMMENT ON COLUMN medical_tests.reviewed_at IS 'Fecha y hora de revisión de resultados';
COMMENT ON COLUMN medical_tests.results_data IS 'Resultados estructurados en formato JSON';
COMMENT ON COLUMN medical_tests.urgency_level IS 'Nivel de urgencia: routine, urgent, stat';
COMMENT ON COLUMN medical_tests.interpretation IS 'Interpretación médica de los resultados';

-- 2. Extender tabla medical_test_files con hash para detectar duplicados
ALTER TABLE medical_test_files
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN medical_test_files.file_hash IS 'Hash MD5 del archivo para detectar duplicados';
COMMENT ON COLUMN medical_test_files.thumbnail_url IS 'URL de miniatura (para imágenes)';
COMMENT ON COLUMN medical_test_files.is_reviewed IS 'Indica si el archivo ha sido revisado';

-- 3. Crear tabla para resultados de laboratorio estructurados
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_test_id UUID NOT NULL REFERENCES medical_tests(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  parameter_code TEXT, -- Código estándar (ej. LOINC)
  value NUMERIC,
  value_text TEXT, -- Para valores cualitativos
  unit TEXT,
  reference_min NUMERIC,
  reference_max NUMERIC,
  reference_text TEXT, -- Rango de referencia textual
  is_abnormal BOOLEAN DEFAULT FALSE,
  abnormal_flag TEXT CHECK (abnormal_flag IN ('high', 'low', 'critical_high', 'critical_low')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para lab_results
CREATE INDEX IF NOT EXISTS idx_lab_results_test_id ON lab_results(medical_test_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_parameter ON lab_results(parameter_name);
CREATE INDEX IF NOT EXISTS idx_lab_results_abnormal ON lab_results(is_abnormal) WHERE is_abnormal = TRUE;

COMMENT ON TABLE lab_results IS 'Resultados de laboratorio estructurados';
COMMENT ON COLUMN lab_results.parameter_code IS 'Código estándar LOINC u otro sistema de codificación';
COMMENT ON COLUMN lab_results.value IS 'Valor numérico del resultado';
COMMENT ON COLUMN lab_results.value_text IS 'Valor textual para resultados cualitativos';
COMMENT ON COLUMN lab_results.abnormal_flag IS 'Tipo de anormalidad detectada';

-- 4. Crear tabla para plantillas de estudios comunes
CREATE TABLE IF NOT EXISTS study_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('gabinete', 'laboratorio', 'otro')),
  test_name TEXT NOT NULL,
  description TEXT,
  typical_parameters JSONB DEFAULT '[]'::jsonb, -- Array de parámetros típicos
  preparation_instructions TEXT,
  estimated_duration TEXT,
  estimated_cost NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_templates_clinic ON study_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_study_templates_category ON study_templates(category);

COMMENT ON TABLE study_templates IS 'Plantillas de estudios médicos comunes para agilizar órdenes';

-- 5. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_lab_results_updated_at ON lab_results;
CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_templates_updated_at ON study_templates;
CREATE TRIGGER update_study_templates_updated_at
  BEFORE UPDATE ON study_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Políticas RLS para lab_results
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a usuarios de la misma clínica del paciente
CREATE POLICY "Users can view lab results from their clinic patients"
  ON lab_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = lab_results.medical_test_id
        AND pr.id = auth.uid()
    )
  );

-- Permitir inserción/actualización a médicos de la misma clínica
CREATE POLICY "Doctors can insert lab results for their clinic patients"
  ON lab_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = lab_results.medical_test_id
        AND pr.id = auth.uid()
        AND pr.role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Doctors can update lab results for their clinic patients"
  ON lab_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medical_tests mt
      JOIN patients p ON p.id = mt.patient_id
      JOIN profiles pr ON pr.clinic_id = p.clinic_id
      WHERE mt.id = lab_results.medical_test_id
        AND pr.id = auth.uid()
        AND pr.role IN ('doctor', 'admin')
    )
  );

-- 7. Políticas RLS para study_templates
ALTER TABLE study_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinic templates"
  ON study_templates FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage their clinic templates"
  ON study_templates FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Insertar plantillas de estudios comunes (ejemplos)
-- Nota: Esto se puede hacer manualmente desde la UI o con un script separado
-- INSERT INTO study_templates (clinic_id, category, test_name, description, typical_parameters) VALUES ...

-- 9. Vista para obtener estudios con información completa
CREATE OR REPLACE VIEW medical_studies_complete AS
SELECT
  mt.*,
  p.full_name as patient_name,
  doc.full_name as doctor_name,
  rev.full_name as reviewed_by_name,
  c.diagnosis as consultation_diagnosis,
  COUNT(DISTINCT mtf.id) as file_count,
  COUNT(DISTINCT lr.id) as lab_result_count,
  BOOL_OR(lr.is_abnormal) as has_abnormal_results
FROM medical_tests mt
LEFT JOIN patients p ON p.id = mt.patient_id
LEFT JOIN profiles doc ON doc.id = mt.doctor_id
LEFT JOIN profiles rev ON rev.id = mt.reviewed_by
LEFT JOIN consultations c ON c.id = mt.consultation_id
LEFT JOIN medical_test_files mtf ON mtf.medical_test_id = mt.id
LEFT JOIN lab_results lr ON lr.medical_test_id = mt.id
GROUP BY mt.id, p.full_name, doc.full_name, rev.full_name, c.diagnosis;

COMMENT ON VIEW medical_studies_complete IS 'Vista completa de estudios médicos con información relacionada';
