-- =====================================================
-- DIAGNOSTICAR_EMAIL_DUPLICADO.sql
-- Script para diagnosticar el problema de email duplicado
-- =====================================================

-- 1) Verificar el email específico que está causando problemas
SELECT 'VERIFICACIÓN DEL EMAIL PROBLEMA:' as info;

-- Cambiar por el email que está causando problemas
DO $$
DECLARE
    email_problema TEXT := '1@test.com'; -- Cambia este email por el que está fallando
BEGIN
    RAISE NOTICE 'Verificando email: %', email_problema;
    
    -- Verificar en auth.users
    PERFORM 1 FROM auth.users WHERE email = email_problema;
    IF FOUND THEN
        RAISE NOTICE '❌ ENCONTRADO EN AUTH.USERS: %', email_problema;
    ELSE
        RAISE NOTICE '✅ NO ENCONTRADO EN AUTH.USERS: %', email_problema;
    END IF;
    
    -- Verificar en profiles
    PERFORM 1 FROM public.profiles WHERE email = email_problema;
    IF FOUND THEN
        RAISE NOTICE '❌ ENCONTRADO EN PROFILES: %', email_problema;
    ELSE
        RAISE NOTICE '✅ NO ENCONTRADO EN PROFILES: %', email_problema;
    END IF;
END $$;

-- 2) Mostrar usuarios en auth.users sin perfil completo
SELECT 'USUARIOS EN AUTH.USERS SIN PERFIL COMPLETO:' as info;

SELECT 
  au.id,
  au.email,
  au.created_at,
  p.profile_completed,
  p.full_name,
  CASE 
    WHEN p.id IS NULL THEN '❌ SIN PERFIL'
    WHEN p.profile_completed = false OR p.profile_completed IS NULL THEN '⚠️ PERFIL INCOMPLETO'
    ELSE '✅ PERFIL COMPLETO'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE 
  p.id IS NULL 
  OR p.profile_completed = false 
  OR p.profile_completed IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- 3) Buscar duplicados de email
SELECT 'EMAILS DUPLICADOS:' as info;

-- En auth.users
SELECT 
  email,
  COUNT(*) as cantidad
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- En profiles  
SELECT 
  email,
  COUNT(*) as cantidad
FROM public.profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 4) Verificar usuarios recientes (últimas 2 horas)
SELECT 'USUARIOS CREADOS EN LAS ÚLTIMAS 2 HORAS:' as info;

SELECT 
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  p.profile_completed,
  p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.created_at > NOW() - INTERVAL '2 hours'
ORDER BY au.created_at DESC;

-- 5) Mostrar el estado actual del email problema
SELECT 'ESTADO DETALLADO DEL EMAIL PROBLEMA:' as info;

-- Cambiar por el email que está causando problemas
WITH email_check AS (
  SELECT '1@test.com' as target_email -- Cambia este email
)
SELECT 
  'AUTH.USERS' as tabla,
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  au.last_sign_in_at,
  NULL::text as profile_completed,
  NULL::text as full_name
FROM auth.users au, email_check ec
WHERE au.email = ec.target_email

UNION ALL

SELECT 
  'PROFILES' as tabla,
  p.id,
  p.email,
  p.created_at,
  NULL::timestamptz as email_confirmed_at,
  NULL::timestamptz as last_sign_in_at,
  p.profile_completed::text,
  p.full_name
FROM public.profiles p, email_check ec
WHERE p.email = ec.target_email;
