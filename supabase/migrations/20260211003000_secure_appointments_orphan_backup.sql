-- Secure technical backup table from PostgREST exposure.
-- Keep access restricted to backend/service role only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'appointments_orphan_backup'
  ) THEN
    ALTER TABLE public.appointments_orphan_backup ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.appointments_orphan_backup FROM PUBLIC;
    REVOKE ALL ON TABLE public.appointments_orphan_backup FROM anon;
    REVOKE ALL ON TABLE public.appointments_orphan_backup FROM authenticated;

    DROP POLICY IF EXISTS "appointments_orphan_backup_service_role_all"
      ON public.appointments_orphan_backup;

    CREATE POLICY "appointments_orphan_backup_service_role_all"
      ON public.appointments_orphan_backup
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
