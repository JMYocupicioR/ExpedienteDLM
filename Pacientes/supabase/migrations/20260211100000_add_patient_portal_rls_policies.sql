-- =====================================================
-- MIGRATION: Add Patient Portal RLS Policies
-- Date: 2026-02-11
-- Description: Enables secure patient self-access across patient portal tables.
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_patient_owner(p_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = p_patient_id
      AND p.patient_user_id = auth.uid()
  );
$$;

-- Patients
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patients_select_patient_self" ON public.patients;
CREATE POLICY "patients_select_patient_self"
ON public.patients
FOR SELECT
USING (
  patient_user_id = auth.uid()
);

DROP POLICY IF EXISTS "patients_update_patient_self" ON public.patients;
CREATE POLICY "patients_update_patient_self"
ON public.patients
FOR UPDATE
USING (
  patient_user_id = auth.uid()
)
WITH CHECK (
  patient_user_id = auth.uid()
);

-- Appointments
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_select_patient_self" ON public.appointments;
CREATE POLICY "appointments_select_patient_self"
ON public.appointments
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

-- Consultations
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultations_select_patient_self" ON public.consultations;
CREATE POLICY "consultations_select_patient_self"
ON public.consultations
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

-- Scale assessments
ALTER TABLE IF EXISTS public.scale_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scale_assessments_select_patient_self" ON public.scale_assessments;
CREATE POLICY "scale_assessments_select_patient_self"
ON public.scale_assessments
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

DROP POLICY IF EXISTS "scale_assessments_insert_patient_self" ON public.scale_assessments;
CREATE POLICY "scale_assessments_insert_patient_self"
ON public.scale_assessments
FOR INSERT
WITH CHECK (
  public.is_patient_owner(patient_id)
);

-- Histories
ALTER TABLE IF EXISTS public.pathological_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pathological_histories_select_patient_self" ON public.pathological_histories;
CREATE POLICY "pathological_histories_select_patient_self"
ON public.pathological_histories
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

ALTER TABLE IF EXISTS public.non_pathological_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "non_pathological_histories_select_patient_self" ON public.non_pathological_histories;
CREATE POLICY "non_pathological_histories_select_patient_self"
ON public.non_pathological_histories
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

ALTER TABLE IF EXISTS public.hereditary_backgrounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hereditary_backgrounds_select_patient_self" ON public.hereditary_backgrounds;
CREATE POLICY "hereditary_backgrounds_select_patient_self"
ON public.hereditary_backgrounds
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

-- Notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_self" ON public.notifications;
CREATE POLICY "notifications_select_self"
ON public.notifications
FOR SELECT
USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_update_self" ON public.notifications;
CREATE POLICY "notifications_update_self"
ON public.notifications
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Medical tests
ALTER TABLE IF EXISTS public.medical_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "medical_tests_select_patient_self" ON public.medical_tests;
CREATE POLICY "medical_tests_select_patient_self"
ON public.medical_tests
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

-- Prescriptions history
ALTER TABLE IF EXISTS public.patient_prescription_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patient_prescription_history_select_patient_self" ON public.patient_prescription_history;
CREATE POLICY "patient_prescription_history_select_patient_self"
ON public.patient_prescription_history
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

