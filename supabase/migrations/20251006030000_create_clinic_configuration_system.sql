-- =====================================================
-- SISTEMA DE CONFIGURACIÓN DE CLÍNICAS - MVP
-- Permite a administradores configurar clínicas
-- y a médicos tener preferencias por clínica
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TABLA DE CONFIGURACIONES DE CLÍNICA (Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS clinic_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Configuración General
  timezone TEXT DEFAULT 'America/Mexico_City',
  language TEXT DEFAULT 'es',
  currency TEXT DEFAULT 'MXN',
  
  -- Configuración de Consultas
  default_consultation_duration INTEGER DEFAULT 30, -- minutos
  enable_teleconsultation BOOLEAN DEFAULT false,
  enable_emergency_mode BOOLEAN DEFAULT false,
  max_patients_per_day INTEGER DEFAULT 20,
  buffer_time_minutes INTEGER DEFAULT 5,
  
  -- Horarios de Atención (JSONB por flexibilidad)
  business_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "open": "09:00", "close": "18:00"},
    "tuesday": {"enabled": true, "open": "09:00", "close": "18:00"},
    "wednesday": {"enabled": true, "open": "09:00", "close": "18:00"},
    "thursday": {"enabled": true, "open": "09:00", "close": "18:00"},
    "friday": {"enabled": true, "open": "09:00", "close": "18:00"},
    "saturday": {"enabled": false, "open": "09:00", "close": "14:00"},
    "sunday": {"enabled": false, "open": null, "close": null}
  }'::jsonb,
  
  -- Configuración de Expediente
  enable_soap_format BOOLEAN DEFAULT true,
  enable_cie10_integration BOOLEAN DEFAULT true,
  require_diagnosis BOOLEAN DEFAULT true,
  require_physical_exam BOOLEAN DEFAULT false,
  
  -- Configuración de Recetas
  prescription_template_id UUID,
  enable_electronic_prescription BOOLEAN DEFAULT false,
  require_prescription_approval BOOLEAN DEFAULT false,
  
  -- Configuración de Notificaciones
  notification_settings JSONB DEFAULT '{
    "email_enabled": true,
    "sms_enabled": false,
    "whatsapp_enabled": false,
    "appointment_reminders": true,
    "reminder_hours_before": 24
  }'::jsonb,
  
  -- Configuración de Privacidad y Seguridad
  data_retention_days INTEGER DEFAULT 3650, -- 10 años por NOM
  enable_audit_log BOOLEAN DEFAULT true,
  require_patient_consent BOOLEAN DEFAULT true,
  
  -- Configuración de Facturación
  enable_billing BOOLEAN DEFAULT false,
  tax_rate DECIMAL(5,2) DEFAULT 16.00,
  billing_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Configuración UI/UX
  theme_color TEXT DEFAULT '#3B82F6',
  logo_url TEXT,
  custom_branding JSONB DEFAULT '{}'::jsonb,
  
  -- Configuración Avanzada (extensible)
  advanced_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  configured_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(clinic_id),
  CHECK (default_consultation_duration > 0),
  CHECK (max_patients_per_day > 0),
  CHECK (buffer_time_minutes >= 0),
  CHECK (data_retention_days >= 365) -- Mínimo 1 año
);

-- =====================================================
-- 2. TABLA DE PREFERENCIAS DE USUARIO POR CLÍNICA (Médico)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_clinic_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Preferencias de Consulta
  preferred_consultation_duration INTEGER DEFAULT 30,
  my_schedule JSONB DEFAULT '{}'::jsonb, -- Horario personalizado del médico
  
  -- Preferencias de Expediente
  default_note_template TEXT,
  favorite_diagnoses TEXT[] DEFAULT ARRAY[]::TEXT[],
  frequent_medications JSONB DEFAULT '[]'::jsonb,
  
  -- Preferencias de UI
  sidebar_collapsed BOOLEAN DEFAULT false,
  dashboard_widgets JSONB DEFAULT '["upcoming_appointments", "recent_patients", "pending_tasks"]'::jsonb,
  quick_actions JSONB DEFAULT '["new_consultation", "search_patient", "new_prescription"]'::jsonb,
  
  -- Notificaciones Personales
  notification_preferences JSONB DEFAULT '{
    "email_appointments": true,
    "email_emergencies": true,
    "desktop_notifications": true,
    "sound_alerts": false
  }'::jsonb,
  
  -- Atajos de Teclado Personalizados
  keyboard_shortcuts JSONB DEFAULT '{}'::jsonb,
  
  -- Plantillas Personalizadas
  custom_templates JSONB DEFAULT '[]'::jsonb,
  
  -- Configuración de Exportación
  export_preferences JSONB DEFAULT '{
    "format": "pdf",
    "include_signature": true,
    "include_logo": true
  }'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, clinic_id),
  CHECK (preferred_consultation_duration > 0)
);

-- =====================================================
-- 3. TABLA DE CONFIGURACIONES ACTIVAS (Cache)
-- Para mejorar performance
-- =====================================================
CREATE TABLE IF NOT EXISTS active_clinic_configs_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  computed_config JSONB NOT NULL, -- Configuración combinada (clinic + user preferences)
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, clinic_id)
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clinic_configurations_clinic_id ON clinic_configurations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_clinic_preferences_user_id ON user_clinic_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clinic_preferences_clinic_id ON user_clinic_preferences(clinic_id);
CREATE INDEX IF NOT EXISTS idx_active_configs_cache_user_clinic ON active_clinic_configs_cache(user_id, clinic_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE clinic_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clinic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_clinic_configs_cache ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins de la clínica pueden ver/editar configuración de clínica
CREATE POLICY "clinic_admins_can_manage_config" ON clinic_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_user_relationships cur
      WHERE cur.clinic_id = clinic_configurations.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_user_relationships cur
      WHERE cur.clinic_id = clinic_configurations.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- Política: Usuarios pueden ver configuración de sus clínicas (read-only)
CREATE POLICY "users_can_read_their_clinic_config" ON clinic_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_user_relationships cur
      WHERE cur.clinic_id = clinic_configurations.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- Política: Usuarios pueden gestionar sus propias preferencias
CREATE POLICY "users_manage_own_preferences" ON user_clinic_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Cache solo para el propio usuario
CREATE POLICY "users_access_own_cache" ON active_clinic_configs_cache
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 6. FUNCIONES AUXILIARES
-- =====================================================

-- Función: Obtener configuración combinada (clínica + preferencias usuario)
CREATE OR REPLACE FUNCTION get_effective_config(
  p_user_id UUID,
  p_clinic_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinic_config JSONB;
  v_user_preferences JSONB;
  v_combined_config JSONB;
BEGIN
  -- Obtener configuración de clínica
  SELECT to_jsonb(cc.*) INTO v_clinic_config
  FROM clinic_configurations cc
  WHERE cc.clinic_id = p_clinic_id;
  
  -- Si no existe configuración, usar defaults
  IF v_clinic_config IS NULL THEN
    v_clinic_config := '{}'::jsonb;
  END IF;
  
  -- Obtener preferencias de usuario
  SELECT to_jsonb(ucp.*) INTO v_user_preferences
  FROM user_clinic_preferences ucp
  WHERE ucp.user_id = p_user_id
    AND ucp.clinic_id = p_clinic_id;
  
  -- Si no existen preferencias, usar defaults
  IF v_user_preferences IS NULL THEN
    v_user_preferences := '{}'::jsonb;
  END IF;
  
  -- Combinar (preferencias de usuario sobrescriben configuración de clínica)
  v_combined_config := v_clinic_config || v_user_preferences;
  
  -- Actualizar cache
  INSERT INTO active_clinic_configs_cache (user_id, clinic_id, computed_config)
  VALUES (p_user_id, p_clinic_id, v_combined_config)
  ON CONFLICT (user_id, clinic_id)
  DO UPDATE SET
    computed_config = v_combined_config,
    last_updated = NOW();
  
  RETURN v_combined_config;
END;
$$;

-- Función: Inicializar configuración por defecto para nueva clínica
CREATE OR REPLACE FUNCTION initialize_clinic_config()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO clinic_configurations (clinic_id)
  VALUES (NEW.id)
  ON CONFLICT (clinic_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger: Auto-crear configuración al crear clínica
DROP TRIGGER IF EXISTS trigger_initialize_clinic_config ON clinics;
CREATE TRIGGER trigger_initialize_clinic_config
  AFTER INSERT ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION initialize_clinic_config();

-- Función: Invalidar cache al actualizar configuración
CREATE OR REPLACE FUNCTION invalidate_config_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Eliminar cache de todos los usuarios de esta clínica
  DELETE FROM active_clinic_configs_cache
  WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id);
  
  RETURN NEW;
END;
$$;

-- Trigger: Invalidar cache en cambios de configuración
DROP TRIGGER IF EXISTS trigger_invalidate_clinic_config_cache ON clinic_configurations;
CREATE TRIGGER trigger_invalidate_clinic_config_cache
  AFTER INSERT OR UPDATE OR DELETE ON clinic_configurations
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_config_cache();

DROP TRIGGER IF EXISTS trigger_invalidate_user_preferences_cache ON user_clinic_preferences;
CREATE TRIGGER trigger_invalidate_user_preferences_cache
  AFTER INSERT OR UPDATE OR DELETE ON user_clinic_preferences
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_config_cache();

-- =====================================================
-- 7. POBLAR CONFIGURACIONES EXISTENTES
-- =====================================================

-- Crear configuraciones por defecto para clínicas existentes
INSERT INTO clinic_configurations (clinic_id)
SELECT id FROM clinics
WHERE NOT EXISTS (
  SELECT 1 FROM clinic_configurations cc WHERE cc.clinic_id = clinics.id
);

COMMIT;

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  config_count INT;
  clinic_count INT;
BEGIN
  SELECT COUNT(*) INTO config_count FROM clinic_configurations;
  SELECT COUNT(*) INTO clinic_count FROM clinics;
  
  RAISE NOTICE '✅ Migración completada';
  RAISE NOTICE 'Total clínicas: %', clinic_count;
  RAISE NOTICE 'Configuraciones creadas: %', config_count;
END $$;
