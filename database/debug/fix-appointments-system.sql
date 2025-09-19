-- Script para diagnosticar y reparar problemas del sistema de citas
-- Ejecutar este script si el sistema de agenda se queda cargando

BEGIN;

-- 1. Verificar que las tablas existan
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
        RAISE NOTICE 'PROBLEMA: Tabla appointments no existe';
        RAISE NOTICE 'SOLUCION: Ejecutar migración 20250918000001_create_enhanced_appointments_system.sql';
    ELSE
        RAISE NOTICE 'OK: Tabla appointments existe';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_practice_settings') THEN
        RAISE NOTICE 'PROBLEMA: Tabla medical_practice_settings no existe';
        RAISE NOTICE 'SOLUCION: Ejecutar migración 20250919000002_create_medical_practice_settings.sql';
    ELSE
        RAISE NOTICE 'OK: Tabla medical_practice_settings existe';
    END IF;
END $$;

-- 2. Verificar que las funciones existan
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'check_appointment_conflicts') THEN
        RAISE NOTICE 'PROBLEMA: Función check_appointment_conflicts no existe';
        RAISE NOTICE 'SOLUCION: Ejecutar migración 20250918000001_create_enhanced_appointments_system.sql';
    ELSE
        RAISE NOTICE 'OK: Función check_appointment_conflicts existe';
    END IF;
END $$;

-- 3. Verificar políticas RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'appointments' 
        AND policyname = 'Users can view appointments they are involved in'
    ) THEN
        RAISE NOTICE 'PROBLEMA: Políticas RLS para appointments no configuradas correctamente';
        RAISE NOTICE 'SOLUCION: Ejecutar migración 20250918000001_create_enhanced_appointments_system.sql';
    ELSE
        RAISE NOTICE 'OK: Políticas RLS para appointments configuradas';
    END IF;
END $$;

-- 4. Crear datos de prueba si no existen (solo para usuarios que existen en auth.users)
INSERT INTO medical_practice_settings (
    user_id,
    clinic_id,
    weekday_start_time,
    weekday_end_time,
    saturday_start_time,
    saturday_end_time,
    sunday_enabled,
    default_consultation_duration,
    available_durations,
    enable_presential,
    enable_teleconsultation,
    enable_emergency,
    languages,
    buffer_time_between_appointments,
    max_advance_booking_days
)
SELECT 
    p.id,
    p.clinic_id,
    '09:00:00'::TIME,
    '18:00:00'::TIME,
    '09:00:00'::TIME,
    '14:00:00'::TIME,
    FALSE,
    30,
    ARRAY[15, 30, 45, 60],
    TRUE,
    FALSE,
    FALSE,
    ARRAY['es'],
    0,
    30
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id  -- Solo perfiles con usuarios válidos
WHERE p.role IN ('doctor', 'admin_staff')
AND NOT EXISTS (
    SELECT 1 FROM medical_practice_settings 
    WHERE medical_practice_settings.user_id = p.id
);

-- 5. Mostrar estadísticas
SELECT 
    'Perfiles registrados' as descripcion,
    COUNT(*) as cantidad
FROM profiles
WHERE role IN ('doctor', 'admin_staff')

UNION ALL

SELECT 
    'Configuraciones médicas' as descripcion,
    COUNT(*) as cantidad
FROM medical_practice_settings

UNION ALL

SELECT 
    'Citas totales' as descripcion,
    COUNT(*) as cantidad
FROM appointments

UNION ALL

SELECT 
    'Pacientes registrados' as descripcion,
    COUNT(*) as cantidad
FROM patients

UNION ALL

SELECT 
    'Clínicas activas' as descripcion,
    COUNT(*) as cantidad
FROM clinics
WHERE is_active = true;

-- 6. Identificar y reportar perfiles huérfanos (sin usuario en auth.users)
DO $$
DECLARE
    orphaned_count INTEGER;
    i RECORD;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE u.id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'ADVERTENCIA: % perfiles huérfanos encontrados (sin usuario en auth.users)', orphaned_count;
        RAISE NOTICE 'SOLUCION: Considerar limpiar estos perfiles o recrear los usuarios';
        
        -- Mostrar los primeros 5 perfiles huérfanos
        FOR i IN 
            SELECT p.id, p.full_name, p.email, p.role
            FROM profiles p
            LEFT JOIN auth.users u ON p.id = u.id
            WHERE u.id IS NULL
            LIMIT 5
        LOOP
            RAISE NOTICE 'Perfil huérfano: % (%, %, %)', i.id, i.full_name, i.email, i.role;
        END LOOP;
    ELSE
        RAISE NOTICE 'OK: No hay perfiles huérfanos';
    END IF;
END $$;

-- 7. Verificar permisos de usuario actual
DO $$
DECLARE
    current_user_role TEXT;
    current_clinic_id UUID;
    current_user_exists BOOLEAN;
BEGIN
    -- Verificar si el usuario actual existe en auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid()) INTO current_user_exists;
    
    IF NOT current_user_exists THEN
        RAISE NOTICE 'PROBLEMA: Usuario actual no existe en auth.users';
        RAISE NOTICE 'SOLUCION: Verificar autenticación';
        RETURN;
    END IF;
    
    SELECT role, clinic_id INTO current_user_role, current_clinic_id
    FROM profiles 
    WHERE id = auth.uid();
    
    IF current_user_role IS NULL THEN
        RAISE NOTICE 'PROBLEMA: Usuario actual no tiene perfil en la tabla profiles';
        RAISE NOTICE 'SOLUCION: Completar el registro del usuario';
    ELSE
        RAISE NOTICE 'OK: Usuario actual tiene rol: %', current_user_role;
        
        IF current_clinic_id IS NULL THEN
            RAISE NOTICE 'ADVERTENCIA: Usuario no está asociado a ninguna clínica';
        ELSE
            RAISE NOTICE 'OK: Usuario asociado a clínica: %', current_clinic_id;
        END IF;
    END IF;
END $$;

COMMIT;

-- Mostrar mensaje final
SELECT 'Diagnóstico completado. Revisa los mensajes NOTICE arriba para identificar problemas.' as mensaje;
