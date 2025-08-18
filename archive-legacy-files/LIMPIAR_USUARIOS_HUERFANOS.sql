-- =====================================================
-- LIMPIAR_USUARIOS_HUERFANOS.sql
-- Script para limpiar usuarios que quedaron sin completar registro
-- =====================================================

-- 1) Verificar usuarios en auth.users que no tienen perfil completo
SELECT 'USUARIOS EN AUTH.USERS SIN PERFIL COMPLETO:' as info;

-- Esta consulta solo mostrará información, no eliminará nada
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
ORDER BY au.created_at DESC;

-- 2) Mostrar usuarios recientes (últimas 24 horas) para revisar
SELECT 'USUARIOS CREADOS EN LAS ÚLTIMAS 24 HORAS:' as info;

SELECT 
  au.id,
  au.email,
  au.created_at,
  p.profile_completed,
  p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;

-- 3) Contar usuarios por estado
SELECT 'RESUMEN DE USUARIOS POR ESTADO:' as info;

SELECT 
  CASE 
    WHEN p.id IS NULL THEN 'Sin perfil'
    WHEN p.profile_completed = false OR p.profile_completed IS NULL THEN 'Perfil incompleto'
    ELSE 'Perfil completo'
  END as estado,
  COUNT(*) as cantidad
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
GROUP BY 
  CASE 
    WHEN p.id IS NULL THEN 'Sin perfil'
    WHEN p.profile_completed = false OR p.profile_completed IS NULL THEN 'Perfil incompleto'
    ELSE 'Perfil completo'
  END
ORDER BY cantidad DESC;

-- 4) OPCIONAL: Comandos para limpiar usuarios huérfanos (COMENTADOS POR SEGURIDAD)
-- SOLO ejecutar si estás seguro de que quieres eliminar usuarios incompletos

/*
-- ADVERTENCIA: Estos comandos ELIMINARÁN usuarios sin perfil o con perfil incompleto
-- Solo descomenta y ejecuta si estás seguro

-- Eliminar perfiles incompletos
DELETE FROM public.profiles 
WHERE profile_completed = false 
  OR profile_completed IS NULL
  OR full_name IS NULL 
  OR full_name = '';

-- Nota: Los usuarios en auth.users se eliminarán automáticamente 
-- cuando se eliminen sus perfiles debido a las políticas CASCADE
*/

-- 5) Verificar integridad después de la limpieza (si se ejecutó)
SELECT 'VERIFICACIÓN FINAL:' as info;

SELECT 
  COUNT(*) as total_users_auth,
  (SELECT COUNT(*) FROM public.profiles WHERE profile_completed = true) as profiles_completos,
  (SELECT COUNT(*) FROM public.profiles WHERE profile_completed = false OR profile_completed IS NULL) as profiles_incompletos
FROM auth.users;

-- 6) Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'REVISIÓN DE USUARIOS COMPLETADA';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Este script solo MUESTRA información.';
  RAISE NOTICE 'Para limpiar usuarios huérfanos, descomenta';
  RAISE NOTICE 'los comandos DELETE en la sección 4.';
  RAISE NOTICE '===============================================';
END $$;
