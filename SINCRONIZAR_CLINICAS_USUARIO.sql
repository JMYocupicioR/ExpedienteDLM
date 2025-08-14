-- =====================================================
-- SINCRONIZAR_CLINICAS_USUARIO.sql
-- Script para sincronizar las clínicas del usuario
-- =====================================================

-- 1) Verificar el estado actual ANTES de corregir
SELECT 'ESTADO ACTUAL ANTES DE CORREGIR:' as info;

SELECT 'Usuario jmyocupicior@gmail.com - Estado actual:' as info;
SELECT 
  p.id,
  p.email,
  p.role as profile_role,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c1.name as profile_clinic_name,
  c2.name as membership_clinic_name
FROM public.profiles p
LEFT JOIN public.clinics c1 ON c1.id = p.clinic_id
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
LEFT JOIN public.clinics c2 ON c2.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 2) Verificar qué clínicas existen
SELECT 'Clínicas existentes:' as info;
SELECT 
  id,
  name,
  address,
  created_at
FROM public.clinics 
WHERE id IN (
  '2e1a0ac1-b882-4242-b57f-2cf687645b60',
  '2007d11f-466d-4d91-b01f-9f6d89ed26aa'
)
ORDER BY created_at;

-- 3) DECISIÓN: Usar la clínica de la MEMBRESÍA (más reciente/activa)
-- Actualizar el perfil para que use la misma clínica que la membresía
UPDATE public.profiles 
SET clinic_id = (
  SELECT clinic_id 
  FROM public.clinic_members 
  WHERE user_id = (
    SELECT id FROM public.profiles WHERE email = 'jmyocupicior@gmail.com'
  )
  LIMIT 1
)
WHERE email = 'jmyocupicior@gmail.com';

-- 4) CORREGIR: Establecer rol como 'admin' en clinic_members
UPDATE public.clinic_members 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'jmyocupicior@gmail.com'
);

-- 5) Verificar el estado DESPUÉS de corregir
SELECT 'ESTADO DESPUÉS DE CORREGIR:' as info;

SELECT 'Usuario jmyocupicior@gmail.com - Estado corregido:' as info;
SELECT 
  p.id,
  p.email,
  p.role as profile_role,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
JOIN public.clinic_members cm ON cm.user_id = p.id
JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 6) Verificación final
SELECT 'VERIFICACIÓN FINAL:' as info;
SELECT 
  CASE 
    WHEN p.clinic_id = cm.clinic_id THEN '✅ CLÍNICAS SINCRONIZADAS'
    ELSE '❌ CLÍNICAS NO SINCRONIZADAS'
  END as clinic_sync_status,
  CASE 
    WHEN cm.role = 'admin' THEN '✅ USUARIO ES ADMIN'
    ELSE '❌ USUARIO NO ES ADMIN'
  END as admin_status,
  p.email,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  cm.role as membership_role,
  c.name as clinic_name
FROM public.profiles p
JOIN public.clinic_members cm ON cm.user_id = p.id
JOIN public.clinics c ON c.id = cm.clinic_id
WHERE p.email = 'jmyocupicior@gmail.com';

-- 7) Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'SINCRONIZACIÓN COMPLETADA';
  RAISE NOTICE 'El usuario jmyocupicior@gmail.com ahora:';
  RAISE NOTICE '- Tiene clínicas sincronizadas';
  RAISE NOTICE '- Es admin de la clínica';
  RAISE NOTICE '- Puede acceder a /clinic/settings';
  RAISE NOTICE '===============================================';
END $$;
