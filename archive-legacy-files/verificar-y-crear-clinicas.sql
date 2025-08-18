-- Verificar si existen clínicas y crearlas si no las hay
DO $$
DECLARE
    clinic_count INTEGER;
BEGIN
    -- Contar clínicas existentes
    SELECT COUNT(*) INTO clinic_count FROM public.clinics;
    
    IF clinic_count = 0 THEN
        -- Crear clínicas de ejemplo
        INSERT INTO public.clinics (name, address, phone, email, type) VALUES
        ('Clínica Central', 'Av. Principal 123, Ciudad de México', '555-0001', 'contacto@clinicacentral.com', 'clinic'),
        ('Hospital San José', 'Calle 5 de Mayo 456, Guadalajara', '555-0002', 'info@hospitalsanjose.com', 'clinic'),
        ('Centro Médico Norte', 'Blvd. Norte 789, Monterrey', '555-0003', 'admin@centromediconorte.com', 'clinic'),
        ('Clínica Familiar Sur', 'Av. Sur 321, Puebla', '555-0004', 'contacto@clinicafamiliarsur.com', 'clinic'),
        ('Instituto de Salud Integral', 'Paseo de la Reforma 654, CDMX', '555-0005', 'info@saludintegral.com', 'clinic');
        
        RAISE NOTICE '✅ Se crearon 5 clínicas de ejemplo';
    ELSE
        RAISE NOTICE '✅ Ya existen % clínicas en la base de datos', clinic_count;
    END IF;
    
    -- Mostrar todas las clínicas
    RAISE NOTICE '📋 CLÍNICAS DISPONIBLES:';
    FOR clinic_count IN 
        SELECT ROW_NUMBER() OVER (ORDER BY created_at) as num
        FROM public.clinics
    LOOP
        NULL; -- Solo para contar
    END LOOP;
    
END $$;

-- Mostrar todas las clínicas
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) as "#",
    name as "Nombre",
    address as "Dirección",
    phone as "Teléfono",
    email as "Email"
FROM public.clinics
ORDER BY created_at;
