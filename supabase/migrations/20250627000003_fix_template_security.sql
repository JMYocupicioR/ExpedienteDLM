/*
  # Migración para Implementar Seguridad y Auditoría en Plantillas
  
  1. Problemas identificados:
    - Falta auditoría de cambios en plantillas
    - Políticas RLS insuficientes para compartir plantillas
    - No hay versionado de plantillas
    - Falta validación de integridad de datos
    
  2. Correcciones:
    - Implementar auditoría completa de plantillas
    - Crear sistema de versionado
    - Mejorar políticas RLS para compartir plantillas
    - Agregar validación de integridad y firma digital
*/

-- ===== CREAR TABLA DE AUDITORÍA DE PLANTILLAS =====
CREATE TABLE IF NOT EXISTS public.template_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'shared', 'copied', 'exported'
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== CREAR TABLA DE VERSIONES DE PLANTILLAS =====
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  definition JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_major_version BOOLEAN DEFAULT FALSE,
  checksum VARCHAR(64), -- Para verificar integridad
  UNIQUE(template_id, version_number)
);

-- ===== CREAR TABLA DE PLANTILLAS COMPARTIDAS =====
CREATE TABLE IF NOT EXISTS public.shared_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id),
  shared_with_id UUID REFERENCES public.profiles(id),
  permission_level VARCHAR(20) DEFAULT 'read' CHECK (permission_level IN ('read', 'copy', 'edit')),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(template_id, shared_with_id)
);

-- ===== CREAR TABLA DE PLANTILLAS PÚBLICAS/INSTITUCIONALES =====
CREATE TABLE IF NOT EXISTS public.public_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE CASCADE,
  published_by UUID REFERENCES public.profiles(id),
  category VARCHAR(100), -- 'general', 'cardiology', 'neurology', etc.
  tags TEXT[],
  description TEXT,
  usage_instructions TEXT,
  is_certified BOOLEAN DEFAULT FALSE,
  certified_by UUID REFERENCES public.profiles(id),
  certification_date TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== AGREGAR CAMPOS DE SEGURIDAD A PLANTILLAS =====
ALTER TABLE public.physical_exam_templates 
ADD COLUMN IF NOT EXISTS checksum VARCHAR(64),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- ===== FUNCIÓN PARA CALCULAR CHECKSUM DE PLANTILLA =====
CREATE OR REPLACE FUNCTION public.calculate_template_checksum(definition_data JSONB)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(digest(definition_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== TRIGGER PARA AUDITORÍA AUTOMÁTICA DE PLANTILLAS =====
CREATE OR REPLACE FUNCTION public.audit_template_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_summary TEXT := '';
  session_info JSONB;
BEGIN
  -- Obtener información de sesión (si está disponible)
  session_info := current_setting('app.session_info', true)::JSONB;
  
  CASE TG_OP
    WHEN 'INSERT' THEN
      -- Auditar creación
      INSERT INTO template_audit (
        template_id,
        doctor_id,
        action,
        new_values,
        changes_summary,
        ip_address,
        user_agent,
        session_id
      ) VALUES (
        NEW.id,
        NEW.doctor_id,
        'created',
        to_jsonb(NEW),
        'Plantilla creada: ' || NEW.name,
        COALESCE((session_info->>'ip_address')::INET, '127.0.0.1'::INET),
        session_info->>'user_agent',
        session_info->>'session_id'
      );
      
      -- Crear primera versión
      INSERT INTO template_versions (
        template_id,
        version_number,
        definition,
        change_summary,
        created_by,
        is_major_version,
        checksum
      ) VALUES (
        NEW.id,
        1,
        NEW.definition,
        'Versión inicial',
        NEW.doctor_id,
        TRUE,
        calculate_template_checksum(NEW.definition)
      );
      
      -- Calcular y asignar checksum
      NEW.checksum := calculate_template_checksum(NEW.definition);
      
      RETURN NEW;
      
    WHEN 'UPDATE' THEN
      -- Detectar cambios específicos
      IF OLD.name != NEW.name THEN
        changes_summary := changes_summary || 'Nombre actualizado; ';
      END IF;
      
      IF OLD.definition != NEW.definition THEN
        changes_summary := changes_summary || 'Definición modificada; ';
        -- Incrementar versión si la definición cambió
        NEW.version_number := COALESCE(OLD.version_number, 1) + 1;
        NEW.checksum := calculate_template_checksum(NEW.definition);
        
        -- Crear nueva versión
        INSERT INTO template_versions (
          template_id,
          version_number,
          definition,
          change_summary,
          created_by,
          checksum
        ) VALUES (
          NEW.id,
          NEW.version_number,
          NEW.definition,
          changes_summary,
          auth.uid(),
          NEW.checksum
        );
      END IF;
      
      IF OLD.is_active != NEW.is_active THEN
        changes_summary := changes_summary || CASE 
          WHEN NEW.is_active THEN 'Plantilla activada; '
          ELSE 'Plantilla desactivada; '
        END;
      END IF;
      
      -- Auditar actualización
      INSERT INTO template_audit (
        template_id,
        doctor_id,
        action,
        old_values,
        new_values,
        changes_summary,
        ip_address,
        user_agent,
        session_id
      ) VALUES (
        NEW.id,
        NEW.doctor_id,
        'updated',
        to_jsonb(OLD),
        to_jsonb(NEW),
        TRIM(changes_summary),
        COALESCE((session_info->>'ip_address')::INET, '127.0.0.1'::INET),
        session_info->>'user_agent',
        session_info->>'session_id'
      );
      
      RETURN NEW;
      
    WHEN 'DELETE' THEN
      -- Auditar eliminación
      INSERT INTO template_audit (
        template_id,
        doctor_id,
        action,
        old_values,
        changes_summary,
        ip_address,
        user_agent,
        session_id
      ) VALUES (
        OLD.id,
        OLD.doctor_id,
        'deleted',
        to_jsonb(OLD),
        'Plantilla eliminada: ' || OLD.name,
        COALESCE((session_info->>'ip_address')::INET, '127.0.0.1'::INET),
        session_info->>'user_agent',
        session_info->>'session_id'
      );
      
      RETURN OLD;
  END CASE;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===== APLICAR TRIGGER DE AUDITORÍA =====
DROP TRIGGER IF EXISTS template_audit_trigger ON physical_exam_templates;
CREATE TRIGGER template_audit_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON physical_exam_templates
  FOR EACH ROW EXECUTE FUNCTION audit_template_changes();

-- ===== FUNCIÓN PARA COMPARTIR PLANTILLA =====
CREATE OR REPLACE FUNCTION public.share_template(
  template_id_param UUID,
  shared_with_email TEXT,
  permission_level_param VARCHAR(20) DEFAULT 'read',
  expires_days INTEGER DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  template_record physical_exam_templates%ROWTYPE;
  target_user_record profiles%ROWTYPE;
  expires_at_param TIMESTAMP WITH TIME ZONE;
  existing_share_id UUID;
BEGIN
  -- Verificar que la plantilla existe y pertenece al usuario actual
  SELECT * INTO template_record
  FROM physical_exam_templates
  WHERE id = template_id_param 
    AND doctor_id = auth.uid()
    AND is_active = TRUE;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Plantilla no encontrada o sin permisos'
    );
  END IF;
  
  -- Verificar que el usuario destino existe
  SELECT * INTO target_user_record
  FROM profiles
  WHERE email = shared_with_email
    AND role IN ('doctor', 'administrator');
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario destinatario no encontrado o no es médico'
    );
  END IF;
  
  -- Calcular fecha de expiración
  IF expires_days IS NOT NULL THEN
    expires_at_param := NOW() + (expires_days || ' days')::INTERVAL;
  END IF;
  
  -- Verificar si ya existe un compartido activo
  SELECT id INTO existing_share_id
  FROM shared_templates
  WHERE template_id = template_id_param
    AND shared_with_id = target_user_record.id
    AND is_active = TRUE;
  
  IF existing_share_id IS NOT NULL THEN
    -- Actualizar compartido existente
    UPDATE shared_templates SET
      permission_level = permission_level_param,
      expires_at = expires_at_param,
      notes = notes_param,
      shared_at = NOW()
    WHERE id = existing_share_id;
  ELSE
    -- Crear nuevo compartido
    INSERT INTO shared_templates (
      template_id,
      owner_id,
      shared_with_id,
      permission_level,
      expires_at,
      notes
    ) VALUES (
      template_id_param,
      auth.uid(),
      target_user_record.id,
      permission_level_param,
      expires_at_param,
      notes_param
    );
  END IF;
  
  -- Auditar la acción
  INSERT INTO template_audit (
    template_id,
    doctor_id,
    action,
    changes_summary
  ) VALUES (
    template_id_param,
    auth.uid(),
    'shared',
    'Plantilla compartida con ' || shared_with_email || ' con permisos de ' || permission_level_param
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Plantilla compartida exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== FUNCIÓN PARA VERIFICAR INTEGRIDAD DE PLANTILLA =====
CREATE OR REPLACE FUNCTION public.verify_template_integrity(template_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  template_record physical_exam_templates%ROWTYPE;
  calculated_checksum VARCHAR(64);
  version_count INTEGER;
  latest_version template_versions%ROWTYPE;
BEGIN
  -- Obtener plantilla
  SELECT * INTO template_record
  FROM physical_exam_templates
  WHERE id = template_id_param;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Plantilla no encontrada'
    );
  END IF;
  
  -- Calcular checksum actual
  calculated_checksum := calculate_template_checksum(template_record.definition);
  
  -- Verificar checksum
  IF template_record.checksum != calculated_checksum THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Checksum no coincide - posible corrupción de datos',
      'stored_checksum', template_record.checksum,
      'calculated_checksum', calculated_checksum
    );
  END IF;
  
  -- Verificar consistencia de versiones
  SELECT COUNT(*), MAX(version_number) INTO version_count, latest_version.version_number
  FROM template_versions
  WHERE template_id = template_id_param;
  
  IF version_count != template_record.version_number THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Inconsistencia en versionado',
      'template_version', template_record.version_number,
      'versions_count', version_count
    );
  END IF;
  
  -- Obtener última versión
  SELECT * INTO latest_version
  FROM template_versions
  WHERE template_id = template_id_param
  ORDER BY version_number DESC
  LIMIT 1;
  
  -- Verificar que la última versión coincide
  IF latest_version.definition != template_record.definition THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Definición de plantilla no coincide con última versión'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', TRUE,
    'checksum', calculated_checksum,
    'version', template_record.version_number,
    'versions_count', version_count,
    'last_modified', template_record.updated_at
  );
END;
$$ LANGUAGE plpgsql;

-- ===== POLÍTICAS RLS MEJORADAS PARA PLANTILLAS =====

-- Política base para plantillas propias
DROP POLICY IF EXISTS "Doctors can manage their own templates" ON physical_exam_templates;
CREATE POLICY "Doctors can manage their own templates"
  ON physical_exam_templates
  FOR ALL
  TO authenticated
  USING (
    -- Verificar licencia médica válida
    validate_medical_license(auth.uid()) AND
    -- Plantilla propia o plantilla compartida con permisos
    (doctor_id = auth.uid() OR
     EXISTS (
       SELECT 1 FROM shared_templates st
       WHERE st.template_id = physical_exam_templates.id
         AND st.shared_with_id = auth.uid()
         AND st.is_active = TRUE
         AND (st.expires_at IS NULL OR st.expires_at > NOW())
     ))
  )
  WITH CHECK (
    -- Solo puede crear/modificar plantillas propias
    validate_medical_license(auth.uid()) AND
    doctor_id = auth.uid() AND
    -- Verificar estructura válida
    validate_jsonb_schema(definition, 'physical_exam_template')
  );

-- Política para plantillas públicas
DROP POLICY IF EXISTS "Users can view public templates" ON physical_exam_templates;
CREATE POLICY "Users can view public templates"
  ON physical_exam_templates
  FOR SELECT
  TO authenticated
  USING (
    validate_medical_license(auth.uid()) AND
    is_public = TRUE AND
    is_active = TRUE
  );

-- ===== POLÍTICAS PARA TABLAS DE AUDITORÍA =====

-- Solo administradores pueden ver auditoría completa
CREATE POLICY "Administrators can view all audit logs"
  ON template_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

-- Doctores pueden ver auditoría de sus plantillas
CREATE POLICY "Doctors can view their template audit"
  ON template_audit
  FOR SELECT
  TO authenticated
  USING (
    doctor_id = auth.uid() AND
    validate_medical_license(auth.uid())
  );

-- ===== POLÍTICAS PARA PLANTILLAS COMPARTIDAS =====

-- Propietarios pueden gestionar compartidos
CREATE POLICY "Template owners can manage shares"
  ON shared_templates
  FOR ALL
  TO authenticated
  USING (
    owner_id = auth.uid() AND
    validate_medical_license(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid() AND
    validate_medical_license(auth.uid())
  );

-- Usuarios pueden ver plantillas compartidas con ellos
CREATE POLICY "Users can view templates shared with them"
  ON shared_templates
  FOR SELECT
  TO authenticated
  USING (
    shared_with_id = auth.uid() AND
    is_active = TRUE AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    validate_medical_license(auth.uid())
  );

-- ===== FUNCIÓN PARA ESTADÍSTICAS DE PLANTILLAS =====
CREATE OR REPLACE FUNCTION public.get_template_statistics(doctor_id_param UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  target_doctor_id UUID;
  stats JSONB;
BEGIN
  target_doctor_id := COALESCE(doctor_id_param, auth.uid());
  
  -- Verificar permisos
  IF target_doctor_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'administrator'
    ) THEN
      RETURN jsonb_build_object('error', 'Sin permisos para ver estadísticas de otro usuario');
    END IF;
  END IF;
  
  SELECT jsonb_build_object(
    'total_templates', COUNT(*),
    'active_templates', COUNT(*) FILTER (WHERE is_active = TRUE),
    'public_templates', COUNT(*) FILTER (WHERE is_public = TRUE),
    'shared_templates', COUNT(*) FILTER (WHERE sharing_enabled = TRUE),
    'total_usage', COALESCE(SUM(usage_count), 0),
    'avg_sections_per_template', ROUND(AVG(jsonb_array_length(definition->'sections')), 2),
    'most_used_template', (
      SELECT jsonb_build_object('name', name, 'usage_count', usage_count)
      FROM physical_exam_templates
      WHERE doctor_id = target_doctor_id
        AND is_active = TRUE
      ORDER BY usage_count DESC
      LIMIT 1
    ),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', action,
          'template_name', (SELECT name FROM physical_exam_templates WHERE id = template_audit.template_id),
          'created_at', created_at
        )
      )
      FROM template_audit
      WHERE doctor_id = target_doctor_id
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10
    )
  ) INTO stats
  FROM physical_exam_templates
  WHERE doctor_id = target_doctor_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== TRIGGER PARA ACTUALIZAR CONTADORES DE USO =====
CREATE OR REPLACE FUNCTION public.update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de uso cuando se usa en una consulta
  UPDATE physical_exam_templates 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id::text = NEW.physical_examination->>'template_id';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_template_usage_trigger ON consultations;
CREATE TRIGGER update_template_usage_trigger
  AFTER INSERT ON consultations
  FOR EACH ROW 
  WHEN (NEW.physical_examination IS NOT NULL)
  EXECUTE FUNCTION update_template_usage();

-- ===== ÍNDICES PARA OPTIMIZAR CONSULTAS =====
CREATE INDEX IF NOT EXISTS idx_template_audit_doctor_id ON template_audit(doctor_id);
CREATE INDEX IF NOT EXISTS idx_template_audit_template_id ON template_audit(template_id);
CREATE INDEX IF NOT EXISTS idx_template_audit_created_at ON template_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id, version_number);
CREATE INDEX IF NOT EXISTS idx_shared_templates_shared_with ON shared_templates(shared_with_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shared_templates_expires_at ON shared_templates(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_physical_exam_templates_checksum ON physical_exam_templates(checksum);
CREATE INDEX IF NOT EXISTS idx_physical_exam_templates_public ON physical_exam_templates(is_public, is_active);

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON TABLE template_audit IS 'Auditoría completa de cambios en plantillas de exploración física';
COMMENT ON TABLE template_versions IS 'Versionado de plantillas para control de cambios y recuperación';
COMMENT ON TABLE shared_templates IS 'Gestión de plantillas compartidas entre médicos';
COMMENT ON TABLE public_templates IS 'Catálogo de plantillas públicas certificadas';

COMMENT ON FUNCTION calculate_template_checksum(JSONB) IS 'Calcula checksum SHA-256 para verificar integridad de plantillas';
COMMENT ON FUNCTION share_template(UUID, TEXT, VARCHAR, INTEGER, TEXT) IS 'Comparte plantilla con otro médico con permisos específicos';
COMMENT ON FUNCTION verify_template_integrity(UUID) IS 'Verifica integridad y consistencia de plantilla';
COMMENT ON FUNCTION get_template_statistics(UUID) IS 'Obtiene estadísticas de uso y actividad de plantillas';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Sistema completo de seguridad y auditoría para plantillas implementado con versionado, compartir e integridad';
END $$; 