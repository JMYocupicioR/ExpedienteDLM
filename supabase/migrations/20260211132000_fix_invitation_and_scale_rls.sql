-- Fix RLS for invitation tokens and scale assessments.
-- This addresses 403/400 errors in patient invitation and dashboard activity queries.

ALTER TABLE IF EXISTS public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scale_assessments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Recreate token policies to allow doctors to manage their own invitation tokens
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_registration_tokens'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.patient_registration_tokens', pol.policyname);
  END LOOP;

  CREATE POLICY patient_registration_tokens_doctor_select
    ON public.patient_registration_tokens
    FOR SELECT
    TO authenticated
    USING (doctor_id = auth.uid());

  CREATE POLICY patient_registration_tokens_doctor_insert
    ON public.patient_registration_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (doctor_id = auth.uid());

  CREATE POLICY patient_registration_tokens_doctor_update
    ON public.patient_registration_tokens
    FOR UPDATE
    TO authenticated
    USING (doctor_id = auth.uid())
    WITH CHECK (doctor_id = auth.uid());

  CREATE POLICY patient_registration_tokens_doctor_delete
    ON public.patient_registration_tokens
    FOR DELETE
    TO authenticated
    USING (doctor_id = auth.uid());

  -- Allow public token validation using secret token links (registration page)
  CREATE POLICY patient_registration_tokens_public_validate
    ON public.patient_registration_tokens
    FOR SELECT
    TO anon
    USING (status = 'pending');

  -- Recreate scale_assessments policies using patient_id relationship (doctor_id may not exist)
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scale_assessments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scale_assessments', pol.policyname);
  END LOOP;

  CREATE POLICY scale_assessments_select_by_doctor
    ON public.scale_assessments
    FOR SELECT
    TO authenticated
    USING (
      patient_id IN (SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid())
      OR patient_id IN (SELECT id FROM public.patients WHERE patient_user_id = auth.uid())
    );

  CREATE POLICY scale_assessments_insert_by_doctor
    ON public.scale_assessments
    FOR INSERT
    TO authenticated
    WITH CHECK (
      patient_id IN (SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid())
      OR patient_id IN (SELECT id FROM public.patients WHERE patient_user_id = auth.uid())
    );

  CREATE POLICY scale_assessments_update_by_doctor
    ON public.scale_assessments
    FOR UPDATE
    TO authenticated
    USING (patient_id IN (SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid()));

  CREATE POLICY scale_assessments_delete_by_doctor
    ON public.scale_assessments
    FOR DELETE
    TO authenticated
    USING (patient_id IN (SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid()));
END
$$;
