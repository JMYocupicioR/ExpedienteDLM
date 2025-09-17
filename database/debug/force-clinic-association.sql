-- =====================================================
-- SCRIPT: Forzar Asociación Usuario-Clínica
-- Descripción: Fuerza la creación de una asociación válida
-- =====================================================

DO $$
DECLARE
    target_user_id uuid;
    target_clinic_id uuid;
    clinic_name text;
    user_email text := 'jmyocupicior@gmail.com'; -- ← CAMBIA ESTO
BEGIN
    -- Obtener usuario
    SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado: %', user_email;
    END IF;
    
    -- Obtener clínica
    SELECT id, name INTO target_clinic_id, clinic_name 
    FROM public.clinics 
    WHERE is_active = true 
    ORDER BY created_at DESC LIMIT 1;
    
    IF target_clinic_id IS NULL THEN
        RAISE EXCEPTION 'No hay clínicas activas';
    END IF;
    
    -- ELIMINAR cualquier relación existente para empezar limpio
    DELETE FROM public.clinic_user_relationships 
    WHERE user_id = target_user_id;
    
    -- CREAR relación completamente nueva
    INSERT INTO public.clinic_user_relationships (
        user_id,
        clinic_id,
        role_in_clinic,
        status,
        is_active,
        start_date,
        approved_at,
        approved_by
    ) VALUES (
        target_user_id,
        target_clinic_id,
        'admin_staff',
        'approved',
        true,
        NOW(),
        NOW(),
        target_user_id
    );
    
    -- ACTUALIZAR perfil
    UPDATE public.profiles 
    SET 
        clinic_id = target_clinic_id,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RAISE NOTICE 'ASOCIACIÓN FORZADA EXITOSA';
    RAISE NOTICE 'Usuario: % → Clínica: %', user_email, clinic_name;
    
END $$;

-- Verificación final
SELECT 
    'VERIFICACIÓN:' as seccion,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    c.name as clinic_name
FROM public.clinic_user_relationships cur
JOIN public.clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = (SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com');
