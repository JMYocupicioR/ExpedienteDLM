-- =====================================================
-- CORREGIR_ROL_PERFIL.sql
-- Script para corregir el rol del perfil del usuario
-- =====================================================

-- 1) Verificar el estado actual ANTES de corregir
SELECT 'ESTADO ACTUAL ANTES DE CORREGIR:' as info;

SELECT 
  'Usuario jmyocupicior@gmail.com - Estado actual:' as info,
  p.email,
  p.role as profile_role,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 2) CORREGIR: Actualizar el rol del perfil a 'admin' para que coincida
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'jmyocupicior@gmail.com';

-- 3) Verificar el estado DESPUÉS de corregir
SELECT 'ESTADO DESPUÉS DE CORREGIR:' as info;

SELECT 
  'Usuario jmyocupicior@gmail.com - Estado corregido:' as info,
  p.email,
  p.role as profile_role,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 4) Verificación final
SELECT 'VERIFICACIÓN FINAL:' as info;
SELECT 
  CASE 
    WHEN p.role = 'admin' THEN '✅ PERFIL ES ADMIN'
    ELSE '❌ PERFIL NO ES ADMIN'
  END as profile_admin_status,
  CASE 
    WHEN cm.role = 'admin' THEN '✅ MEMBRESÍA ES ADMIN'
    ELSE '❌ MEMBRESÍA NO ES ADMIN'
  END as membership_admin_status,
  CASE 
    WHEN p.clinic_id = cm.clinic_id THEN '✅ CLÍNICAS SINCRONIZADAS'
    ELSE '❌ CLÍNICAS NO SINCRONIZADAS'
  END as clinic_sync_status,
  p.email,
  p.role as profile_role,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
JOIN public.clinic_members cm ON cm.user_id = p.id
JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 5) Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'CORRECCIÓN DE ROL COMPLETADA';
  RAISE NOTICE 'El usuario jmyocupicior@gmail.com ahora:';
  RAISE NOTICE '- Tiene rol "admin" en el perfil';
  RAISE NOTICE '- Tiene rol "admin" en la membresía';
  RAISE NOTICE '- Puede acceder a /clinic/settings';
  RAISE NOTICE '===============================================';
END $$;
