-- ==========================================
-- MIGRACIÓN FINAL RLS - ExpedienteDLM
-- ==========================================
-- Aplica las políticas de seguridad de nivel de fila
-- para permitir que usuarios autenticados puedan crear pacientes

-- 1. POLÍTICAS PARA TABLA PATIENTS
-- ==========================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

-- Crear política para permitir inserción de pacientes por usuarios autenticados
CREATE POLICY "patients_insert_policy" 
ON public.patients FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

-- Crear política para permitir lectura de pacientes
CREATE POLICY "patients_select_policy" 
ON public.patients FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Crear política para permitir actualización de pacientes
CREATE POLICY "patients_update_policy" 
ON public.patients FOR UPDATE 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Crear política para permitir eliminación de pacientes
CREATE POLICY "patients_delete_policy" 
ON public.patients FOR DELETE 
TO authenticated 
USING (auth.role() = 'authenticated');

-- 2. POLÍTICAS PARA TABLA CONSULTATIONS
-- ==========================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "consultations_insert_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_select_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_policy" ON public.consultations;
DROP POLICY IF EXISTS "consultations_delete_policy" ON public.consultations;

-- Crear políticas para consultations
CREATE POLICY "consultations_insert_policy" 
ON public.consultations FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "consultations_select_policy" 
ON public.consultations FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

CREATE POLICY "consultations_update_policy" 
ON public.consultations FOR UPDATE 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "consultations_delete_policy" 
ON public.consultations FOR DELETE 
TO authenticated 
USING (auth.role() = 'authenticated');

-- 3. POLÍTICAS PARA TABLA PRESCRIPTIONS
-- ==========================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "prescriptions_insert_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_select_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_policy" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_policy" ON public.prescriptions;

-- Crear políticas para prescriptions
CREATE POLICY "prescriptions_insert_policy" 
ON public.prescriptions FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_select_policy" 
ON public.prescriptions FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_update_policy" 
ON public.prescriptions FOR UPDATE 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prescriptions_delete_policy" 
ON public.prescriptions FOR DELETE 
TO authenticated 
USING (auth.role() = 'authenticated');

-- 4. POLÍTICAS PARA TABLA PHYSICAL_EXAMS
-- ==========================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "physical_exams_insert_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_select_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_update_policy" ON public.physical_exams;
DROP POLICY IF EXISTS "physical_exams_delete_policy" ON public.physical_exams;

-- Crear políticas para physical_exams
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

-- 5. VERIFICAR QUE RLS ESTÁ HABILITADO
-- ==========================================

-- Verificar y habilitar RLS si no está habilitado
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_exams ENABLE ROW LEVEL SECURITY;

-- 6. VERIFICACIÓN DE POLÍTICAS
-- ==========================================
-- Ejecutar estas consultas para verificar que las políticas se crearon correctamente

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('patients', 'consultations', 'prescriptions', 'physical_exams')
ORDER BY tablename, cmd;

-- ==========================================
-- ✅ MIGRACIÓN COMPLETADA
-- ==========================================
-- Después de ejecutar este SQL:
-- 1. Los usuarios autenticados podrán crear pacientes
-- 2. Todas las operaciones CRUD estarán habilitadas
-- 3. Las políticas RLS protegerán los datos
-- ==========================================