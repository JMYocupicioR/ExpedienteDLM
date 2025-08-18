-- ==========================================
-- CREAR CLÍNICAS DE EJEMPLO
-- ==========================================
-- Ejecuta este script DESPUÉS de aplicar la migración principal

-- Insertar clínicas de ejemplo
INSERT INTO public.clinics (name, address, phone, email) VALUES
('Clínica Central', 'Av. Principal 123, Ciudad de México', '555-0001', 'contacto@clinicacentral.com'),
('Hospital San José', 'Calle 5 de Mayo 456, Guadalajara', '555-0002', 'info@hospitalsanjose.com'),
('Centro Médico Norte', 'Blvd. Norte 789, Monterrey', '555-0003', 'admin@centromediconorte.com'),
('Clínica Familiar Sur', 'Av. Sur 321, Puebla', '555-0004', 'contacto@clinicafamiliarsur.com'),
('Instituto de Salud Integral', 'Paseo de la Reforma 654, CDMX', '555-0005', 'info@saludintegral.com');

-- Verificar que se crearon correctamente
SELECT 
    id,
    name,
    address,
    phone,
    email,
    created_at
FROM public.clinics
ORDER BY created_at DESC;
