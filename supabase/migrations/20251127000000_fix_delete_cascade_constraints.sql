-- Fix Foreign Key constraints to allow clinic deletion

DO $$
BEGIN
  -- 1. patients: Switch from NO ACTION to CASCADE
  -- If a clinic is deleted, its patients should be deleted.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'patients'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinics'
  ) THEN
    ALTER TABLE public.patients
    DROP CONSTRAINT IF EXISTS patients_clinic_id_fkey,
    ADD CONSTRAINT patients_clinic_id_fkey
      FOREIGN KEY (clinic_id)
      REFERENCES public.clinics(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  -- 2. clinical_rules: Switch from NO ACTION to CASCADE
  -- Rules belong to a clinic.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinical_rules'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinics'
  ) THEN
    ALTER TABLE public.clinical_rules
    DROP CONSTRAINT IF EXISTS clinical_rules_clinic_id_fkey,
    ADD CONSTRAINT clinical_rules_clinic_id_fkey
      FOREIGN KEY (clinic_id)
      REFERENCES public.clinics(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  -- 3. profiles: Switch from NO ACTION to SET NULL
  -- Users might exist without a clinic, or be re-assigned.
  -- Deleting a clinic should not delete the user account, just unlink it.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinics'
  ) THEN
    ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_clinic_id_fkey,
    ADD CONSTRAINT profiles_clinic_id_fkey
      FOREIGN KEY (clinic_id)
      REFERENCES public.clinics(id)
      ON DELETE SET NULL;
  END IF;
END $$;
