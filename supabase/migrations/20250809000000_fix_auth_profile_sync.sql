-- =====================================================
-- MIGRACIÓN: SINCRONIZACIÓN AUTOMÁTICA AUTH.USERS Y PROFILES
-- =====================================================
-- Esta migración asegura que se cree automáticamente un perfil
-- cuando un usuario se registra

-- 1. Eliminar triggers antiguos si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Crear función mejorada para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER 
SET search_path = public
AS $$
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), -- Usar full_name o parte del email
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor'), -- Rol del metadata o doctor por defecto
    true,
    false, -- Necesitará completar el cuestionario
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Si el perfil ya existe, actualizar email y metadata
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Registrar el error pero no fallar la creación del usuario
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Sincronizar usuarios existentes que no tienen perfil
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
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_app_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(
    au.raw_user_meta_data->>'role',
    au.raw_app_meta_data->>'role',
    'doctor'
  ),
  CASE 
    WHEN au.confirmed_at IS NOT NULL THEN true
    ELSE false
  END,
  false, -- profile_completed
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Actualizar políticas RLS para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Política para ver perfiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('doctor', 'admin_staff', 'super_admin')
    )
  );

-- Política para actualizar perfil propio
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para insertar perfiles (solo durante registro)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política para service role
CREATE POLICY "Service role bypass" ON profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 6. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON profiles(clinic_id);

-- 7. Verificar integridad
DO $$
DECLARE
  orphan_users INTEGER;
  orphan_profiles INTEGER;
BEGIN
  -- Contar usuarios sin perfil
  SELECT COUNT(*) INTO orphan_users
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  -- Contar perfiles sin usuario
  SELECT COUNT(*) INTO orphan_profiles
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE au.id IS NULL;
  
  IF orphan_users > 0 THEN
    RAISE WARNING 'Hay % usuarios sin perfil asociado', orphan_users;
  END IF;
  
  IF orphan_profiles > 0 THEN
    RAISE WARNING 'Hay % perfiles sin usuario asociado', orphan_profiles;
  END IF;
  
  RAISE NOTICE 'Migración completada. Usuarios sin perfil: %, Perfiles sin usuario: %', 
    orphan_users, orphan_profiles;
END $$;
