-- =====================================================
-- Add INSERT Policy for Profiles Table
-- Fecha: 2025-10-27
-- Descripcion: Permite a los usuarios crear su propio perfil
-- =====================================================

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Crear política de INSERT para profiles
-- Esto permite que los usuarios creen su propio perfil al registrarse
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================





