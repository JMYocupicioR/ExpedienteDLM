-- Add missing profile columns to clinics table
-- These are needed by PersonalClinicModal, PersonalClinicSettings, and Settings

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'logo_url') THEN
    ALTER TABLE public.clinics ADD COLUMN logo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'tax_id') THEN
    ALTER TABLE public.clinics ADD COLUMN tax_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'director_name') THEN
    ALTER TABLE public.clinics ADD COLUMN director_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'director_license') THEN
    ALTER TABLE public.clinics ADD COLUMN director_license TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'settings') THEN
    ALTER TABLE public.clinics ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMIT;
