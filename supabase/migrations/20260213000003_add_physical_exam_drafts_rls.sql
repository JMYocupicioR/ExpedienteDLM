-- =====================================================
-- AGREGAR RLS Y ÍNDICES A physical_exam_drafts
-- =====================================================
-- PROBLEMA: La tabla no tiene RLS habilitado, cualquier usuario
-- autenticado puede leer borradores de otros doctores

BEGIN;

-- =====================================================
-- 1. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE physical_exam_drafts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREAR POLÍTICAS RLS
-- =====================================================

-- SELECT: Solo el doctor puede ver sus propios borradores
CREATE POLICY "physical_exam_drafts_select_own" 
  ON physical_exam_drafts FOR SELECT
  USING (doctor_id = auth.uid());

-- INSERT: Solo el doctor puede crear sus borradores
CREATE POLICY "physical_exam_drafts_insert_own" 
  ON physical_exam_drafts FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- UPDATE: Solo el doctor puede actualizar sus borradores
CREATE POLICY "physical_exam_drafts_update_own" 
  ON physical_exam_drafts FOR UPDATE
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- DELETE: Solo el doctor puede eliminar sus borradores
CREATE POLICY "physical_exam_drafts_delete_own" 
  ON physical_exam_drafts FOR DELETE
  USING (doctor_id = auth.uid());

-- =====================================================
-- 3. AGREGAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice compuesto para búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_physical_exam_drafts_patient_doctor 
  ON physical_exam_drafts(patient_id, doctor_id);

-- Índice para ordenamiento por última modificación
CREATE INDEX IF NOT EXISTS idx_physical_exam_drafts_last_modified 
  ON physical_exam_drafts(last_modified DESC);

-- Índice para búsqueda por template_id
CREATE INDEX IF NOT EXISTS idx_physical_exam_drafts_template_id 
  ON physical_exam_drafts(template_id) 
  WHERE template_id IS NOT NULL;

-- =====================================================
-- 4. AGREGAR CONSTRAINT DE VALIDACIÓN
-- =====================================================

-- Validar que draft_data sea un objeto JSONB válido
ALTER TABLE physical_exam_drafts
DROP CONSTRAINT IF EXISTS physical_exam_drafts_data_valid;

ALTER TABLE physical_exam_drafts
ADD CONSTRAINT physical_exam_drafts_data_valid
CHECK (jsonb_typeof(draft_data) = 'object');

-- =====================================================
-- 5. AGREGAR TRIGGER DE ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Actualizar last_modified automáticamente
CREATE OR REPLACE FUNCTION update_physical_exam_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_physical_exam_draft_timestamp 
  ON physical_exam_drafts;

CREATE TRIGGER trigger_update_physical_exam_draft_timestamp
  BEFORE UPDATE ON physical_exam_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_physical_exam_draft_timestamp();

-- =====================================================
-- 6. LIMPIEZA DE BORRADORES ANTIGUOS
-- =====================================================

-- Función para eliminar borradores antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM physical_exam_drafts
  WHERE last_modified < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_drafts IS 
  'Elimina borradores de examen físico con más de 30 días de antigüedad';

-- Programar limpieza automática si pg_cron está disponible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-old-exam-drafts',
      '0 3 * * 0',  -- Domingos a las 3 AM
      'SELECT cleanup_old_drafts()'
    );
    RAISE NOTICE 'Limpieza automática de borradores programada';
  ELSE
    RAISE NOTICE 'pg_cron no disponible, limpieza manual requerida';
  END IF;
END $$;

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON physical_exam_drafts TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Verificar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'physical_exam_drafts';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'No se crearon todas las políticas RLS';
  END IF;
  
  -- Verificar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'physical_exam_drafts';
  
  RAISE NOTICE '✅ RLS y optimizaciones agregadas a physical_exam_drafts';
  RAISE NOTICE 'Políticas RLS: %', policy_count;
  RAISE NOTICE 'Índices: %', index_count;
END $$;
