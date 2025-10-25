-- Enable RLS on all public tables that need it
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Move extensions to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension
        WHERE extname = 'pg_trgm'
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move pg_trgm: %', SQLERRM;
END $$;

-- Move btree_gist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension
        WHERE extname = 'btree_gist'
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        ALTER EXTENSION btree_gist SET SCHEMA extensions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move btree_gist: %', SQLERRM;
END $$;

-- Verify RLS is enabled on all public tables
DO $$
DECLARE
    tables_without_rls INT := 0;
BEGIN
    SELECT COUNT(*) INTO tables_without_rls
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
    AND c.relrowsecurity = false;

    IF tables_without_rls = 0 THEN
        RAISE NOTICE 'SUCCESS: All public tables have RLS enabled';
    ELSE
        RAISE NOTICE 'WARNING: Found % tables without RLS', tables_without_rls;
    END IF;
END $$;
