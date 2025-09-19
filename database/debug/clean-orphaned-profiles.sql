-- Script para limpiar perfiles huérfanos y datos inconsistentes
-- ADVERTENCIA: Este script elimina datos. Hacer backup antes de ejecutar.

BEGIN;

-- 1. Mostrar perfiles huérfanos antes de limpiar
SELECT 
    'Perfiles huérfanos (sin usuario en auth.users)' as tipo,
    COUNT(*) as cantidad
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 2. Mostrar algunos ejemplos de perfiles huérfanos
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Eliminar configuraciones médicas huérfanas
DELETE FROM medical_practice_settings
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- 4. Eliminar citas de usuarios que ya no existen
DELETE FROM appointments
WHERE doctor_id NOT IN (
    SELECT id FROM auth.users
);

-- 5. Eliminar notificaciones de usuarios que ya no existen
DELETE FROM notifications
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- 6. Eliminar registros de auditoría de usuarios que ya no existen
DELETE FROM audit_logs
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- 7. Eliminar relaciones de clínica de usuarios que ya no existen
DELETE FROM clinic_user_relationships
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- 8. OPCIONAL: Eliminar perfiles huérfanos
-- DESCOMENTA LA SIGUIENTE LÍNEA SOLO SI ESTÁS SEGURO
-- DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- 9. Mostrar estadísticas después de la limpieza
SELECT 
    'Configuraciones médicas' as tabla,
    COUNT(*) as registros_restantes
FROM medical_practice_settings

UNION ALL

SELECT 
    'Citas' as tabla,
    COUNT(*) as registros_restantes
FROM appointments

UNION ALL

SELECT 
    'Notificaciones' as tabla,
    COUNT(*) as registros_restantes
FROM notifications

UNION ALL

SELECT 
    'Perfiles' as tabla,
    COUNT(*) as registros_restantes
FROM profiles

UNION ALL

SELECT 
    'Usuarios auth' as tabla,
    COUNT(*) as registros_restantes
FROM auth.users;

-- 10. Verificar integridad después de la limpieza
SELECT 
    'Perfiles con usuarios válidos' as verificacion,
    COUNT(*) as cantidad
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id

UNION ALL

SELECT 
    'Configuraciones médicas con usuarios válidos' as verificacion,
    COUNT(*) as cantidad
FROM medical_practice_settings mps
INNER JOIN auth.users u ON mps.user_id = u.id;

COMMIT;

SELECT 'Limpieza completada. Los datos huérfanos han sido eliminados.' as mensaje;
