-- Reconcile security posture for public tables detected by linter.
-- Uses IF EXISTS guards to avoid failing in environments with schema drift.

DO $$
BEGIN
  -- categories: read-only catalog for authenticated users.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'categories'
  ) THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.categories FROM PUBLIC;
    REVOKE ALL ON TABLE public.categories FROM anon;
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories FROM authenticated;
    GRANT SELECT ON TABLE public.categories TO authenticated;

    DROP POLICY IF EXISTS "categories_authenticated_read" ON public.categories;
    DROP POLICY IF EXISTS "categories_service_role_all" ON public.categories;

    CREATE POLICY "categories_authenticated_read"
      ON public.categories
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "categories_service_role_all"
      ON public.categories
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- scale_category_mapping: read-only catalog mapping for authenticated users.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'scale_category_mapping'
  ) THEN
    ALTER TABLE public.scale_category_mapping ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.scale_category_mapping FROM PUBLIC;
    REVOKE ALL ON TABLE public.scale_category_mapping FROM anon;
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.scale_category_mapping FROM authenticated;
    GRANT SELECT ON TABLE public.scale_category_mapping TO authenticated;

    DROP POLICY IF EXISTS "scale_category_mapping_authenticated_read" ON public.scale_category_mapping;
    DROP POLICY IF EXISTS "scale_category_mapping_service_role_all" ON public.scale_category_mapping;

    CREATE POLICY "scale_category_mapping_authenticated_read"
      ON public.scale_category_mapping
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "scale_category_mapping_service_role_all"
      ON public.scale_category_mapping
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- scale_usage_metrics: backend-only telemetry.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'scale_usage_metrics'
  ) THEN
    ALTER TABLE public.scale_usage_metrics ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.scale_usage_metrics FROM PUBLIC;
    REVOKE ALL ON TABLE public.scale_usage_metrics FROM anon;
    REVOKE ALL ON TABLE public.scale_usage_metrics FROM authenticated;

    DROP POLICY IF EXISTS "scale_usage_metrics_service_role_all" ON public.scale_usage_metrics;

    CREATE POLICY "scale_usage_metrics_service_role_all"
      ON public.scale_usage_metrics
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- system_settings: backend-only global configuration.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
  ) THEN
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.system_settings FROM PUBLIC;
    REVOKE ALL ON TABLE public.system_settings FROM anon;
    REVOKE ALL ON TABLE public.system_settings FROM authenticated;

    DROP POLICY IF EXISTS "system_settings_service_role_all" ON public.system_settings;

    CREATE POLICY "system_settings_service_role_all"
      ON public.system_settings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
