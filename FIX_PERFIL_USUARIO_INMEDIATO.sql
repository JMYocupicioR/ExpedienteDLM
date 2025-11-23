-- =====================================================
-- FIX INMEDIATO: Crear Perfil para Usuario Actual
-- Fecha: 2025-10-27
-- Usuario: jmyocupicior@gmail.com
-- ID: 4f4b239c-ae17-47b7-9e0d-13358360cb23
-- =====================================================

-- =====================================================
-- PASO 1: Agregar política de INSERT para profiles
-- =====================================================

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Crear política de INSERT para profiles
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- =====================================================
-- PASO 2: Crear trigger automático para nuevos usuarios
-- =====================================================

-- Eliminar trigger y función si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Crear perfil automáticamente para el nuevo usuario
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'doctor',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger que se ejecuta al crear un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 3: Crear perfiles para TODOS los usuarios existentes sin perfil
-- =====================================================

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'doctor',
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PASO 4: Verificar que el perfil se creó correctamente
-- =====================================================

-- Verificar el perfil del usuario actual
SELECT 
  'VERIFICACIÓN: Perfil creado' as estado,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles 
WHERE id = '4f4b239c-ae17-47b7-9e0d-13358360cb23';

-- Verificar todos los usuarios tienen perfil
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(p.id) as usuarios_con_perfil,
  COUNT(*) - COUNT(p.id) as usuarios_sin_perfil
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id;

-- Listar todos los usuarios y su estado de perfil
SELECT 
  au.id,
  au.email,
  au.created_at as fecha_registro,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ CON PERFIL'
    ELSE '❌ SIN PERFIL'
  END as estado_perfil,
  p.full_name,
  p.role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 
-- 1. Ir a: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/editor
-- 2. Copiar y pegar TODO este script en el editor SQL
-- 3. Hacer clic en "Run" para ejecutar
-- 4. Verificar que aparece el mensaje "VERIFICACIÓN: Perfil creado"
-- 5. Recargar la aplicación web (F5)
-- 6. El perfil debería aparecer correctamente
--
-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
--
-- ✅ Usuario con perfil: jmyocupicior@gmail.com
-- ✅ Política de INSERT creada
-- ✅ Trigger automático activado
-- ✅ Futuros usuarios se crearán automáticamente con perfil
-- ✅ No más errores 401
--
-- =====================================================

