-- =====================================================
-- MIGRACIÓN: Endurecimiento de permisos para administrative_assistant (HIPAA-like)
-- Fecha: 2026-02-18
-- Descripción: Permite operación administrativa (appointments, patients) y deniega
--   acceso a datos clínicos sensibles (consultations) para el rol administrative_assistant.
-- =====================================================

-- Helper: true si el usuario actual es administrative_assistant en la clínica dada
CREATE OR REPLACE FUNCTION public.is_administrative_assistant(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
      AND role_in_clinic = 'administrative_assistant'
  );
$$;

-- --------------------------------------------------------
-- CONSULTATIONS: Denegar SELECT/UPDATE/INSERT para assistants
-- (Asistentes no deben ver ni crear notas médicas)
-- --------------------------------------------------------

DROP POLICY IF EXISTS "consultations_select_access" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert_access" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_access" ON public.consultations;

-- SELECT: Doctor creador O miembro de clínica que NO sea administrative_assistant
CREATE POLICY "consultations_select_access" ON public.consultations
FOR SELECT USING (
  doctor_id = auth.uid()
  OR
  (
    clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = consultations.clinic_id
        AND cur.is_active = true
        AND cur.status = 'approved'
        AND cur.role_in_clinic <> 'administrative_assistant'
    )
  )
);

-- INSERT: Solo el doctor puede crear; no assistants (quien inserta es doctor_id = auth.uid())
CREATE POLICY "consultations_insert_access" ON public.consultations
FOR INSERT WITH CHECK (
  doctor_id = auth.uid()
  AND (
    clinic_id IS NULL
    OR (
      is_user_in_clinic(clinic_id)
      AND NOT is_administrative_assistant(clinic_id)
    )
  )
);

-- UPDATE: Mismo criterio que SELECT
CREATE POLICY "consultations_update_access" ON public.consultations
FOR UPDATE USING (
  doctor_id = auth.uid()
  OR
  (
    clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = consultations.clinic_id
        AND cur.is_active = true
        AND cur.status = 'approved'
        AND cur.role_in_clinic <> 'administrative_assistant'
    )
  )
);
