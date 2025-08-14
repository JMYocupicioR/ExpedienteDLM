-- Agregar la especialidad faltante: Medicina de Rehabilitación
INSERT INTO public.medical_specialties (name, category, description, requires_license, is_active)
VALUES ('Medicina de Rehabilitación', 'medical', 'Rehabilitación médica integral', true, true)
ON CONFLICT (name) DO NOTHING;


