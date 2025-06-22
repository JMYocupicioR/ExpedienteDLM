-- Renombrar la columna 'fields' a 'definition' en la tabla 'physical_exam_templates'
ALTER TABLE public.physical_exam_templates
RENAME COLUMN fields TO definition;

-- Crear la tabla 'physical_exam_sections' para estandarizar las secciones de exploración
CREATE TABLE IF NOT EXISTS public.physical_exam_sections (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS) para la nueva tabla
ALTER TABLE public.physical_exam_sections ENABLE ROW LEVEL SECURITY;

-- Insertar las secciones médicas estándar predefinidas
INSERT INTO public.physical_exam_sections (name, description)
VALUES
    ('general_inspection', 'Inspección General'),
    ('vital_signs', 'Signos Vitales'),
    ('head_and_neck', 'Cabeza y Cuello'),
    ('cardiovascular', 'Cardiovascular'),
    ('respiratory', 'Respiratorio'),
    ('abdominal', 'Abdomen'),
    ('neurological', 'Neurológico'),
    ('musculoskeletal', 'Musculoesquelético'),
    ('skin', 'Piel y Anexos'),
    ('extremities', 'Extremidades')
ON CONFLICT (name) DO NOTHING;

-- Crear políticas de RLS para 'physical_exam_sections'
-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow authenticated read access"
ON public.physical_exam_sections
FOR SELECT
TO authenticated
USING (true);

-- Permitir la inserción, actualización y eliminación solo a roles de 'service_role' o 'admin' (opcional, ajustar según sea necesario)
CREATE POLICY "Allow full access for admin"
ON public.physical_exam_sections
FOR ALL
TO service_role
USING (true);

-- Mensaje de Log para confirmar la ejecución de la migración
DO $$
BEGIN
  RAISE LOG 'MIGRATION APPLIED: 20250625000000_fix_template_and_sections_schema.sql';
END $$; 