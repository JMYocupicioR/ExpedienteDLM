-- =====================================================
-- CORREGIR_ROL_ADMIN.sql
-- Script para corregir el rol del usuario a admin
-- =====================================================

-- 1) Verificar el estado actual antes de corregir
SELECT 'ESTADO ACTUAL ANTES DE CORREGIR:' as info;

SELECT 'Usuario jmyocupicior@gmail.com:' as info;
SELECT 
  p.id,
  p.email,
  p.role as profile_role,
  p.clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 2) CORREGIR: Actualizar el rol en clinic_members a 'admin'
UPDATE public.clinic_members 
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'jmyocupicior@gmail.com'
)
AND clinic_id IN (
  SELECT clinic_id FROM public.clinic_members 
  WHERE user_id IN (SELECT id FROM public.profiles WHERE email = 'jmyocupicior@gmail.com')
);

-- 3) CORREGIR: Asegurar que el perfil tenga clinic_id
UPDATE public.profiles 
SET clinic_id = (
  SELECT clinic_id FROM public.clinic_members 
  WHERE user_id = profiles.id 
  LIMIT 1
)
WHERE email = 'jmyocupicior@gmail.com' 
AND clinic_id IS NULL;

-- 4) Verificar el estado después de corregir
SELECT 'ESTADO DESPUÉS DE CORREGIR:' as info;

SELECT 'Usuario jmyocupicior@gmail.com:' as info;
SELECT 
  p.id,
  p.email,
  p.role as profile_role,
  p.clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 5) Verificar que el usuario ahora sea admin
SELECT 'Verificación final - Usuario debe ser admin:' as info;
SELECT 
  CASE 
    WHEN cm.role = 'admin' THEN '✅ USUARIO ES ADMIN'
    ELSE '❌ USUARIO NO ES ADMIN'
  END as status,
  p.email,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
JOIN public.clinic_members cm ON cm.user_id = p.id
JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 6) Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'CORRECCIÓN DE ROL COMPLETADA';
  RAISE NOTICE 'El usuario jmyocupicior@gmail.com ahora es admin';
  RAISE NOTICE 'Puede acceder a /clinic/settings';
  RAISE NOTICE '===============================================';
END $$;
