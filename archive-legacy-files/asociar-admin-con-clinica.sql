-- Script para asociar el perfil de administrador con una clínica

DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT;
    target_clinic_id UUID;
    target_clinic_name TEXT;
    existing_association INTEGER;
BEGIN
    -- Buscar el usuario administrador por email
    SELECT id, email INTO admin_user_id, admin_email
    FROM public.profiles 
    WHERE email = 'jmyocupicior@gmail.com' 
    AND role IN ('admin_staff', 'super_admin', 'doctor');
    
    IF admin_user_id IS NULL THEN
        -- Buscar en auth.users si no está en profiles
        SELECT id, email INTO admin_user_id, admin_email
        FROM auth.users 
        WHERE email = 'jmyocupicior@gmail.com';
        
        IF admin_user_id IS NULL THEN
            RAISE EXCEPTION 'No se encontró el usuario jmyocupicior@gmail.com';
        END IF;
    END IF;
    
    -- Buscar una clínica para asociar (usar la primera disponible)
    SELECT id, name INTO target_clinic_id, target_clinic_name
    FROM public.clinics 
    ORDER BY created_at 
    LIMIT 1;
    
    IF target_clinic_id IS NULL THEN
        -- Crear una clínica si no existe ninguna
        INSERT INTO public.clinics (name, address, type)
        VALUES ('Clínica Principal', 'Dirección Principal', 'clinic')
        RETURNING id, name INTO target_clinic_id, target_clinic_name;
        
        RAISE NOTICE 'Clínica creada: % (ID: %)', target_clinic_name, target_clinic_id;
    END IF;
    
    -- Verificar si ya existe la asociación
    SELECT COUNT(*) INTO existing_association
    FROM public.clinic_members 
    WHERE user_id = admin_user_id AND clinic_id = target_clinic_id;
    
    IF existing_association = 0 THEN
        -- Crear la asociación
        INSERT INTO public.clinic_members (clinic_id, user_id, role)
        VALUES (target_clinic_id, admin_user_id, 'admin');
        
        RAISE NOTICE '✅ Asociación creada exitosamente:';
        RAISE NOTICE '   👤 Usuario: % (ID: %)', admin_email, admin_user_id;
        RAISE NOTICE '   🏥 Clínica: % (ID: %)', target_clinic_name, target_clinic_id;
        RAISE NOTICE '   👑 Rol: admin';
    ELSE
        RAISE NOTICE '⚠️  La asociación ya existe:';
        RAISE NOTICE '   👤 Usuario: % ya está asociado a la clínica %', admin_email, target_clinic_name;
    END IF;
    
    -- Mostrar resumen final
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 ESTADO ACTUAL DE ASOCIACIONES:';
    
    FOR existing_association IN 
        SELECT COUNT(*) 
        FROM public.clinic_members cm
        JOIN public.clinics c ON cm.clinic_id = c.id
        WHERE cm.user_id = admin_user_id
    LOOP
        RAISE NOTICE '   Total clínicas asociadas: %', existing_association;
    END LOOP;
    
    RAISE NOTICE '===========================================';
    
END $$;

-- Mostrar el estado final
SELECT 
    'ASOCIACIONES ACTUALES' as info,
    cm.user_id,
    p.email as user_email,
    cm.clinic_id,
    c.name as clinic_name,
    cm.role,
    cm.joined_at
FROM public.clinic_members cm
JOIN public.clinics c ON cm.clinic_id = c.id
LEFT JOIN public.profiles p ON cm.user_id = p.id
LEFT JOIN auth.users au ON cm.user_id = au.id
WHERE p.email = 'jmyocupicior@gmail.com' OR au.email = 'jmyocupicior@gmail.com'
ORDER BY cm.joined_at;
