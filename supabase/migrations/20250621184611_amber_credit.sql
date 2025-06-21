/*
  # Mejoras de Seguridad y Validación

  1. Validación de Datos
    - Funciones para validar arrays de texto (soluciona el problema de Validation Bypass)
    - Esquemas JSONB estrictos
    - Validación de URLs

  2. Seguridad
    - RLS para attachments
    - Políticas de seguridad completas

  3. Estandarización
    - Tabla de secciones para physical_exam_files
*/

-- ======================================================================
-- PARTE 1: FUNCIONES DE VALIDACIÓN PARA ARRAYS
-- ======================================================================

-- Función para validar y sanitizar arrays de texto
CREATE OR REPLACE FUNCTION validate_text_array(
  input_array text[],
  max_items integer DEFAULT 50,
  max_length integer DEFAULT 200
)
RETURNS text[] AS $$
DECLARE
  sanitized_array text[] := '{}';
  item text;
  sanitized_item text;
BEGIN
  -- Limitar tamaño del array
  IF input_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Procesar cada elemento
  FOR i IN 1..LEAST(array_length(input_array, 1), max_items) LOOP
    item := input_array[i];
    
    -- Omitir elementos nulos o vacíos
    IF item IS NULL OR trim(item) = '' THEN
      CONTINUE;
    END IF;
    
    -- Sanitizar HTML y limitar longitud
    sanitized_item := substring(
      replace(replace(replace(replace(replace(
        trim(item),
        '<', '&lt;'),
        '>', '&gt;'),
        '"', '&quot;'),
        '''', '&#39;'),
        '/', '&#47;'
      ),
      1, max_length
    );
    
    -- Agregar al resultado si no está vacío después de sanitizar
    IF length(sanitized_item) > 0 THEN
      sanitized_array := array_append(sanitized_array, sanitized_item);
    END IF;
  END LOOP;
  
  RETURN sanitized_array;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================================
-- PARTE 2: VALIDACIÓN DE URLs
-- ======================================================================

-- Función para validar URLs
CREATE OR REPLACE FUNCTION validate_url(url text)
RETURNS BOOLEAN AS $$
BEGIN
  IF url IS NULL OR length(trim(url)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar protocolo
  IF NOT (url ~* '^https?://') THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar patrones maliciosos
  IF url ~* '(javascript:|data:|vbscript:|file:|blob:|about:|on\w+\s*=|<script)' THEN
    RETURN FALSE;
  END IF;
  
  -- Limitar longitud
  IF length(url) > 2000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================================
-- PARTE 3: ESQUEMAS JSONB
-- ======================================================================

-- Función para validar esquemas JSONB
CREATE OR REPLACE FUNCTION validate_jsonb_schema(
  data jsonb,
  schema_name text
)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := TRUE;
BEGIN
  -- Validación específica por esquema
  CASE schema_name
    WHEN 'vital_signs' THEN
      -- Comprobar propiedades requeridas y tipos
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        (data->>'systolic_pressure' IS NULL OR jsonb_typeof(data->'systolic_pressure') IN ('string', 'number')) AND
        (data->>'diastolic_pressure' IS NULL OR jsonb_typeof(data->'diastolic_pressure') IN ('string', 'number')) AND
        (data->>'heart_rate' IS NULL OR jsonb_typeof(data->'heart_rate') IN ('string', 'number')) AND
        (data->>'respiratory_rate' IS NULL OR jsonb_typeof(data->'respiratory_rate') IN ('string', 'number')) AND
        (data->>'temperature' IS NULL OR jsonb_typeof(data->'temperature') IN ('string', 'number')) AND
        jsonb_array_length(COALESCE(data->'medications', '[]'::jsonb)) <= 30
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'prescription' THEN
      -- Validar estructura de recetas
      IF NOT (
        jsonb_typeof(data) = 'object' AND
        data ? 'medications' AND
        jsonb_typeof(data->'medications') = 'array' AND
        jsonb_array_length(data->'medications') <= 20
      ) THEN
        is_valid := FALSE;
      END IF;
      
    WHEN 'physical_examination' THEN
      -- Validar estructura de examen físico
      IF NOT (
        jsonb_typeof(data) = 'object'
      ) THEN
        is_valid := FALSE;
      END IF;
      
    ELSE
      -- Validación genérica para esquemas no específicos
      IF NOT (jsonb_typeof(data) IN ('object', 'array')) THEN
        is_valid := FALSE;
      END IF;
  END CASE;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================================
-- PARTE 4: TABLA DE SECCIONES PARA PHYSICAL_EXAM_FILES
-- ======================================================================

-- Crear tabla de secciones estandarizadas
CREATE TABLE IF NOT EXISTS physical_exam_sections (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insertar secciones predefinidas
INSERT INTO physical_exam_sections (id, name, description, sort_order) VALUES
  ('general', 'Estado General', 'Aspecto general del paciente', 1),
  ('head_neck', 'Cabeza y Cuello', 'Exploración de cabeza y cuello', 2),
  ('chest', 'Tórax', 'Exploración torácica', 3),
  ('cardiovascular', 'Cardiovascular', 'Sistema cardiovascular', 4),
  ('respiratory', 'Respiratorio', 'Sistema respiratorio', 5),
  ('abdomen', 'Abdomen', 'Exploración abdominal', 6),
  ('extremities', 'Extremidades', 'Exploración de extremidades', 7),
  ('neurological', 'Neurológico', 'Exploración neurológica', 8),
  ('skin', 'Piel y Faneras', 'Exploración dermatológica', 9),
  ('genitourinary', 'Genitourinario', 'Sistema genitourinario', 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Habilitar RLS en la tabla de secciones
ALTER TABLE physical_exam_sections ENABLE ROW LEVEL SECURITY;

-- RLS para que los usuarios autenticados puedan ver las secciones
CREATE POLICY "Authenticated users can view exam sections"
  ON physical_exam_sections FOR SELECT TO authenticated
  USING (true);

-- ======================================================================
-- PARTE 5: VALIDACIÓN PARA PHYSICAL_EXAM_FILES
-- ======================================================================

-- Modificar physical_exam_files para referenciar a la tabla de secciones
ALTER TABLE physical_exam_files 
  ADD CONSTRAINT IF NOT EXISTS physical_exam_files_section_fkey
  FOREIGN KEY (section_id) REFERENCES physical_exam_sections(id);

-- Añadir validación de URL
ALTER TABLE physical_exam_files
  ADD CONSTRAINT IF NOT EXISTS physical_exam_files_url_validation
  CHECK (validate_url(file_url));

-- ======================================================================
-- PARTE 6: VALIDACIÓN PARA ATTACHMENTS
-- ======================================================================

-- Añadir validación de URL a la tabla attachments
ALTER TABLE attachments
  ADD CONSTRAINT IF NOT EXISTS attachments_url_validation
  CHECK (validate_url(file_url));

-- Habilitar RLS para la tabla attachments
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS para que el personal médico pueda ver adjuntos
CREATE POLICY "Medical staff can view attachments" 
  ON attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'nurse', 'administrator')
    )
  );

-- RLS para que el personal médico pueda insertar adjuntos
CREATE POLICY "Medical staff can insert attachments"
  ON attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

-- RLS para que el personal médico pueda actualizar adjuntos
CREATE POLICY "Medical staff can update attachments"
  ON attachments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

-- RLS para que el personal médico pueda eliminar adjuntos
CREATE POLICY "Medical staff can delete attachments"
  ON attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

-- ======================================================================
-- PARTE 7: TRIGGERS PARA VALIDACIÓN AUTOMÁTICA
-- ======================================================================

-- Trigger para validar historias patológicas
CREATE OR REPLACE FUNCTION validate_pathological_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar y sanitizar arrays
  NEW.chronic_diseases := validate_text_array(NEW.chronic_diseases, 20, 100);
  NEW.current_treatments := validate_text_array(NEW.current_treatments, 15, 150);
  NEW.surgeries := validate_text_array(NEW.surgeries, 10, 200);
  NEW.fractures := validate_text_array(NEW.fractures, 10, 100);
  NEW.previous_hospitalizations := validate_text_array(NEW.previous_hospitalizations, 15, 200);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar historias no patológicas
CREATE OR REPLACE FUNCTION validate_non_pathological_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar y sanitizar arrays
  NEW.vaccination_history := validate_text_array(NEW.vaccination_history, 50, 80);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar expedientes médicos
CREATE OR REPLACE FUNCTION validate_medical_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar y sanitizar arrays
  NEW.allergies := validate_text_array(NEW.allergies, 20, 100);
  NEW.medications := validate_text_array(NEW.medications, 30, 150);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar datos JSONB
CREATE OR REPLACE FUNCTION validate_jsonb_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar estructura JSONB según el tipo de tabla
  CASE TG_TABLE_NAME
    WHEN 'consultations' THEN
      IF NEW.vital_signs IS NOT NULL AND NOT validate_jsonb_schema(NEW.vital_signs, 'vital_signs') THEN
        RAISE EXCEPTION 'Datos de signos vitales inválidos';
      END IF;
      
      IF NEW.physical_examination IS NOT NULL AND NOT validate_jsonb_schema(NEW.physical_examination, 'physical_examination') THEN
        RAISE EXCEPTION 'Datos de examen físico inválidos';
      END IF;
      
    WHEN 'prescriptions' THEN
      IF NEW.medications IS NOT NULL AND NOT validate_jsonb_schema(NEW.medications, 'prescription') THEN
        RAISE EXCEPTION 'Datos de medicamentos inválidos';
      END IF;
      
    WHEN 'profiles' THEN
      IF NEW.prescription_style IS NOT NULL AND NOT (jsonb_typeof(NEW.prescription_style) = 'object') THEN
        RAISE EXCEPTION 'Estilo de receta inválido';
      END IF;
      
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS validate_pathological_history_trigger ON pathological_histories;
CREATE TRIGGER validate_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_pathological_history();

DROP TRIGGER IF EXISTS validate_non_pathological_history_trigger ON non_pathological_histories;
CREATE TRIGGER validate_non_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON non_pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_non_pathological_history();

DROP TRIGGER IF EXISTS validate_medical_records_trigger ON medical_records;
CREATE TRIGGER validate_medical_records_trigger
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION validate_medical_records();

DROP TRIGGER IF EXISTS validate_consultations_jsonb ON consultations;
CREATE TRIGGER validate_consultations_jsonb
  BEFORE INSERT OR UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

DROP TRIGGER IF EXISTS validate_prescriptions_jsonb ON prescriptions;
CREATE TRIGGER validate_prescriptions_jsonb
  BEFORE INSERT OR UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

DROP TRIGGER IF EXISTS validate_profiles_jsonb ON profiles;
CREATE TRIGGER validate_profiles_jsonb
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_jsonb_data();

-- ======================================================================
-- PARTE 8: FUNCIÓN PARA VALIDAR UPLOAD DE LOGOS
-- ======================================================================

-- Función para validar uploads de logos
CREATE OR REPLACE FUNCTION validate_logo_upload(
  bucket_id text,
  name text, 
  user_id uuid
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar bucket
  IF bucket_id != 'logos' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar extensión de archivo
  IF NOT (
    name ~* '\.jpg$' OR 
    name ~* '\.jpeg$' OR 
    name ~* '\.png$' OR 
    name ~* '\.gif$' OR 
    name ~* '\.webp$' OR 
    name ~* '\.svg$'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que el nombre comience con el ID del usuario
  IF NOT (SPLIT_PART(name, '-', 1) = user_id::text) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================================================
-- PARTE 9: MEJORA DE LAS POLÍTICAS DE ALMACENAMIENTO
-- ======================================================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Users can upload their own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND 
    validate_logo_upload(bucket_id, name, auth.uid())
  );

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "Users can update their own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos' AND 
    owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'logos' AND 
    validate_logo_upload(bucket_id, name, auth.uid())
  );

CREATE POLICY "Users can delete their own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND 
    owner = auth.uid()
  );

-- ======================================================================
-- PARTE 10: ACTUALIZACIÓN DE DATOS EXISTENTES
-- ======================================================================

-- Limpiar y validar datos existentes en pathological_histories
UPDATE pathological_histories SET
  chronic_diseases = validate_text_array(chronic_diseases, 20, 100),
  current_treatments = validate_text_array(current_treatments, 15, 150),
  surgeries = validate_text_array(surgeries, 10, 200),
  fractures = validate_text_array(fractures, 10, 100),
  previous_hospitalizations = validate_text_array(previous_hospitalizations, 15, 200)
WHERE id IS NOT NULL;

-- Limpiar y validar datos existentes en non_pathological_histories
UPDATE non_pathological_histories SET
  vaccination_history = validate_text_array(vaccination_history, 50, 80)
WHERE id IS NOT NULL;

-- Limpiar y validar datos existentes en medical_records
UPDATE medical_records SET
  allergies = validate_text_array(allergies, 20, 100),
  medications = validate_text_array(medications, 30, 150)
WHERE id IS NOT NULL;