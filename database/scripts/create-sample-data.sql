-- =====================================================
-- SCRIPT: Crear Datos de Ejemplo para Testing
-- Descripción: Crea clínicas de ejemplo y asocia tu usuario
-- Instrucciones: Ejecuta en la consola SQL de Supabase
-- =====================================================

-- PASO 1: Crear clínicas de ejemplo (solo si no existen)
INSERT INTO public.clinics (name, type, address, phone, email, website, is_active)
SELECT * FROM (
  VALUES 
    ('Hospital General San José', 'hospital', 'Av. Insurgentes Sur 123, Col. Centro, CDMX', '+52 55 1234 5678', 'contacto@hospitalsanjose.com', 'https://www.hospitalsanjose.com', true),
    ('Clínica Especializada Santa María', 'specialist_clinic', 'Calle Reforma 456, Col. Juárez, CDMX', '+52 55 2345 6789', 'info@clinicasantamaria.com', null, true),
    ('Centro Médico Los Ángeles', 'medical_center', 'Av. Universidad 789, Col. Del Valle, CDMX', '+52 55 3456 7890', 'contacto@centrolosangeles.com', 'https://www.centrolosangeles.com', true),
    ('Clínica Dental Sonrisa', 'dental_clinic', 'Calle Madero 321, Col. Roma Norte, CDMX', '+52 55 4567 8901', 'citas@clinicasonrisa.com', null, true),
    ('Centro de Fisioterapia Integral', 'physiotherapy', 'Av. Patriotismo 654, Col. San Pedro de los Pinos, CDMX', '+52 55 5678 9012', 'terapia@fisiointegral.com', null, true)
) AS v(name, type, address, phone, email, website, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinics WHERE name = v.name
);

-- PASO 2: Verificar qué clínicas se crearon
SELECT 'Clínicas disponibles:' as info, id, name, type, is_active 
FROM public.clinics 
ORDER BY created_at DESC;

-- PASO 3: Obtener el ID del usuario actual (reemplaza con tu email)
-- IMPORTANTE: Cambia 'jmyocupicior@gmail.com' por tu email real
DO $$
DECLARE
    current_user_id uuid;
    clinic_id_to_join uuid;
BEGIN
    -- Obtener el ID del usuario por email (CAMBIA ESTE EMAIL)
    SELECT id INTO current_user_id 
    FROM auth.users 
    WHERE email = 'jmyocupicior@gmail.com'  -- ← CAMBIA ESTO POR TU EMAIL
    LIMIT 1;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'Usuario no encontrado. Asegúrate de cambiar el email en el script.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Usuario encontrado: %', current_user_id;
    
    -- Obtener la primera clínica disponible
    SELECT id INTO clinic_id_to_join 
    FROM public.clinics 
    WHERE is_active = true 
    LIMIT 1;
    
    IF clinic_id_to_join IS NULL THEN
        RAISE NOTICE 'No se encontraron clínicas activas.';
        RETURN;
    END IF;
    
    -- Verificar si ya existe la relación
    IF NOT EXISTS (
        SELECT 1 FROM public.clinic_user_relationships 
        WHERE user_id = current_user_id AND clinic_id = clinic_id_to_join
    ) THEN
        -- Crear relación usuario-clínica como admin
        INSERT INTO public.clinic_user_relationships (
            user_id, 
            clinic_id, 
            role_in_clinic, 
            status, 
            is_active,
            start_date
        ) VALUES (
            current_user_id, 
            clinic_id_to_join, 
            'admin_staff', 
            'approved', 
            true,
            NOW()
        );
        
        RAISE NOTICE 'Usuario asociado a clínica exitosamente.';
    ELSE
        RAISE NOTICE 'El usuario ya está asociado a esta clínica.';
    END IF;
    
    -- Actualizar el perfil del usuario con la clínica
    UPDATE public.profiles 
    SET clinic_id = clinic_id_to_join 
    WHERE id = current_user_id;
    
END $$;

-- PASO 4: Verificar las relaciones creadas
SELECT 
    'Relaciones usuario-clínica:' as info,
    cur.user_id,
    cur.role_in_clinic,
    cur.status,
    cur.is_active,
    c.name as clinic_name
FROM public.clinic_user_relationships cur
JOIN public.clinics c ON cur.clinic_id = c.id
ORDER BY cur.created_at DESC
LIMIT 10;

-- PASO 5: Mostrar resumen final
SELECT 
    (SELECT COUNT(*) FROM public.clinics WHERE is_active = true) as clinicas_activas,
    (SELECT COUNT(*) FROM public.clinic_user_relationships WHERE status = 'approved') as relaciones_aprobadas,
    'Setup completado' as estado;
