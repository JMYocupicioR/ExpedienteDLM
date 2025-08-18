-- ==========================================
-- MIGRACIÓN: EXPANDIR TABLA DE CLÍNICAS
-- ==========================================
-- Esta migración agrega campos adicionales para configuración completa

-- Paso 1: Agregar nuevas columnas a la tabla clinics
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS director_name TEXT,
ADD COLUMN IF NOT EXISTS director_license TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS founding_date DATE,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
  "monday": {"open": "09:00", "close": "18:00", "is_open": true},
  "tuesday": {"open": "09:00", "close": "18:00", "is_open": true},
  "wednesday": {"open": "09:00", "close": "18:00", "is_open": true},
  "thursday": {"open": "09:00", "close": "18:00", "is_open": true},
  "friday": {"open": "09:00", "close": "18:00", "is_open": true},
  "saturday": {"open": "09:00", "close": "13:00", "is_open": true},
  "sunday": {"open": "09:00", "close": "13:00", "is_open": false}
}';

-- Paso 2: Agregar campos de servicios y especialidades
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS insurance_providers JSONB DEFAULT '[]';

-- Paso 3: Agregar campos de contacto adicionales
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
ADD COLUMN IF NOT EXISTS appointment_duration_minutes INTEGER DEFAULT 30;

-- Paso 4: Agregar campos de facturación
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS billing_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["cash", "card", "transfer"]';

-- Paso 5: Agregar trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clinics_updated_at ON public.clinics;
CREATE TRIGGER update_clinics_updated_at 
    BEFORE UPDATE ON public.clinics 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Paso 6: Crear índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON public.clinics(is_active);
CREATE INDEX IF NOT EXISTS idx_clinics_type ON public.clinics(type);
CREATE INDEX IF NOT EXISTS idx_clinics_license_number ON public.clinics(license_number);

-- Paso 7: Actualizar políticas RLS para incluir restricciones de is_active
DROP POLICY IF EXISTS "clinic_select_simple" ON public.clinics;
CREATE POLICY "clinic_select_active" ON public.clinics
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid()
        )
    );

-- Paso 8: Crear política para que admins puedan actualizar configuración
DROP POLICY IF EXISTS "clinic_update_simple" ON public.clinics;
CREATE POLICY "clinic_update_admin" ON public.clinics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid() 
            AND clinic_members.role = 'admin'
        )
    );

-- Paso 9: Crear vista para información pública de clínicas
CREATE OR REPLACE VIEW public.clinics_public AS
SELECT 
    id,
    name,
    type,
    address,
    phone,
    email,
    website,
    logo_url,
    theme_color,
    working_hours,
    services,
    specialties,
    insurance_providers
FROM public.clinics
WHERE is_active = true;

-- Permisos para la vista pública
GRANT SELECT ON public.clinics_public TO anon, authenticated;

-- Paso 10: Crear funciones helper para configuración de clínica
CREATE OR REPLACE FUNCTION public.update_clinic_settings(
    p_clinic_id UUID,
    p_settings JSONB
)
RETURNS public.clinics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clinic public.clinics;
BEGIN
    -- Verificar que el usuario es admin de la clínica
    IF NOT EXISTS (
        SELECT 1 FROM public.clinic_members
        WHERE clinic_id = p_clinic_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden actualizar configuración';
    END IF;
    
    -- Actualizar settings (merge con existentes)
    UPDATE public.clinics
    SET settings = settings || p_settings
    WHERE id = p_clinic_id
    RETURNING * INTO v_clinic;
    
    RETURN v_clinic;
END;
$$;

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ TABLA CLINICS EXPANDIDA EXITOSAMENTE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 Nuevos campos agregados:';
    RAISE NOTICE '   - Información legal y administrativa';
    RAISE NOTICE '   - Configuración y personalización';
    RAISE NOTICE '   - Horarios de trabajo';
    RAISE NOTICE '   - Servicios y especialidades';
    RAISE NOTICE '   - Información de facturación';
    RAISE NOTICE '🔒 Políticas RLS actualizadas';
    RAISE NOTICE '⚙️  Triggers y funciones helper creadas';
    RAISE NOTICE '===========================================';
END $$;
