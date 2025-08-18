-- =====================================================
-- LIMPIEZA_COMPLETA_RLS.sql
-- Limpieza AGRESIVA de todas las políticas RLS problemáticas
-- =====================================================

-- 1) DESHABILITAR RLS COMPLETAMENTE en todas las tablas
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS deshabilitado en: %', tbl.tablename;
  END LOOP;
END $$;

-- 2) BORRAR TODAS las políticas existentes (sin excepción)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT 
      schemaname,
      tablename,
      policyname
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Política eliminada: % en %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- 3) Verificar que no queden políticas
SELECT 'Políticas restantes:' as info;
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles');

-- 4) Verificar estado RLS
SELECT 'Estado RLS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles');

-- 5) Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'LIMPIEZA COMPLETA REALIZADA';
  RAISE NOTICE 'Todas las políticas RLS han sido eliminadas';
  RAISE NOTICE 'RLS está deshabilitado en todas las tablas';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Ahora puedes:';
  RAISE NOTICE '1) Probar la aplicación sin errores 500';
  RAISE NOTICE '2) Si funciona, aplicar RLS_FIX_FINAL.sql';
  RAISE NOTICE '3) Si no funciona, el problema es de código';
  RAISE NOTICE '===============================================';
END $$;
