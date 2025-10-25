-- =====================================================
-- Enable RLS on Tables with Missing RLS
-- Fecha: 2025-10-20
-- Descripcion: Habilita RLS en todas las tablas publicas que
-- tienen politicas pero no tienen RLS habilitado
-- =====================================================

-- Habilitar RLS en activity_logs
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en consultations
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en medical_records
ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en role_permissions
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en patient_registration_tokens
ALTER TABLE IF EXISTS public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Verificar que todas las tablas publicas tengan RLS habilitado
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
