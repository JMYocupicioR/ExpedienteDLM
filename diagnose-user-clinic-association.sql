-- =====================================================
-- DIAGNÓSTICO: Verificar Asociación Usuario-Clínica
-- Descripción: Este script verifica por qué un usuario no está asociado a ninguna clínica
-- =====================================================

-- PASO 1: Verificar el usuario actual
SELECT 'INFORMACIÓN DEL USUARIO:' as seccion;
SELECT 
    id as user_id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'jmyocupicior@gmail.com'  -- CAMBIA POR TU EMAIL
LIMIT 1;

-- PASO 2: Verificar perfil del usuario
SELECT 'PERFIL DEL USUARIO:' as seccion;
SELECT 
    id,
    full_name,
    email,
    role,
    clinic_id,
    created_at
FROM public.profiles 
WHERE email = 'jmyocupicior@gmail.com'  -- CAMBIA POR TU EMAIL
LIMIT 1;

-- PASO 3: Verificar relaciones usuario-clínica existentes
SELECT 'RELACIONES USUARIO-CLÍNICA:' as seccion;
SELECT 
    cur.id,
    cur.user_id,
    cur.clinic_id,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    cur.created_at,
    c.name as clinic_name
FROM public.clinic_user_relationships cur
LEFT JOIN public.clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = (
    SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1  -- CAMBIA POR TU EMAIL
);

-- PASO 4: Verificar todas las clínicas disponibles
SELECT 'CLÍNICAS DISPONIBLES:' as seccion;
SELECT 
    id,
    name,
    type,
    is_active,
    created_at
FROM public.clinics 
ORDER BY created_at DESC;

-- PASO 5: Verificar si hay algún problema con RLS
SELECT 'VERIFICACIÓN RLS:' as seccion;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('clinics', 'clinic_user_relationships', 'profiles')
AND schemaname = 'public';

-- PASO 6: Mostrar políticas RLS activas
SELECT 'POLÍTICAS RLS ACTIVAS:' as seccion;
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('clinics', 'clinic_user_relationships', 'profiles')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- PASO 7: Diagnóstico final
SELECT 'DIAGNÓSTICO FINAL:' as seccion;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jmyocupicior@gmail.com') THEN  -- CAMBIA POR TU EMAIL
            'ERROR: Usuario no encontrado en auth.users'
        WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'jmyocupicior@gmail.com') THEN  -- CAMBIA POR TU EMAIL
            'ERROR: Perfil no encontrado en profiles'
        WHEN NOT EXISTS (SELECT 1 FROM public.clinics WHERE is_active = true) THEN
            'ERROR: No hay clínicas activas'
        WHEN NOT EXISTS (
            SELECT 1 FROM public.clinic_user_relationships 
            WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1)  -- CAMBIA POR TU EMAIL
        ) THEN
            'PROBLEMA: Usuario no tiene relaciones con clínicas - ESTE ES EL PROBLEMA'
        WHEN EXISTS (
            SELECT 1 FROM public.clinic_user_relationships 
            WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1)  -- CAMBIA POR TU EMAIL
            AND status = 'pending'
        ) THEN
            'INFO: Usuario tiene solicitudes pendientes de aprobación'
        WHEN EXISTS (
            SELECT 1 FROM public.clinic_user_relationships 
            WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1)  -- CAMBIA POR TU EMAIL
            AND status = 'approved'
            AND is_active = false
        ) THEN
            'PROBLEMA: Usuario aprobado pero relación inactiva'
        ELSE
            'INFO: Todo parece estar correcto - verificar consultas de la aplicación'
    END as diagnostico;
