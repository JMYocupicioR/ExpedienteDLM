-- ==========================================
-- CREAR TABLA PHYSICAL_EXAMS FALTANTE
-- ==========================================

-- Crear la tabla physical_exams si no existe
CREATE TABLE IF NOT EXISTS public.physical_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.physical_exam_templates(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_time TIME DEFAULT CURRENT_TIME,
  vital_signs JSONB DEFAULT '{}',
  examination_data JSONB DEFAULT '{}',
  findings TEXT,
  conclusions TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_physical_exams_patient_id ON public.physical_exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_physical_exams_doctor_id ON public.physical_exams(doctor_id);
CREATE INDEX IF NOT EXISTS idx_physical_exams_consultation_id ON public.physical_exams(consultation_id);
CREATE INDEX IF NOT EXISTS idx_physical_exams_exam_date ON public.physical_exams(exam_date);

-- Habilitar RLS
ALTER TABLE public.physical_exams ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para physical_exams
DROP POLICY IF EXISTS "physical_exams_insert_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_select_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_update_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_delete_policy" ON public.physical_exams;

CREATE POLICY "physical_exams_insert_policy" 
ON public.physical_exams FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "physical_exams_select_policy" 
ON public.physical_exams FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

CREATE POLICY "physical_exams_update_policy" 
ON public.physical_exams FOR UPDATE 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "physical_exams_delete_policy" 
ON public.physical_exams FOR DELETE 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_physical_exams_updated_at ON public.physical_exams;
CREATE TRIGGER handle_physical_exams_updated_at
  BEFORE UPDATE ON public.physical_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'physical_exams' 
  AND table_schema = 'public'
ORDER BY ordinal_position;