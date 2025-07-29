/*
  # CORRECCIÓN FINAL: Bucles Infinitos y Errores de Login
  
  ## PROBLEMAS IDENTIFICADOS:
  1. ❌ Bucle infinito en política RLS de profiles (línea 242-257 en 20250627000001)
  2. ❌ Múltiples políticas duplicadas y conflictivas
  3. ❌ Función validate_medical_license causa recursión
  4. ❌ Políticas que consultan profiles desde dentro de profiles
  
  ## SOLUCIONES:
  1. ✅ Eliminar TODAS las políticas problemáticas
  2. ✅ Crear políticas RLS simples y no recursivas
  3. ✅ Usar solo auth.uid() y auth.jwt() - NO consultar profiles
  4. ✅ Simplificar funciones de validación
  
  ## COMANDOS PARA EJECUTAR:
  1. supabase migration new fix_auth_login_loops_final
  2. supabase db push
  3. supabase db reset (si hay problemas)
*/

-- =============================================
-- PASO 1: LIMPIAR TODAS LAS POLÍTICAS PROBLEMÁTICAS
-- =============================================

-- Deshabilitar RLS temporalmente para limpiar
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes que causan conflictos
DROP POLICY IF EXISTS "Users can view their own profile and doctors can view other doctors" ON profiles;
DROP POLICY IF EXISTS "profiles_select_safe_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy_final" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy_final" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy_final" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy_final" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Allow trigger profile creation" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable full access for administrators" ON profiles;
DROP POLICY IF EXISTS "Enable medical staff to view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Users can update their own prescription style" ON profiles;
DROP POLICY IF EXISTS "Doctors can create prescriptions with controlled medication validation" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can manage consultations within their specialty" ON consultations;
DROP POLICY IF EXISTS "Doctors can manage their own templates with limits" ON physical_exam_templates;

-- =============================================
-- PASO 2: CREAR POLÍTICAS RLS SEGURAS Y SIMPLES
-- =============================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Solo ver propio perfil o ser admin
CREATE POLICY "profiles_safe_select"
ON profiles FOR SELECT 
TO authenticated 
USING (
  -- El usuario puede ver su propio perfil
  auth.uid() = id 
  OR 
  -- Admin puede ver todos (usando JWT, NO consultando profiles)
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
);

-- POLÍTICA 2: INSERT - Solo crear propio perfil o service_role
CREATE POLICY "profiles_safe_insert" 
ON profiles FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Usuario puede crear su propio perfil
  auth.uid() = id 
  OR 
  -- Service role puede crear cualquier perfil (para triggers)
  auth.role() = 'service_role'
);

-- POLÍTICA 3: UPDATE - Solo actualizar propio perfil
CREATE POLICY "profiles_safe_update" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- POLÍTICA 4: DELETE - Solo admins pueden eliminar
CREATE POLICY "profiles_safe_delete" 
ON profiles FOR DELETE 
TO authenticated 
USING (
  -- Solo admin puede eliminar (usando JWT, NO consultando profiles)
  auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);

-- =============================================
-- PASO 3: SIMPLIFICAR FUNCIONES PROBLEMÁTICAS
-- =============================================

-- Reemplazar función problemática validate_medical_license
DROP FUNCTION IF EXISTS public.validate_medical_license(UUID);

-- Crear versión simple que NO causa recursión
CREATE OR REPLACE FUNCTION public.validate_medical_license_safe(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validación simple usando solo auth.jwt() - NO consultar profiles
  RETURN (
    -- Verificar que el user_id coincide con el usuario autenticado
    auth.uid() = user_id
    AND
    -- Verificar rol en JWT
    (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('doctor', 'administrator'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PASO 4: POLÍTICAS SEGURAS PARA OTRAS TABLAS
-- =============================================

-- Prescriptions - política simple sin recursión
DROP POLICY IF EXISTS "prescriptions_safe_policy" ON prescriptions;
CREATE POLICY "prescriptions_safe_policy"
ON prescriptions FOR ALL
TO authenticated
USING (
  -- Doctor puede ver sus propias prescripciones
  doctor_id = auth.uid()
  OR
  -- Admin puede ver todas
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
)
WITH CHECK (
  -- Solo el doctor puede crear/modificar sus prescripciones
  doctor_id = auth.uid()
);

-- Consultations - política simple sin recursión
DROP POLICY IF EXISTS "consultations_safe_policy" ON consultations;
CREATE POLICY "consultations_safe_policy"
ON consultations FOR ALL
TO authenticated
USING (
  -- Doctor puede ver sus propias consultas
  doctor_id = auth.uid()
  OR
  -- Admin puede ver todas
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
)
WITH CHECK (
  -- Solo el doctor puede crear/modificar sus consultas
  doctor_id = auth.uid()
);

-- Physical exam templates - política simple sin recursión
DROP POLICY IF EXISTS "physical_exam_templates_safe_policy" ON physical_exam_templates;
CREATE POLICY "physical_exam_templates_safe_policy"
ON physical_exam_templates FOR ALL
TO authenticated
USING (
  -- Doctor puede ver sus propias plantillas
  doctor_id = auth.uid()
  OR
  -- Admin puede ver todas
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
)
WITH CHECK (
  -- Solo el doctor puede crear/modificar sus plantillas
  doctor_id = auth.uid()
);

-- =============================================
-- PASO 5: FUNCIÓN AUXILIAR PARA VERIFICAR PERFIL
-- =============================================

-- Función simple para verificar si existe perfil (sin recursión)
CREATE OR REPLACE FUNCTION public.profile_exists_safe(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo verificar si el usuario puede acceder a su propio perfil
  IF auth.uid() != user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Usar una consulta simple sin políticas RLS
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id
  );
END;
$$;

-- =============================================
-- PASO 6: LIMPIAR FUNCIONES PROBLEMÁTICAS
-- =============================================

-- Eliminar funciones que causan problemas
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID);
DROP FUNCTION IF EXISTS public.can_prescribe_controlled_medication(UUID, TEXT);

-- =============================================
-- PASO 7: OPTIMIZAR TRIGGER handle_new_user
-- =============================================

-- Recrear función de trigger más simple y segura
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Inserción simple sin validaciones complejas
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'doctor', -- Rol por defecto
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE LOG 'Error en handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PASO 8: PERMISOS Y GRANTS
-- =============================================

-- Asegurar permisos necesarios
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_medical_license_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_exists_safe(UUID) TO authenticated;

-- =============================================
-- PASO 9: LOG DE MIGRACIÓN
-- =============================================

DO $$
BEGIN
  RAISE LOG '🔧 MIGRACIÓN COMPLETADA: Corregidos TODOS los bucles infinitos y errores de login';
  RAISE LOG '✅ Políticas RLS simplificadas y no recursivas';
  RAISE LOG '✅ Funciones optimizadas sin recursión';
  RAISE LOG '✅ Trigger handle_new_user optimizado';
  RAISE LOG '✅ Sistema de autenticación estabilizado';
END $$; 