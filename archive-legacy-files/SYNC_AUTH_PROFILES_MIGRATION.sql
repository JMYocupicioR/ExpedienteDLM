-- =====================================================
-- MIGRACIÓN: SINCRONIZACIÓN AUTH.USERS Y PROFILES
-- =====================================================
-- Esta migración resuelve la sincronización entre auth.users y profiles
-- Crea automáticamente un perfil cuando un usuario se registra

-- 1. Crear función que maneja nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar nuevo perfil automáticamente cuando se crea un usuario
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Usar full_name si existe, sino email
    'doctor', -- Rol por defecto (se puede cambiar en el questionnaire)
    true,
    false, -- Necesitará completar el questionnaire
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sincronizar usuarios existentes que no tienen perfil
-- (Para resolver el problema actual con test@example.com, admin@deepluxmed.com, etc.)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  profile_completed,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'doctor', -- Rol por defecto
  true,
  false, -- Necesitarán completar el questionnaire
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Solo insertar usuarios que no tienen perfil
  AND au.email IS NOT NULL;

-- 4. Simplificar políticas RLS para evitar conflictos circulares
-- Política de inserción más simple
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política de selección
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

-- Política de actualización
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Asegurar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIONES POST-MIGRACIÓN
-- =====================================================

-- Verificar que la función fue creada
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';

-- Verificar que el trigger fue creado
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Verificar sincronización de usuarios existentes
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total_usuarios
FROM auth.users
WHERE email IS NOT NULL

UNION ALL

SELECT 
  'profiles' as tabla,
  COUNT(*) as total_perfiles
FROM public.profiles;

-- Mostrar usuarios sincronizados
SELECT 
  au.email as email_auth_users,
  p.email as email_profiles,
  CASE 
    WHEN p.id IS NULL THEN '❌ Sin perfil'
    ELSE '✅ Sincronizado'
  END as estado
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IS NOT NULL
ORDER BY au.created_at;
