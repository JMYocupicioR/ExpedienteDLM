-- =====================================================
-- MIGRACIÓN: Habilitar acceso a Pacientes (RLS)
-- Fecha: 2026-02-05
-- Descripción: Agrega políticas RLS para SELECT, INSERT y UPDATE en la tabla patients.
-- Soluciona el error "permission denied" al crear pacientes y permite acceso a médicos independientes.
-- =====================================================

-- Habilitar RLS (por si acaso)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar política antigua restrictiva
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;

-- 2. Política SELECT: Médicos primarios O miembros de la clínica
CREATE POLICY "patients_select_access" ON public.patients
FOR SELECT USING (
  -- El usuario es el médico primario
  primary_doctor_id = auth.uid()
  OR
  -- O el usuario pertenece a la clínica del paciente
  (
    clinic_id IS NOT NULL AND
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
    )
  )
);

-- 3. Política INSERT: Solo el médico primario (que debe ser el usuario actual)
-- y debe tener permiso en la clínica si se asigna una
CREATE POLICY "patients_insert_access" ON public.patients
FOR INSERT WITH CHECK (
  -- El usuario debe asignarse como médico primario
  primary_doctor_id = auth.uid()
  AND
  (
    -- Caso 1: Médico Independiente (clinic_id es NULL)
    clinic_id IS NULL
    OR
    -- Caso 2: Médico de Clínica (debe pertenecer a la clínica)
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
    )
  )
);

-- 4. Política UPDATE: Médico primario O colaboradores de la clínica
CREATE POLICY "patients_update_access" ON public.patients
FOR UPDATE USING (
  primary_doctor_id = auth.uid()
  OR
  (
    clinic_id IS NOT NULL AND
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
      -- Podríamos restringir update solo a roles específicos si fuera necesario,
      -- por ahora permitimos a cualquier miembro activo (doctores/staff).
    )
  )
);

-- 5. Política DELETE: Solo el médico primario (Opcional, segun requerimientos)
-- Por ahora no habilitamos DELETE general excepto si ya existía alguna política,
-- pero el usuario mencionó "no puedo crear".
