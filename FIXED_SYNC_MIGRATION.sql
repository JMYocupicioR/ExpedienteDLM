-- MIGRACIÓN CORREGIDA: SINCRONIZACIÓN AUTH.USERS Y PROFILES
-- =====================================================
-- Esta versión maneja duplicados existentes

-- 1. Primero, verificar qué perfiles ya existen
SELECT 'Perfiles existentes antes de la migración:' as info;
SELECT email, id, created_at FROM public.profiles ORDER BY created_at;

-- 2. Crear función que maneja nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Usar INSERT ... ON CONFLICT para evitar duplicados
  INSERT INTO public.profiles (
    id, email, full_name, role, is_active, profile_completed, created_at, updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    'doctor', 
    true, 
    false, 
    NOW(), 
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW(),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger en auth.users (solo si no existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Sincronizar usuarios existentes de auth.users que no están en profiles
-- Usando ON CONFLICT para manejar duplicados
INSERT INTO public.profiles (
  id, email, full_name, role, is_active, profile_completed, created_at, updated_at
)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'doctor', 
  true, 
  false, 
  au.created_at, 
  NOW()
FROM auth.users au
WHERE au.email IS NOT NULL
  AND au.email NOT IN (SELECT email FROM public.profiles WHERE email IS NOT NULL)
ON CONFLICT (email) DO UPDATE SET
  updated_at = NOW(),
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- 5. Actualizar perfiles existentes con IDs de auth.users si es necesario
UPDATE public.profiles 
SET id = au.id, updated_at = NOW()
FROM auth.users au 
WHERE profiles.email = au.email 
  AND profiles.id != au.id;

-- 6. Simplificar políticas RLS
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Asegurar que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Verificar resultados
SELECT 'Verificación post-migración:' as info;

-- Contar usuarios en auth vs profiles
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

-- Mostrar todos los perfiles después de la migración
SELECT 'Perfiles sincronizados:' as info;
SELECT 
  email, 
  full_name, 
  role, 
  is_active,
  profile_completed,
  created_at
FROM public.profiles 
ORDER BY created_at;
