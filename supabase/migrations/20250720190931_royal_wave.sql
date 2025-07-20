/*
  MIGRACIÓN 3: CONSOLIDAR Y LIMPIAR POLÍTICAS RLS PARA LA TABLA `profiles`

  - Problema: Múltiples migraciones crearon y modificaron políticas RLS, dejando
    un estado final confuso y difícil de mantener.
  - Solución: Esta migración elimina explícitamente TODAS las políticas RLS
    de la tabla `profiles` que se han creado a lo largo del tiempo y establece
    un único conjunto de políticas definitivas, seguras y no recursivas.
*/

-- 1. Eliminar TODAS las políticas RLS antiguas, intermedias y con nombres confusos.
-- Esto limpia el estado y nos permite empezar de cero con las reglas correctas.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Administrators can modify all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users to own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable full access for administrators" ON public.profiles;
DROP POLICY IF EXISTS "Enable medical staff to view other medical staff" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for administrators" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy_fixed" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy_fixed" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy_fixed" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy_fixed" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_safe_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy_final" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy_final" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy_final" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy_final" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile and doctors can view other doctors" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own prescription style" ON public.profiles;

-- 2. Crear el conjunto final y definitivo de políticas RLS para `profiles`.
-- Estas políticas son seguras, no recursivas y cubren todos los casos de uso necesarios.

-- POLÍTICA DE SELECCIÓN (SELECT):
-- Permite a los usuarios ver su propio perfil.
-- Permite a administradores, doctores y enfermeros ver perfiles (usando metadatos seguros).
CREATE POLICY "ALLOW_SELECT_PROFILES"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Los usuarios siempre pueden ver su propio perfil
  auth.uid() = id
  OR
  -- Los roles privilegiados pueden ver perfiles (comprobación segura, no recursiva)
  (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('administrator', 'doctor', 'nurse'))
);

-- POLÍTICA DE INSERCIÓN (INSERT):
-- Permite a los usuarios crear su propio perfil.
-- Permite al `service_role` (usado por el trigger `handle_new_user`) crear perfiles.
CREATE POLICY "ALLOW_INSERT_PROFILES"
ON public.profiles FOR INSERT
TO authenticated, service_role
WITH CHECK (
  auth.uid() = id
  OR
  auth.role() = 'service_role'
);

-- POLÍTICA DE ACTUALIZACIÓN (UPDATE):
-- Permite a los usuarios actualizar únicamente su propio perfil.
CREATE POLICY "ALLOW_UPDATE_OWN_PROFILE"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- POLÍTICA DE ELIMINACIÓN (DELETE):
-- Permite a los administradores eliminar perfiles.
CREATE POLICY "ALLOW_DELETE_ADMIN_ONLY"
ON public.profiles FOR DELETE
TO authenticated
USING (
  -- Solo los administradores pueden eliminar (comprobación segura, no recursiva)
  auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
);


DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN 3 COMPLETADA: Políticas RLS de `profiles` limpiadas y consolidadas.';
END $$;