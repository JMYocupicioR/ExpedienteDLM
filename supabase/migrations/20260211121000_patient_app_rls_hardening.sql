-- Harden patient-side access for Pacientes app MVP.
-- Adds explicit RLS policies for profile resolution and patient booking flows.

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_practice_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_select_self_by_auth_user'
  ) THEN
    EXECUTE '
      CREATE POLICY patients_select_self_by_auth_user
      ON public.patients
      FOR SELECT
      USING (patient_user_id = auth.uid())
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_select_patient_own'
  ) THEN
    EXECUTE '
      CREATE POLICY appointments_select_patient_own
      ON public.appointments
      FOR SELECT
      USING (
        patient_id IN (
          SELECT id
          FROM public.patients
          WHERE patient_user_id = auth.uid()
        )
      )
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_insert_patient_own'
  ) THEN
    EXECUTE '
      CREATE POLICY appointments_insert_patient_own
      ON public.appointments
      FOR INSERT
      WITH CHECK (
        patient_id IN (
          SELECT id
          FROM public.patients
          WHERE patient_user_id = auth.uid()
        )
      )
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'appointments_update_patient_own'
  ) THEN
    EXECUTE '
      CREATE POLICY appointments_update_patient_own
      ON public.appointments
      FOR UPDATE
      USING (
        patient_id IN (
          SELECT id
          FROM public.patients
          WHERE patient_user_id = auth.uid()
        )
      )
      WITH CHECK (
        patient_id IN (
          SELECT id
          FROM public.patients
          WHERE patient_user_id = auth.uid()
        )
      )
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'medical_practice_settings'
      AND policyname = 'medical_practice_settings_patient_read_primary_doctor'
  ) THEN
    EXECUTE '
      CREATE POLICY medical_practice_settings_patient_read_primary_doctor
      ON public.medical_practice_settings
      FOR SELECT
      USING (
        allow_patient_self_booking = TRUE
        AND user_id IN (
          SELECT primary_doctor_id
          FROM public.patients
          WHERE patient_user_id = auth.uid()
            AND primary_doctor_id IS NOT NULL
        )
      )
    ';
  END IF;
END
$$;
