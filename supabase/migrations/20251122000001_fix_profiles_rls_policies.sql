-- =====================================================
-- FIX: Políticas RLS de Profiles para Médicos Independientes
-- Fecha: 2025-11-22
-- Descripción: Corrige las políticas RLS de la tabla profiles
-- para permitir que los usuarios lean y actualicen su propio
-- perfil correctamente.
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar Políticas Antiguas
-- =====================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- =====================================================
-- PASO 2: Crear Políticas RLS Actualizadas
-- =====================================================

-- POLÍTICA SELECT: Permitir a los usuarios leer su propio perfil
-- Esta política es crítica para que la aplicación cargue correctamente
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- POLÍTICA UPDATE: Permitir a los usuarios actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLÍTICA INSERT: Permitir crear perfil solo durante el registro
-- Nota: Normalmente el perfil se crea automáticamente vía trigger
-- pero mantenemos esta política por seguridad
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- =====================================================
-- PASO 3: Asegurar que RLS está habilitado
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 4: Comentarios de Documentación
-- =====================================================

COMMENT ON POLICY "profiles_select_own" ON public.profiles IS
'Permite a los usuarios autenticados leer su propio perfil';

COMMENT ON POLICY "profiles_update_own" ON public.profiles IS
'Permite a los usuarios autenticados actualizar su propio perfil';

COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS
'Permite crear perfil solo para el usuario autenticado (usado por el trigger de auto-creación)';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
