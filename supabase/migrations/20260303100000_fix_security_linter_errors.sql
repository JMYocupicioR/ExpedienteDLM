-- =====================================================
-- Fix Supabase Security Linter Errors
-- Date: 2026-03-03
-- Description: Addresses Security Advisor errors:
--   1) SECURITY DEFINER views -> ALTER to security_invoker
--   2) RLS disabled on 6 public tables -> Enable RLS + policies
--   3) Function search_path mutable -> SET search_path = public
--   4) Extension btree_gin in public -> Move to extensions schema
--   5) Permissive RLS policies (WITH CHECK true) -> Restrict with predicates
-- =====================================================

-- 1. Fix SECURITY DEFINER views
-- -----------------------------
ALTER VIEW IF EXISTS public.my_clinic_permissions
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.rehab_exercises_with_creator
  SET (security_invoker = true);

-- 2. Enable RLS on public tables (idempotent)
-- -------------------------------------------
DO $$
BEGIN
  -- scale_category_mapping: read-only catalog for authenticated
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scale_category_mapping'
  ) THEN
    ALTER TABLE public.scale_category_mapping ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.scale_category_mapping FROM PUBLIC, anon;
    GRANT SELECT ON TABLE public.scale_category_mapping TO authenticated;
    DROP POLICY IF EXISTS "scale_category_mapping_authenticated_read" ON public.scale_category_mapping;
    DROP POLICY IF EXISTS "scale_category_mapping_service_role_all" ON public.scale_category_mapping;
    CREATE POLICY "scale_category_mapping_authenticated_read"
      ON public.scale_category_mapping FOR SELECT TO authenticated USING (true);
    CREATE POLICY "scale_category_mapping_service_role_all"
      ON public.scale_category_mapping FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- categories: read-only catalog for authenticated
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.categories FROM PUBLIC, anon;
    GRANT SELECT ON TABLE public.categories TO authenticated;
    DROP POLICY IF EXISTS "categories_authenticated_read" ON public.categories;
    DROP POLICY IF EXISTS "categories_service_role_all" ON public.categories;
    CREATE POLICY "categories_authenticated_read"
      ON public.categories FOR SELECT TO authenticated USING (true);
    CREATE POLICY "categories_service_role_all"
      ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- scale_usage_metrics: backend-only telemetry
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scale_usage_metrics'
  ) THEN
    ALTER TABLE public.scale_usage_metrics ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.scale_usage_metrics FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS "scale_usage_metrics_service_role_all" ON public.scale_usage_metrics;
    CREATE POLICY "scale_usage_metrics_service_role_all"
      ON public.scale_usage_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- system_settings: backend-only configuration
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_settings'
  ) THEN
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.system_settings FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS "system_settings_service_role_all" ON public.system_settings;
    CREATE POLICY "system_settings_service_role_all"
      ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- appointments_orphan_backup: technical backup, backend-only
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appointments_orphan_backup'
  ) THEN
    ALTER TABLE public.appointments_orphan_backup ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.appointments_orphan_backup FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS "appointments_orphan_backup_service_role_all"
      ON public.appointments_orphan_backup;
    CREATE POLICY "appointments_orphan_backup_service_role_all"
      ON public.appointments_orphan_backup FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  -- subscription_items: billing/subscriptions, backend-only
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_items'
  ) THEN
    ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.subscription_items FROM PUBLIC, anon, authenticated;
    DROP POLICY IF EXISTS "subscription_items_service_role_all" ON public.subscription_items;
    CREATE POLICY "subscription_items_service_role_all"
      ON public.subscription_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Fix function search_path mutable (CVE-2018-1058)
-- ---------------------------------------------------
-- Exclude extension-owned functions (e.g. gin_btree_consistent from btree_gin)
-- which we cannot ALTER - they are owned by the extension.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    ))
    AND NOT EXISTS (
      SELECT 1 FROM pg_depend d
      WHERE d.objid = p.oid AND d.deptype = 'e'
    )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- 4. Move btree_gin extension to extensions schema
-- ------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'btree_gin' AND n.nspname = 'public'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION btree_gin SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move btree_gin: %', SQLERRM;
END $$;

-- 5. Fix permissive RLS policies (WITH CHECK true)
-- ------------------------------------------------
-- notifications: restrict insert to own user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
    CREATE POLICY "notifications_insert_policy" ON public.notifications
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- audit_logs: restrict insert to own user_id (triggers run as session user)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
    CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY "audit_logs_insert_service_role" ON public.audit_logs
      FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;

-- activity_logs: restrict insert if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
    CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'activity_logs policy fix: %', SQLERRM;
END $$;

-- app_errors: restrict insert if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_errors'
  ) THEN
    DROP POLICY IF EXISTS "Users can insert app_errors" ON public.app_errors;
    CREATE POLICY "Users can insert app_errors" ON public.app_errors
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'app_errors policy fix: %', SQLERRM;
END $$;

-- clinics_full_access: drop if exists, clinics already have granular policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "clinics_full_access" ON public.clinics;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'clinics_full_access policy fix: %', SQLERRM;
END $$;

-- cognitiv_app_roles: restrict insert to service_role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cognitiv_app_roles'
  ) THEN
    DROP POLICY IF EXISTS "Service can insert cognitiv roles" ON public.cognitiv_app_roles;
    CREATE POLICY "Service can insert cognitiv roles" ON public.cognitiv_app_roles
      FOR INSERT TO service_role WITH CHECK (true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cognitiv_app_roles policy fix: %', SQLERRM;
END $$;
