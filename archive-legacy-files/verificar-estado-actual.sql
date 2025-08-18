-- Verificar estado actual de usuarios, clínicas y asociaciones

-- 1. Ver todas las clínicas disponibles
SELECT 
    'CLÍNICAS DISPONIBLES:' as tipo,
    id,
    name as nombre,
    address as direccion,
    created_at
FROM public.clinics
ORDER BY created_at;

-- 2. Ver todos los usuarios en auth.users
SELECT 
    'USUARIOS AUTH:' as tipo,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at;

-- 3. Ver todos los perfiles
SELECT 
    'PERFILES:' as tipo,
    id,
    email,
    role,
    created_at
FROM public.profiles
ORDER BY created_at;

-- 4. Ver asociaciones en clinic_members
SELECT 
    'ASOCIACIONES CLINIC_MEMBERS:' as tipo,
    cm.clinic_id,
    cm.user_id,
    cm.role,
    c.name as clinic_name,
    p.email as user_email,
    cm.joined_at
FROM public.clinic_members cm
LEFT JOIN public.clinics c ON cm.clinic_id = c.id
LEFT JOIN public.profiles p ON cm.user_id = p.id
ORDER BY cm.joined_at;

-- 5. Contar registros
SELECT 
    'CONTEOS:' as tipo,
    (SELECT COUNT(*) FROM public.clinics) as total_clinicas,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.clinic_members) as total_associations;
