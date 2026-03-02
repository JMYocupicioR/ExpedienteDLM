-- =====================================================
-- FIX RLS: Staff access to pathological/non_pathological/hereditary_backgrounds
-- Date: 2026-03-01
-- Description: Adds RLS policies so medical staff (super_admin, doctors, clinic members)
-- can SELECT, INSERT, UPDATE on history tables. Fixes "new row violates row-level
-- security policy for table pathological_histories".
-- =====================================================

-- Helper: staff can access patient (super_admin, primary_doctor, or clinic member)
CREATE OR REPLACE FUNCTION public.staff_can_access_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = p_patient_id
    AND (
      public.is_super_admin()
      OR p.primary_doctor_id = auth.uid()
      OR (p.clinic_id IS NOT NULL AND public.is_user_in_clinic(p.clinic_id))
    )
  );
$$;

-- pathological_histories: staff SELECT, INSERT, UPDATE, DELETE
ALTER TABLE IF EXISTS public.pathological_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pathological_histories_staff_all" ON public.pathological_histories;
CREATE POLICY "pathological_histories_staff_all" ON public.pathological_histories
FOR ALL TO authenticated
USING (public.staff_can_access_patient(patient_id))
WITH CHECK (public.staff_can_access_patient(patient_id));

-- non_pathological_histories: staff SELECT, INSERT, UPDATE, DELETE
ALTER TABLE IF EXISTS public.non_pathological_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "non_pathological_histories_staff_all" ON public.non_pathological_histories;
CREATE POLICY "non_pathological_histories_staff_all" ON public.non_pathological_histories
FOR ALL TO authenticated
USING (public.staff_can_access_patient(patient_id))
WITH CHECK (public.staff_can_access_patient(patient_id));

-- hereditary_backgrounds: staff SELECT, INSERT, UPDATE, DELETE
ALTER TABLE IF EXISTS public.hereditary_backgrounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hereditary_backgrounds_staff_all" ON public.hereditary_backgrounds;
CREATE POLICY "hereditary_backgrounds_staff_all" ON public.hereditary_backgrounds
FOR ALL TO authenticated
USING (public.staff_can_access_patient(patient_id))
WITH CHECK (public.staff_can_access_patient(patient_id));
