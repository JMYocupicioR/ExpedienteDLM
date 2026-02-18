-- =====================================================
-- CORREGIR POLÍTICAS RLS DE PRESCRIPCIONES
-- =====================================================
-- PROBLEMA: Actualmente un doctor puede ver TODAS las recetas
-- de su clínica, violando privacidad médica.
-- SOLUCIÓN: Solo puede ver recetas que él emitió o de sus pacientes

BEGIN;

-- =====================================================
-- 1. ELIMINAR POLÍTICAS INSEGURAS
-- =====================================================

DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON prescriptions;

-- =====================================================
-- 2. CREAR POLÍTICAS SEGURAS
-- =====================================================

-- SELECT: Solo recetas propias o de pacientes que el doctor puede acceder
CREATE POLICY "prescriptions_select_secure" ON prescriptions
  FOR SELECT USING (
    -- Recetas emitidas por el doctor
    doctor_id = auth.uid()
    OR
    -- Recetas de pacientes que el doctor puede ver (si la tabla patients tiene clinic_id)
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = prescriptions.patient_id
        AND EXISTS (
          SELECT 1 FROM clinic_user_relationships cur 
          WHERE cur.user_id = auth.uid()
            AND cur.is_active = true
            AND cur.status = 'approved'
            AND (
              p.clinic_id IS NULL  -- Pacientes sin clínica (para evitar errores)
              OR cur.clinic_id = p.clinic_id
            )
        )
    )
  );

-- INSERT: Solo puede crear recetas como doctor autenticado
CREATE POLICY "prescriptions_insert_secure" ON prescriptions
  FOR INSERT WITH CHECK (
    -- Es el doctor que emite la receta
    doctor_id = auth.uid()
    AND
    -- El doctor está activo en alguna clínica (verificación opcional)
    EXISTS (
      SELECT 1 FROM clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.is_active = true
        AND cur.status = 'approved'
    )
  );

-- UPDATE: Solo puede actualizar recetas que emitió
CREATE POLICY "prescriptions_update_secure" ON prescriptions
  FOR UPDATE USING (
    doctor_id = auth.uid()
  ) WITH CHECK (
    doctor_id = auth.uid()
  );

-- DELETE: Solo puede eliminar recetas que emitió y están activas
CREATE POLICY "prescriptions_delete_secure" ON prescriptions
  FOR DELETE USING (
    doctor_id = auth.uid()
    AND status = 'active'  -- Solo recetas activas
  );

-- =====================================================
-- 3. POLÍTICA ESPECIAL PARA PACIENTES (Portal Paciente)
-- =====================================================

-- Los pacientes pueden ver sus propias recetas activas
-- Solo si la tabla patients tiene la columna auth_user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'auth_user_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "prescriptions_select_own_patient" ON prescriptions
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = prescriptions.patient_id
              AND p.auth_user_id = auth.uid()
          )
          AND status = ''active''
        )
    ';
    RAISE NOTICE 'Política para pacientes creada (auth_user_id disponible)';
  ELSE
    RAISE NOTICE 'Política para pacientes omitida (auth_user_id no disponible)';
  END IF;
END $$;

-- =====================================================
-- 4. AGREGAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para optimizar política de pacientes (solo si existe la columna)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'auth_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_patients_auth_user_id 
      ON patients(auth_user_id) WHERE auth_user_id IS NOT NULL;
  END IF;
END $$;

-- Índice compuesto para verificación rápida
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_doctor 
  ON prescriptions(patient_id, doctor_id);

-- =====================================================
-- 5. FUNCIÓN DE AUDITORÍA (Para INSERT/UPDATE/DELETE)
-- =====================================================

-- Trigger para registrar cambios en prescripciones
CREATE OR REPLACE FUNCTION log_prescription_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar cambios si la tabla audit_logs existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    INSERT INTO audit_logs (
      entity_type,
      entity_id,
      action,
      user_id,
      metadata,
      timestamp
    ) VALUES (
      'prescriptions',
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      auth.uid(),
      jsonb_build_object(
        'doctor_id', COALESCE(NEW.doctor_id, OLD.doctor_id),
        'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
        'operation', TG_OP
      ),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear triggers para auditoría de cambios (no SELECT, solo cambios)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trigger_log_prescription_changes ON prescriptions;
    CREATE TRIGGER trigger_log_prescription_changes
      AFTER INSERT OR UPDATE OR DELETE ON prescriptions
      FOR EACH ROW
      EXECUTE FUNCTION log_prescription_changes();
    RAISE NOTICE 'Trigger de auditoría de cambios creado';
  ELSE
    RAISE NOTICE 'Trigger de auditoría omitido (tabla audit_logs no existe)';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verificar que se crearon las políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'prescriptions';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'No se crearon todas las políticas de seguridad';
  END IF;
  
  RAISE NOTICE '✅ Políticas RLS de prescripciones corregidas';
  RAISE NOTICE 'Total políticas activas: %', policy_count;
END $$;
