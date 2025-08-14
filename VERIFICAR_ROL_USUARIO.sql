-- =====================================================
-- VERIFICAR_ROL_USUARIO.sql
-- Script para verificar el rol del usuario en la clínica
-- =====================================================

-- 1) Verificar usuarios autenticados
SELECT 'Usuarios autenticados:' as info;
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC;

-- 2) Verificar perfiles de usuarios
SELECT 'Perfiles de usuarios:' as info;
SELECT 
  id,
  email,
  role,
  clinic_id,
  created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- 3) Verificar clínicas existentes
SELECT 'Clínicas existentes:' as info;
SELECT 
  id,
  name,
  address,
  created_at
FROM public.clinics 
ORDER BY created_at DESC;

-- 4) Verificar miembros de clínicas
SELECT 'Miembros de clínicas:' as info;
SELECT 
  cm.clinic_id,
  c.name as clinic_name,
  cm.user_id,
  p.email as user_email,
  p.role as profile_role,
  cm.role as membership_role,
  cm.joined_at
FROM public.clinic_members cm
JOIN public.clinics c ON c.id = cm.clinic_id
JOIN public.profiles p ON p.id = cm.user_id
ORDER BY cm.joined_at DESC;

-- 5) Verificar específicamente el usuario "jmyocupicior@gmail.com"
SELECT 'Usuario específico jmyocupicior@gmail.com:' as info;
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

-- 6) Verificar si hay inconsistencias entre profiles.clinic_id y clinic_members
SELECT 'Inconsistencias clinic_id:' as info;
SELECT 
  p.id,
  p.email,
  p.clinic_id as profile_clinic_id,
  cm.clinic_id as membership_clinic_id,
  CASE 
    WHEN p.clinic_id IS NULL AND cm.clinic_id IS NOT NULL THEN 'Perfil sin clinic_id pero tiene membresía'
    WHEN p.clinic_id IS NOT NULL AND cm.clinic_id IS NULL THEN 'Perfil con clinic_id pero sin membresía'
    WHEN p.clinic_id != cm.clinic_id THEN 'clinic_id diferente entre perfil y membresía'
    ELSE 'Consistente'
  END as status
FROM public.profiles p
LEFT JOIN public.clinic_members cm ON cm.user_id = p.id
WHERE p.clinic_id IS NOT NULL OR cm.clinic_id IS NOT NULL;
