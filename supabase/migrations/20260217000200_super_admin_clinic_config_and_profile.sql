-- Super Admin: full clinic profile and config access
-- 1) Add profile columns to clinics if not present
-- 2) Allow super_admin to SELECT/UPDATE clinic_configurations

BEGIN;

-- Add clinic profile columns (safe if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'phone') THEN
    ALTER TABLE public.clinics ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'email') THEN
    ALTER TABLE public.clinics ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'website') THEN
    ALTER TABLE public.clinics ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'description') THEN
    ALTER TABLE public.clinics ADD COLUMN description TEXT;
  END IF;
END $$;

-- Super admin: full access to clinic_configurations
DROP POLICY IF EXISTS "clinic_config_super_admin_select" ON public.clinic_configurations;
CREATE POLICY "clinic_config_super_admin_select" ON public.clinic_configurations
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "clinic_config_super_admin_update" ON public.clinic_configurations;
CREATE POLICY "clinic_config_super_admin_update" ON public.clinic_configurations
  FOR UPDATE USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMIT;
