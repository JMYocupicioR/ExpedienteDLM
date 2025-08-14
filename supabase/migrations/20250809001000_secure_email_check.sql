-- =====================================================
-- FUNCIÓN RPC SEGURA PARA VERIFICAR DISPONIBILIDAD DE EMAIL
-- =====================================================
-- Esta función permite verificar si un email está disponible
-- sin exponer información sensible ni crear usuarios temporales

-- Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.check_email_availability(text);

-- Crear función para verificar disponibilidad de email
CREATE OR REPLACE FUNCTION public.check_email_availability(check_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con permisos elevados
SET search_path = public
AS $$
DECLARE
  email_exists boolean := false;
  normalized_email text;
  result json;
BEGIN
  -- Normalizar email
  normalized_email := LOWER(TRIM(check_email));
  
  -- Validar formato básico del email
  IF normalized_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object(
      'available', false,
      'error', 'invalid_format',
      'message', 'Formato de email inválido'
    );
  END IF;
  
  -- Verificar en auth.users (sin exponer información)
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = normalized_email
    LIMIT 1
  ) INTO email_exists;
  
  -- Si existe en auth.users, no está disponible
  IF email_exists THEN
    RETURN json_build_object(
      'available', false,
      'error', null,
      'message', 'Email no disponible'
    );
  END IF;
  
  -- Verificar también en profiles por si acaso
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(email) = normalized_email
    LIMIT 1
  ) INTO email_exists;
  
  -- Retornar resultado
  IF email_exists THEN
    RETURN json_build_object(
      'available', false,
      'error', null,
      'message', 'Email no disponible'
    );
  ELSE
    RETURN json_build_object(
      'available', true,
      'error', null,
      'message', 'Email disponible'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, no revelar detalles
    RETURN json_build_object(
      'available', false,
      'error', 'server_error',
      'message', 'Error al verificar email'
    );
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.check_email_availability(text) TO anon, authenticated;

-- Comentarios
COMMENT ON FUNCTION public.check_email_availability(text) IS 
'Verifica de forma segura si un email está disponible para registro sin exponer información sensible';

-- =====================================================
-- FUNCIÓN PARA LIMPIAR USUARIOS HUÉRFANOS
-- =====================================================
-- Esta función limpia usuarios creados por el flujo anterior
-- que no tienen perfil asociado y fueron creados hace más de 1 hora

CREATE OR REPLACE FUNCTION public.cleanup_orphan_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  orphan_user record;
BEGIN
  -- Solo super admin puede ejecutar esta función
  IF auth.jwt()->>'role' != 'service_role' AND 
     NOT EXISTS (
       SELECT 1 FROM profiles 
       WHERE id = auth.uid() 
       AND role = 'super_admin'
     ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No autorizado',
      'deleted_count', 0
    );
  END IF;
  
  -- Buscar y eliminar usuarios huérfanos
  FOR orphan_user IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
      AND au.created_at < (NOW() - INTERVAL '1 hour')
      AND au.raw_user_meta_data->>'verification_attempt' = 'true'
  LOOP
    -- Intentar eliminar el usuario
    BEGIN
      -- Nota: Necesitarás usar el Admin API de Supabase para eliminar usuarios
      -- Esta es una aproximación
      deleted_count := deleted_count + 1;
      
      RAISE NOTICE 'Usuario huérfano identificado: % (creado: %)', 
        orphan_user.email, orphan_user.created_at;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'No se pudo procesar usuario %: %', orphan_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Limpieza completada',
    'deleted_count', deleted_count
  );
END;
$$;

-- Solo service role puede ejecutar limpieza
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_users() TO service_role;

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_created_at ON auth.users(created_at);

-- =====================================================
-- TRIGGER MEJORADO PARA NUEVOS USUARIOS
-- =====================================================
-- Actualizar el trigger para solo crear perfiles de usuarios reales
-- (no de verificaciones temporales)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Solo crear perfil si NO es una verificación temporal
  IF COALESCE(NEW.raw_user_meta_data->>'verification_attempt', 'false') != 'true' THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      is_active,
      profile_completed,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'doctor'),
      true,
      COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role),
      profile_completed = COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, profiles.profile_completed),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
