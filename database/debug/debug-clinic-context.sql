-- =====================================================
-- DEBUG: Verificar exactamente qué ve el ClinicContext
-- Descripción: Simula las consultas exactas que hace ClinicContext
-- =====================================================

-- PASO 1: Simular la consulta exacta del ClinicContext
SELECT 'CONSULTA EXACTA DEL CLINICCONTEXT:' as seccion;

-- Esta es la consulta exacta que hace ClinicContext.tsx línea 74-79
SELECT 
    clinic_id, 
    user_id, 
    role_in_clinic, 
    created_at, 
    status, 
    is_active
FROM public.clinic_user_relationships
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com')  -- CAMBIA EMAIL
  AND status = 'approved'
  AND is_active = true
ORDER BY created_at DESC;

-- PASO 2: Ver TODAS las relaciones del usuario (sin filtros)
SELECT 'TODAS LAS RELACIONES DEL USUARIO:' as seccion;
SELECT 
    clinic_id, 
    user_id, 
    role_in_clinic, 
    created_at, 
    status, 
    is_active,
    approved_at,
    start_date
FROM public.clinic_user_relationships
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com')  -- CAMBIA EMAIL
ORDER BY created_at DESC;

-- PASO 3: Verificar clínicas que deberían ser accesibles
SELECT 'CLÍNICAS ACCESIBLES:' as seccion;
SELECT 
    c.id,
    c.name,
    c.type,
    c.is_active as clinic_active,
    cur.role_in_clinic,
    cur.status as relationship_status,
    cur.is_active as relationship_active
FROM public.clinics c
JOIN public.clinic_user_relationships cur ON c.id = cur.clinic_id
WHERE cur.user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com')  -- CAMBIA EMAIL
ORDER BY cur.created_at DESC;

-- PASO 4: Verificar perfil del usuario
SELECT 'PERFIL DEL USUARIO:' as seccion;
SELECT 
    id,
    full_name,
    email,
    role,
    clinic_id,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'jmyocupicior@gmail.com';  -- CAMBIA EMAIL

-- PASO 5: Verificar función RLS is_user_in_clinic
SELECT 'VERIFICAR FUNCIÓN RLS:' as seccion;
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'is_user_in_clinic'
AND routine_schema = 'public';

-- PASO 6: Test de la función is_user_in_clinic
DO $$
DECLARE
    test_user_id uuid;
    test_clinic_id uuid;
    result boolean;
BEGIN
    -- Obtener IDs para test
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'jmyocupicior@gmail.com';  -- CAMBIA EMAIL
    SELECT clinic_id INTO test_clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = test_user_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_clinic_id IS NOT NULL THEN
        -- Test de la función (esto podría fallar si hay problemas con RLS)
        SELECT is_user_in_clinic(test_clinic_id) INTO result;
        RAISE NOTICE 'Test is_user_in_clinic: %', COALESCE(result::text, 'NULL/ERROR');
    ELSE
        RAISE NOTICE 'No se pueden hacer tests - faltan datos';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en test de función RLS: %', SQLERRM;
END $$;
