-- =====================================================
-- MIGRACIÓN COMPLETA: Permitir Médicos Independientes Sin Clínica
-- Fecha: 2025-11-22
-- Descripción: Esta migración incluye la creación de funciones
-- necesarias y permite que médicos independientes puedan crear
-- y gestionar sus propios pacientes sin clínica.
-- =====================================================

-- =====================================================
-- PASO 0: Crear Funciones RLS Necesarias
-- =====================================================

-- Eliminar función is_user_in_clinic si existe (usar CASCADE para eliminar dependencias)
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_in_clinic(check_clinic_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_in_clinic(target_clinic_id uuid) CASCADE;

-- FUNCIÓN: is_user_in_clinic
-- Descripción: Verifica si el usuario actual pertenece a una clínica específica
CREATE OR REPLACE FUNCTION public.is_user_in_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $func$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
  );
$func$;

COMMENT ON FUNCTION public.is_user_in_clinic(uuid) IS
'Función de seguridad RLS: Verifica si el usuario autenticado pertenece a la clínica especificada con estado activo y aprobado.';

-- =====================================================
-- PASO 1: Modificar Esquema de Tabla 'patients'
-- =====================================================

-- Eliminar restricción única que depende de clinic_id
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS unique_clinic_curp;

-- Hacer clinic_id NULLABLE
ALTER TABLE public.patients
ALTER COLUMN clinic_id DROP NOT NULL;

-- Eliminar índice único anterior si existe
DROP INDEX IF EXISTS unique_clinic_curp_when_not_null;

-- Agregar restricción única para CURP solo cuando clinic_id NO es NULL
-- Esto evita duplicados de CURP dentro de la misma clínica, pero permite
-- que médicos independientes usen CURPs sin conflicto
CREATE UNIQUE INDEX unique_clinic_curp_when_not_null
ON public.patients (clinic_id, curp)
WHERE clinic_id IS NOT NULL AND curp IS NOT NULL AND curp != '';

-- Agregar índice para búsquedas por primary_doctor_id (médicos independientes)
DROP INDEX IF EXISTS idx_patients_primary_doctor_independent;
CREATE INDEX idx_patients_primary_doctor_independent
ON public.patients (primary_doctor_id)
WHERE clinic_id IS NULL;

-- =====================================================
-- PASO 2: Actualizar Políticas RLS de 'patients'
-- =====================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

-- =====================================================
-- POLÍTICA INSERT: Crear Pacientes
-- =====================================================
-- Permite:
-- 1. Médicos de clínica: crear pacientes en clínicas donde están registrados
-- 2. Médicos independientes: crear pacientes sin clínica (clinic_id NULL)
--    donde ellos son el primary_doctor_id
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  -- Opción 1: Médico pertenece a la clínica del paciente
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Opción 2: Médico independiente crea su propio paciente (sin clínica)
  (clinic_id IS NULL AND primary_doctor_id = auth.uid())
  OR
  -- Opción 3: Médico crea paciente en la clínica de su perfil
  (clinic_id IS NOT NULL AND primary_doctor_id = auth.uid() AND
   clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);

-- =====================================================
-- POLÍTICA SELECT: Ver Pacientes
-- =====================================================
-- Permite ver:
-- 1. Pacientes de clínicas donde el usuario está registrado
-- 2. Pacientes propios del médico (donde él es primary_doctor_id)
CREATE POLICY "patients_select_policy" ON public.patients
FOR SELECT
USING (
  -- Opción 1: Paciente pertenece a clínica del usuario
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Opción 2: Usuario es el médico primario del paciente
  (primary_doctor_id = auth.uid())
);

-- =====================================================
-- POLÍTICA UPDATE: Actualizar Pacientes
-- =====================================================
-- Permite actualizar:
-- 1. Pacientes de clínicas donde el usuario está registrado
-- 2. Pacientes propios del médico
CREATE POLICY "patients_update_policy" ON public.patients
FOR UPDATE
USING (
  -- Usuario puede actualizar si:
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (primary_doctor_id = auth.uid())
)
WITH CHECK (
  -- Verificar que la actualización mantiene las mismas reglas
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (clinic_id IS NULL AND primary_doctor_id = auth.uid())
  OR
  (clinic_id IS NOT NULL AND primary_doctor_id = auth.uid() AND
   clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);

-- =====================================================
-- POLÍTICA DELETE: Eliminar Pacientes
-- =====================================================
-- Permite eliminar:
-- 1. Pacientes de clínicas donde el usuario está registrado
-- 2. Pacientes propios del médico
CREATE POLICY "patients_delete_policy" ON public.patients
FOR DELETE
USING (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (primary_doctor_id = auth.uid())
);

-- =====================================================
-- PASO 3: Comentarios de Documentación
-- =====================================================

COMMENT ON COLUMN public.patients.clinic_id IS
'ID de la clínica a la que pertenece el paciente. NULL para médicos independientes.';

COMMENT ON POLICY "patients_insert_policy" ON public.patients IS
'Permite crear pacientes: (1) en clínicas autorizadas, (2) médicos independientes sin clínica';

COMMENT ON POLICY "patients_select_policy" ON public.patients IS
'Permite ver: (1) pacientes de clínicas autorizadas, (2) pacientes propios del médico';

COMMENT ON POLICY "patients_update_policy" ON public.patients IS
'Permite actualizar: (1) pacientes de clínicas autorizadas, (2) pacientes propios del médico';

COMMENT ON POLICY "patients_delete_policy" ON public.patients IS
'Permite eliminar: (1) pacientes de clínicas autorizadas, (2) pacientes propios del médico';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
