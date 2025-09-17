-- =====================================================
-- SCRIPT: Asociar Usuario a Clínica
-- Descripción: Asocia automáticamente tu usuario a una clínica como admin
-- IMPORTANTE: Cambia el email por el tuyo antes de ejecutar
-- =====================================================

-- PASO 1: Obtener información del usuario y clínica
DO $$
DECLARE
    target_user_id uuid;
    target_clinic_id uuid;
    clinic_name text;
    user_email text := 'jmyocupicior@gmail.com'; -- ← CAMBIA ESTO POR TU EMAIL
BEGIN
    -- Obtener ID del usuario
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', user_email;
    END IF;
    
    RAISE NOTICE 'Usuario encontrado: %', target_user_id;
    
    -- Obtener la primera clínica activa disponible
    SELECT id, name INTO target_clinic_id, clinic_name
    FROM public.clinics 
    WHERE is_active = true 
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF target_clinic_id IS NULL THEN
        RAISE EXCEPTION 'No se encontraron clínicas activas';
    END IF;
    
    RAISE NOTICE 'Clínica seleccionada: % (ID: %)', clinic_name, target_clinic_id;
    
    -- Verificar si ya existe una relación
    IF EXISTS (
        SELECT 1 FROM public.clinic_user_relationships 
        WHERE user_id = target_user_id 
        AND clinic_id = target_clinic_id
    ) THEN
        -- Actualizar relación existente
        UPDATE public.clinic_user_relationships 
        SET 
            role_in_clinic = 'admin_staff',
            status = 'approved',
            is_active = true,
            start_date = COALESCE(start_date, NOW()),
            approved_at = NOW(),
            updated_at = NOW()
        WHERE user_id = target_user_id 
        AND clinic_id = target_clinic_id;
        
        RAISE NOTICE 'Relación existente actualizada a admin aprobado';
    ELSE
        -- Crear nueva relación
        INSERT INTO public.clinic_user_relationships (
            user_id,
            clinic_id,
            role_in_clinic,
            status,
            is_active,
            start_date,
            approved_at
        ) VALUES (
            target_user_id,
            target_clinic_id,
            'admin_staff',
            'approved',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Nueva relación creada como admin aprobado';
    END IF;
    
    -- Actualizar el perfil del usuario con la clínica
    UPDATE public.profiles 
    SET 
        clinic_id = target_clinic_id,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Perfil actualizado con clinic_id';
    
    -- Verificar el resultado final
    RAISE NOTICE 'ASOCIACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE 'Usuario: % asociado a clínica: %', user_email, clinic_name;
    
END $$;

-- PASO 2: Verificar el resultado
SELECT 'VERIFICACIÓN FINAL:' as seccion;

-- Mostrar la relación creada
SELECT 
    'Relación usuario-clínica:' as info,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    c.name as clinic_name,
    u.email as user_email
FROM public.clinic_user_relationships cur
JOIN public.clinics c ON cur.clinic_id = c.id
JOIN auth.users u ON cur.user_id = u.id
WHERE u.email = 'jmyocupicior@gmail.com'  -- CAMBIA POR TU EMAIL
ORDER BY cur.created_at DESC
LIMIT 1;

-- Mostrar el perfil actualizado
SELECT 
    'Perfil actualizado:' as info,
    p.full_name,
    p.email,
    p.role,
    c.name as clinic_name
FROM public.profiles p
LEFT JOIN public.clinics c ON p.clinic_id = c.id
WHERE p.email = 'jmyocupicior@gmail.com';  -- CAMBIA POR TU EMAIL
