-- =====================================================
-- SOLUCIÓN: Usuario sin clínica asociada
-- =====================================================
-- Este script asocia un usuario a una clínica existente
-- o crea una nueva clínica si no existe ninguna

-- ⚠️ IMPORTANTE: Reemplaza estos valores:
DO $$
DECLARE
    target_user_email TEXT := 'jmyocupicior@gmail.com'; -- CAMBIA POR EL EMAIL DEL USUARIO
    target_user_id UUID;
    target_clinic_id UUID;
    new_clinic_created BOOLEAN := false;
BEGIN
    -- Paso 1: Obtener el ID del usuario
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_user_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', target_user_email;
    END IF;

    RAISE NOTICE '✅ Usuario encontrado: % (ID: %)', target_user_email, target_user_id;

    -- Paso 2: Verificar si ya tiene una clínica asociada
    SELECT clinic_id INTO target_clinic_id
    FROM clinic_user_relationships
    WHERE user_id = target_user_id
      AND status = 'approved'
      AND is_active = true
    LIMIT 1;

    IF target_clinic_id IS NOT NULL THEN
        RAISE NOTICE '✅ Usuario ya tiene clínica asociada: %', target_clinic_id;
        RETURN;
    END IF;

    -- Paso 3: Buscar una clínica existente
    SELECT id INTO target_clinic_id
    FROM clinics
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- Paso 4: Si no existe ninguna clínica, crear una
    IF target_clinic_id IS NULL THEN
        RAISE NOTICE '⚠️ No hay clínicas en el sistema. Creando una nueva...';
        
        INSERT INTO clinics (
            id,
            name,
            type,
            address,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Clínica Médica Principal',
            'clinic',
            'Dirección de la clínica',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO target_clinic_id;
        
        new_clinic_created := true;
        RAISE NOTICE '✅ Clínica creada: % (ID: %)', 'Clínica Médica Principal', target_clinic_id;
    ELSE
        RAISE NOTICE '✅ Clínica existente encontrada: %', target_clinic_id;
    END IF;

    -- Paso 5: Crear la relación usuario-clínica
    INSERT INTO clinic_user_relationships (
        user_id,
        clinic_id,
        role_in_clinic,
        status,
        is_active,
        start_date,
        approved_at,
        approved_by,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        target_clinic_id,
        'admin_staff', -- Rol de administrador
        'approved',    -- Pre-aprobado
        true,
        NOW(),
        NOW(),
        target_user_id, -- Auto-aprobado
        NOW(),
        NOW()
    )
    ON CONFLICT (clinic_id, user_id) DO UPDATE
    SET
        role_in_clinic = 'admin_staff',
        status = 'approved',
        is_active = true,
        approved_at = NOW(),
        updated_at = NOW();

    RAISE NOTICE '✅ Relación usuario-clínica creada exitosamente';

    -- Paso 6: Actualizar el perfil del usuario
    UPDATE profiles
    SET
        clinic_id = target_clinic_id,
        updated_at = NOW()
    WHERE id = target_user_id;

    RAISE NOTICE '✅ Perfil actualizado con clinic_id';

    -- Paso 7: Crear configuración por defecto para la clínica (si no existe)
    INSERT INTO clinic_configurations (clinic_id, created_at, updated_at)
    VALUES (target_clinic_id, NOW(), NOW())
    ON CONFLICT (clinic_id) DO NOTHING;

    RAISE NOTICE '✅ Configuración de clínica inicializada';

    -- Resumen final
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ASOCIACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuario: %', target_user_email;
    RAISE NOTICE 'Clínica ID: %', target_clinic_id;
    RAISE NOTICE 'Rol: admin_staff';
    RAISE NOTICE 'Estado: approved';
    IF new_clinic_created THEN
        RAISE NOTICE '⚠️ Nueva clínica creada';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- Verificación final
SELECT 
    'VERIFICACIÓN FINAL' as seccion,
    u.email,
    p.role as perfil_role,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    c.name as clinic_name
FROM auth.users u
JOIN profiles p ON p.id = u.id
LEFT JOIN clinic_user_relationships cur ON cur.user_id = u.id
LEFT JOIN clinics c ON c.id = cur.clinic_id
WHERE u.email = 'jmyocupicior@gmail.com'  -- CAMBIA POR TU EMAIL
ORDER BY cur.created_at DESC;
