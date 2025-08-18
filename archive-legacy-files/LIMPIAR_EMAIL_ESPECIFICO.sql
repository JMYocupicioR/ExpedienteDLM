-- =====================================================
-- LIMPIAR_EMAIL_ESPECIFICO.sql
-- Script para limpiar un email específico que está causando problemas
-- =====================================================

-- ⚠️  IMPORTANTE: Cambia '1@test.com' por el email que está causando problemas
DO $$
DECLARE
    email_problema TEXT := '1@test.com'; -- 🔴 CAMBIAR ESTE EMAIL
    user_record RECORD;
    profile_record RECORD;
BEGIN
    RAISE NOTICE '🔍 Iniciando limpieza para email: %', email_problema;
    
    -- 1) Verificar y mostrar el estado actual
    RAISE NOTICE '================================';
    RAISE NOTICE 'ESTADO ACTUAL:';
    RAISE NOTICE '================================';
    
    -- Verificar en auth.users
    SELECT INTO user_record 
        id, email, created_at, email_confirmed_at, last_sign_in_at
    FROM auth.users 
    WHERE email = email_problema;
    
    IF FOUND THEN
        RAISE NOTICE '❌ ENCONTRADO EN AUTH.USERS:';
        RAISE NOTICE '   ID: %', user_record.id;
        RAISE NOTICE '   Email: %', user_record.email;
        RAISE NOTICE '   Creado: %', user_record.created_at;
        RAISE NOTICE '   Email confirmado: %', user_record.email_confirmed_at;
        RAISE NOTICE '   Último login: %', user_record.last_sign_in_at;
    ELSE
        RAISE NOTICE '✅ NO ENCONTRADO EN AUTH.USERS';
    END IF;
    
    -- Verificar en profiles
    SELECT INTO profile_record 
        id, email, full_name, profile_completed, created_at
    FROM public.profiles 
    WHERE email = email_problema;
    
    IF FOUND THEN
        RAISE NOTICE '❌ ENCONTRADO EN PROFILES:';
        RAISE NOTICE '   ID: %', profile_record.id;
        RAISE NOTICE '   Email: %', profile_record.email;
        RAISE NOTICE '   Nombre: %', COALESCE(profile_record.full_name, 'NULL');
        RAISE NOTICE '   Perfil completado: %', COALESCE(profile_record.profile_completed::text, 'NULL');
        RAISE NOTICE '   Creado: %', profile_record.created_at;
    ELSE
        RAISE NOTICE '✅ NO ENCONTRADO EN PROFILES';
    END IF;
    
    -- 2) Proceder con la limpieza si existe
    IF profile_record.id IS NOT NULL THEN
        RAISE NOTICE '================================';
        RAISE NOTICE 'INICIANDO LIMPIEZA:';
        RAISE NOTICE '================================';
        
        -- Verificar si el perfil está incompleto
        IF profile_record.profile_completed IS NULL OR 
           profile_record.profile_completed = false OR 
           profile_record.full_name IS NULL OR 
           profile_record.full_name = '' THEN
            
            RAISE NOTICE '🧹 Perfil incompleto detectado, eliminando...';
            
            -- Eliminar el perfil (esto debería eliminar el usuario de auth.users por CASCADE)
            DELETE FROM public.profiles WHERE id = profile_record.id;
            
            RAISE NOTICE '✅ PERFIL ELIMINADO EXITOSAMENTE';
            RAISE NOTICE '✅ El usuario en auth.users debería haberse eliminado automáticamente';
            
        ELSE
            RAISE NOTICE '⚠️  PERFIL COMPLETO DETECTADO';
            RAISE NOTICE '⚠️  Este perfil tiene datos completos:';
            RAISE NOTICE '   - Nombre: %', profile_record.full_name;
            RAISE NOTICE '   - Perfil completado: %', profile_record.profile_completed;
            RAISE NOTICE '⚠️  NO SE ELIMINARÁ automáticamente';
            RAISE NOTICE '⚠️  Si estás seguro de que quieres eliminarlo, descomenta las líneas al final de este script';
        END IF;
        
    ELSE
        RAISE NOTICE '✅ NO HAY NADA QUE LIMPIAR - EMAIL NO ENCONTRADO';
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE 'LIMPIEZA COMPLETADA';
    RAISE NOTICE '================================';
    
END $$;

-- 3) Verificación final
SELECT 'VERIFICACIÓN FINAL:' as info;

-- Verificar que el email ya no existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = '1@test.com') THEN '❌ AÚN EN AUTH.USERS'
        ELSE '✅ LIMPIO EN AUTH.USERS'
    END as auth_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = '1@test.com') THEN '❌ AÚN EN PROFILES'
        ELSE '✅ LIMPIO EN PROFILES'
    END as profiles_status;

/*
-- =====================================================
-- ELIMINACIÓN FORZADA (SOLO SI ESTÁS SEGURO)
-- =====================================================
-- Descomenta estas líneas SOLO si quieres eliminar un perfil completo

-- DELETE FROM public.profiles WHERE email = '1@test.com';
-- 
-- NOTA: Esto eliminará TODOS los datos asociados con este email
-- incluyendo consultas, pacientes, etc. ¡USA CON PRECAUCIÓN!

*/
