-- =====================================================
-- VERIFICAR_ESTADO_ACTUAL.sql
-- Script para diagnosticar el estado actual de la BD
-- =====================================================

-- 1) Verificar si las tablas existen
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles');

-- 2) Verificar si RLS está habilitado en las tablas
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles');

-- 3) Verificar políticas RLS existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clinics', 'clinic_members', 'clinic_user_relationships', 'profiles')
ORDER BY tablename, policyname;

-- 4) Verificar datos en las tablas principales
SELECT 'clinics' as table_name, COUNT(*) as record_count FROM public.clinics
UNION ALL
SELECT 'clinic_members' as table_name, COUNT(*) as record_count FROM public.clinic_members
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM public.profiles;

-- 5) Verificar estructura de clinic_members
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'clinic_members'
ORDER BY ordinal_position;

-- 6) Verificar estructura de clinics
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'clinics'
ORDER BY ordinal_position;

-- 7) Verificar si hay datos de ejemplo
SELECT 'Sample clinics:' as info;
SELECT id, name, address, created_at FROM public.clinics LIMIT 5;

SELECT 'Sample clinic_members:' as info;
SELECT clinic_id, user_id, role, joined_at FROM public.clinic_members LIMIT 5;

-- 8) Verificar si hay usuarios autenticados
SELECT 'Auth users count:' as info;
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 9) Verificar si hay perfiles
SELECT 'Sample profiles:' as info;
SELECT id, email, role, clinic_id FROM public.profiles LIMIT 5;
