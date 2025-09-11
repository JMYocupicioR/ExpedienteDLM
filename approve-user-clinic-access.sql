-- =====================================================
-- SCRIPT: Aprobar Acceso del Usuario a Clínica
-- Descripción: Cambia el status de 'pending' a 'approved' y activa la relación
-- IMPORTANTE: Cambia el email por el tuyo antes de ejecutar
-- =====================================================

-- PASO 1: Mostrar solicitudes pendientes
SELECT 'SOLICITUDES PENDIENTES:' as seccion;
SELECT 
    cur.id,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    cur.created_at,
    c.name as clinic_name
FROM public.clinic_user_relationships cur
JOIN public.clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = (
    SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1  -- CAMBIA POR TU EMAIL
)
AND cur.status = 'pending';

-- PASO 2: Aprobar TODAS las solicitudes pendientes del usuario
DO $$
DECLARE
    target_user_id uuid;
    updated_count integer;
BEGIN
    -- Obtener ID del usuario
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'jmyocupicior@gmail.com';  -- CAMBIA POR TU EMAIL
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- Aprobar todas las solicitudes pendientes
    UPDATE public.clinic_user_relationships 
    SET 
        status = 'approved',
        is_active = true,
        approved_at = NOW(),
        approved_by = target_user_id, -- Auto-aprobación para testing
        updated_at = NOW()
    WHERE user_id = target_user_id 
    AND status = 'pending';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Se aprobaron % solicitudes', updated_count;
    
    -- Si no había solicitudes pendientes, crear una relación directa
    IF updated_count = 0 THEN
        DECLARE
            first_clinic_id uuid;
            first_clinic_name text;
        BEGIN
            -- Obtener la primera clínica disponible
            SELECT id, name INTO first_clinic_id, first_clinic_name
            FROM public.clinics 
            WHERE is_active = true 
            ORDER BY created_at DESC
            LIMIT 1;
            
            IF first_clinic_id IS NOT NULL THEN
                -- Crear relación directa como admin
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
                    first_clinic_id,
                    'admin_staff',
                    'approved',
                    true,
                    NOW(),
                    NOW(),
                    target_user_id
                );
                
                RAISE NOTICE 'Relación directa creada con clínica: %', first_clinic_name;
            END IF;
        END;
    END IF;
    
    -- Actualizar perfil del usuario con la primera clínica aprobada
    UPDATE public.profiles 
    SET clinic_id = (
        SELECT clinic_id 
        FROM public.clinic_user_relationships 
        WHERE user_id = target_user_id 
        AND status = 'approved' 
        AND is_active = true 
        ORDER BY approved_at DESC 
        LIMIT 1
    )
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Perfil actualizado con clinic_id';
    
END $$;

-- PASO 3: Verificar el resultado final
SELECT 'RESULTADO FINAL:' as seccion;

-- Mostrar relaciones aprobadas
SELECT 
    'Relaciones aprobadas:' as info,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    cur.approved_at,
    c.name as clinic_name
FROM public.clinic_user_relationships cur
JOIN public.clinics c ON cur.clinic_id = c.id
WHERE cur.user_id = (
    SELECT id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1  -- CAMBIA POR TU EMAIL
)
AND cur.status = 'approved'
ORDER BY cur.approved_at DESC;

-- Mostrar perfil actualizado
SELECT 
    'Perfil final:' as info,
    p.full_name,
    p.email,
    p.role,
    c.name as clinic_asociada
FROM public.profiles p
LEFT JOIN public.clinics c ON p.clinic_id = c.id
WHERE p.email = 'jmyocupicior@gmail.com';  -- CAMBIA POR TU EMAIL

-- PASO 4: Mensaje final
SELECT 'Usuario asociado exitosamente como administrador' as resultado;
