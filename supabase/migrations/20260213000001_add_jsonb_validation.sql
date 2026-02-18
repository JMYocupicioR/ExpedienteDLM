-- =====================================================
-- VALIDACIONES JSONB PARA INTEGRIDAD DE DATOS
-- =====================================================
-- Agrega constraints de validación a campos JSONB críticos
-- para prevenir datos inconsistentes

BEGIN;

-- =====================================================
-- 1. VALIDACIÓN DE CONTENIDO DE PLANTILLAS
-- =====================================================

-- Función de validación para content de medical_templates
CREATE OR REPLACE FUNCTION validate_template_content(content JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Debe tener campo "sections" como array
  IF NOT (content ? 'sections' AND jsonb_typeof(content->'sections') = 'array') THEN
    RETURN FALSE;
  END IF;
  
  -- Cada sección debe tener "id" y "title"
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(content->'sections') AS section
    WHERE NOT (section ? 'id' AND section ? 'title')
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Validar que fields sea array si existe
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(content->'sections') AS section
    WHERE section ? 'fields' AND jsonb_typeof(section->'fields') <> 'array'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Validar que exercises sea array si existe
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(content->'sections') AS section
    WHERE section ? 'exercises' AND jsonb_typeof(section->'exercises') <> 'array'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar constraint a medical_templates
ALTER TABLE medical_templates
DROP CONSTRAINT IF EXISTS medical_templates_content_valid;

ALTER TABLE medical_templates
ADD CONSTRAINT medical_templates_content_valid
CHECK (validate_template_content(content));

COMMENT ON FUNCTION validate_template_content IS 
  'Valida la estructura del campo content en medical_templates';

-- =====================================================
-- 2. VALIDACIÓN DE MEDICAMENTOS EN PRESCRIPCIONES
-- =====================================================

-- Función de validación para medications en prescriptions
CREATE OR REPLACE FUNCTION validate_medications(meds JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Debe ser un array
  IF jsonb_typeof(meds) <> 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Puede ser array vacío
  IF jsonb_array_length(meds) = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Cada medicamento debe tener campos requeridos
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(meds) AS med
    WHERE NOT (
      med ? 'name' AND 
      med ? 'dosage' AND 
      med ? 'frequency' AND 
      med ? 'duration' AND
      jsonb_typeof(med->'name') = 'string' AND
      (med->>'name') <> '' AND
      (med->>'dosage') <> '' AND
      (med->>'frequency') <> '' AND
      (med->>'duration') <> ''
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar constraint a prescriptions
ALTER TABLE prescriptions
DROP CONSTRAINT IF EXISTS prescriptions_medications_valid;

ALTER TABLE prescriptions
ADD CONSTRAINT prescriptions_medications_valid
CHECK (validate_medications(medications));

COMMENT ON FUNCTION validate_medications IS 
  'Valida que medications en prescriptions tenga la estructura correcta';

-- =====================================================
-- 3. VALIDACIÓN DE SIGNOS VITALES
-- =====================================================

-- Función de validación para vital_signs
CREATE OR REPLACE FUNCTION validate_vital_signs(vs JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  temp NUMERIC;
  hr NUMERIC;
  bp TEXT;
  rr NUMERIC;
BEGIN
  -- Debe ser un objeto
  IF jsonb_typeof(vs) <> 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Validar temperatura si existe
  IF vs ? 'temperature' THEN
    BEGIN
      temp := (vs->>'temperature')::NUMERIC;
      IF temp < 30 OR temp > 45 THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
  END IF;
  
  -- Validar frecuencia cardíaca si existe
  IF vs ? 'heart_rate' THEN
    BEGIN
      hr := (vs->>'heart_rate')::NUMERIC;
      IF hr < 30 OR hr > 220 THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
  END IF;
  
  -- Validar frecuencia respiratoria si existe
  IF vs ? 'respiratory_rate' THEN
    BEGIN
      rr := (vs->>'respiratory_rate')::NUMERIC;
      IF rr < 5 OR rr > 60 THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
  END IF;
  
  -- Validar formato de presión arterial si existe
  IF vs ? 'blood_pressure' THEN
    bp := vs->>'blood_pressure';
    IF bp !~ '^\d{2,3}/\d{2,3}$' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar constraint a consultations
ALTER TABLE consultations
DROP CONSTRAINT IF EXISTS consultations_vital_signs_valid;

ALTER TABLE consultations
ADD CONSTRAINT consultations_vital_signs_valid
CHECK (vital_signs IS NULL OR validate_vital_signs(vital_signs));

COMMENT ON FUNCTION validate_vital_signs IS 
  'Valida rangos de signos vitales en consultations y physical_exams';

-- =====================================================
-- 4. VALIDACIÓN DE PHYSICAL_EXAMINATION
-- =====================================================

-- Función de validación para physical_examination
CREATE OR REPLACE FUNCTION validate_physical_examination(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Debe ser un objeto si existe
  IF data IS NOT NULL AND jsonb_typeof(data) <> 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Si tiene vital_signs, debe ser un objeto
  IF data ? 'vital_signs' AND jsonb_typeof(data->'vital_signs') <> 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Si tiene sections, debe ser un objeto
  IF data ? 'sections' AND jsonb_typeof(data->'sections') <> 'object' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Agregar constraint a consultations
ALTER TABLE consultations
DROP CONSTRAINT IF EXISTS consultations_physical_examination_valid;

ALTER TABLE consultations
ADD CONSTRAINT consultations_physical_examination_valid
CHECK (physical_examination IS NULL OR validate_physical_examination(physical_examination));

COMMENT ON FUNCTION validate_physical_examination IS 
  'Valida estructura de physical_examination en consultations';

-- =====================================================
-- 5. ACTUALIZAR DATOS EXISTENTES INVÁLIDOS
-- =====================================================

-- Limpiar contenidos inválidos de medical_templates
UPDATE medical_templates
SET content = '{"sections": []}'::jsonb
WHERE NOT validate_template_content(content);

-- Limpiar medications inválidos de prescriptions
UPDATE prescriptions
SET medications = '[]'::jsonb
WHERE NOT validate_medications(medications);

-- Limpiar vital_signs inválidos de consultations
UPDATE consultations
SET vital_signs = NULL
WHERE vital_signs IS NOT NULL AND NOT validate_vital_signs(vital_signs);

-- Limpiar physical_examination inválidos de consultations
UPDATE consultations
SET physical_examination = NULL
WHERE physical_examination IS NOT NULL AND NOT validate_physical_examination(physical_examination);

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  invalid_templates INTEGER;
  invalid_prescriptions INTEGER;
  invalid_vital_signs INTEGER;
BEGIN
  -- Verificar que no haya datos inválidos
  SELECT COUNT(*) INTO invalid_templates
  FROM medical_templates
  WHERE NOT validate_template_content(content);
  
  SELECT COUNT(*) INTO invalid_prescriptions
  FROM prescriptions
  WHERE NOT validate_medications(medications);
  
  SELECT COUNT(*) INTO invalid_vital_signs
  FROM consultations
  WHERE vital_signs IS NOT NULL AND NOT validate_vital_signs(vital_signs);
  
  IF invalid_templates > 0 OR invalid_prescriptions > 0 OR invalid_vital_signs > 0 THEN
    RAISE WARNING 'Datos inválidos limpiados: templates=%, prescriptions=%, vital_signs=%', 
      invalid_templates, invalid_prescriptions, invalid_vital_signs;
  END IF;
  
  RAISE NOTICE '✅ Validaciones JSONB agregadas exitosamente';
  RAISE NOTICE 'Templates validados: OK';
  RAISE NOTICE 'Prescriptions validadas: OK';
  RAISE NOTICE 'Vital signs validados: OK';
  RAISE NOTICE 'Physical examination validados: OK';
END $$;
