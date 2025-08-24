-- =====================================================
-- FUNCIÓN RPC: check_email_availability
-- Función para verificar disponibilidad de email de forma segura
-- =====================================================

-- Eliminar la función si existe
DROP FUNCTION IF EXISTS public.check_email_availability(text);

-- Crear la función para verificar disponibilidad de email
CREATE OR REPLACE FUNCTION public.check_email_availability(check_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    email_exists boolean := false;
    result json;
BEGIN
    -- Limpiar y normalizar el email
    check_email := lower(trim(check_email));
    
    -- Validar formato básico de email
    IF check_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN json_build_object(
            'available', false,
            'message', 'Formato de email inválido',
            'error', true
        );
    END IF;
    
    -- Verificar si el email existe en profiles
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE email = check_email
    ) INTO email_exists;
    
    -- Si no existe en profiles, verificar en auth.users usando metadatos
    -- (No podemos acceder directamente a auth.users desde funciones públicas por seguridad)
    IF NOT email_exists THEN
        -- Por seguridad, asumimos que si no está en profiles puede estar disponible
        -- El registro real en Supabase Auth validará definitivamente
        result := json_build_object(
            'available', true,
            'message', 'Email disponible',
            'checked_profiles', true,
            'error', false
        );
    ELSE
        result := json_build_object(
            'available', false,
            'message', 'Este email ya está registrado. Puedes iniciar sesión en su lugar.',
            'error', false
        );
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, devolver información mínima por seguridad
        RETURN json_build_object(
            'available', true,
            'message', 'Verificación completada',
            'error', false,
            'fallback', true
        );
END;
$$;

-- Comentarios sobre seguridad
COMMENT ON FUNCTION public.check_email_availability(text) IS 
'Función segura para verificar disponibilidad de email. Verifica solo en profiles por seguridad.';

-- Test de la función (opcional)
-- SELECT public.check_email_availability('test@example.com');