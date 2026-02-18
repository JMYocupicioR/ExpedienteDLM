-- =====================================================
-- CREAR TABLA FALTANTE: consultation_prescriptions
-- =====================================================
-- Esta tabla vincula consultas con prescripciones emitidas
-- Referenciada en ConsultationForm.tsx pero NO EXISTÍA

BEGIN;

CREATE TABLE IF NOT EXISTS consultation_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevenir duplicados
  UNIQUE(consultation_id, prescription_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_consultation 
  ON consultation_prescriptions(consultation_id);
  
CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_prescription 
  ON consultation_prescriptions(prescription_id);

-- Row Level Security
ALTER TABLE consultation_prescriptions ENABLE ROW LEVEL SECURITY;

-- Solo el doctor que creó la consulta puede ver el vínculo
CREATE POLICY "consultation_prescriptions_select" 
  ON consultation_prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_prescriptions.consultation_id
        AND c.doctor_id = auth.uid()
    )
  );

-- Solo el doctor que creó la consulta puede insertar vínculos
CREATE POLICY "consultation_prescriptions_insert" 
  ON consultation_prescriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_prescriptions.consultation_id
        AND c.doctor_id = auth.uid()
    )
  );

-- Solo el doctor puede eliminar sus propios vínculos
CREATE POLICY "consultation_prescriptions_delete" 
  ON consultation_prescriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_prescriptions.consultation_id
        AND c.doctor_id = auth.uid()
    )
  );

-- Grants
GRANT SELECT, INSERT, DELETE ON consultation_prescriptions TO authenticated;

-- Comentario
COMMENT ON TABLE consultation_prescriptions IS 
  'Tabla de vinculación entre consultas y recetas emitidas durante la consulta';

COMMIT;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla consultation_prescriptions creada exitosamente';
END $$;
