-- =====================================================
-- Fix Supabase linter security errors
-- Date: 2026-02-11
-- Description:
--   1) Force SECURITY INVOKER behavior for my_clinic_permissions
--   2) Lock down orphan public tables by enabling/forcing RLS and revoking direct grants
--   3) Document orphan-table status for future cleanup
-- =====================================================

-- 1) Fix SECURITY DEFINER view warning
-- Explicitly enforce invoker rights if the view exists.
ALTER VIEW IF EXISTS public.my_clinic_permissions
  SET (security_invoker = on);

-- 2) Lock down orphan/unused tables flagged by linter
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'scale_category_mapping',
    'categories',
    'scale_usage_metrics',
    'system_settings',
    'appointments_orphan_backup'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
      EXECUTE format(
        'COMMENT ON TABLE public.%I IS %L',
        t,
        'ORPHAN: Not used in application. Candidate for removal after data verification.'
      );
    END IF;
  END LOOP;
END $$;
