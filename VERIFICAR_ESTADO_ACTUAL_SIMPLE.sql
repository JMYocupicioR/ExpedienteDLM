-- =====================================================
-- VERIFICAR_ESTADO_ACTUAL_SIMPLE.sql
-- Verificación rápida del estado del usuario
-- =====================================================

-- Verificar el usuario jmyocupicior@gmail.com
SELECT 
  'Estado del usuario:' as info,
  p.email,
  p.role as profile_role,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name,
  CASE 
    WHEN p.clinic_id = cm.clinic_id THEN '✅ SINCRONIZADO'
    ELSE '❌ NO SINCRONIZADO'
  END as sync_status,
  CASE 
    WHEN cm.role = 'admin' THEN '✅ ES ADMIN'
    ELSE '❌ NO ES ADMIN'
  END as admin_status
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- Verificar si hay políticas RLS que puedan estar bloqueando
SELECT 
  'Políticas RLS activas:' as info,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clinics', 'clinic_members', 'profiles')
ORDER BY tablename, policyname;
