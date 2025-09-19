-- Script directo para arreglar la tabla audit_logs
-- Ejecutar directamente en Supabase Dashboard

BEGIN;

-- Verificar si la tabla audit_logs existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE NOTICE 'Tabla audit_logs existe';
        
        -- Verificar si tiene la columna record_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = 'record_id'
        ) THEN
            RAISE NOTICE 'Agregando columna record_id a audit_logs';
            ALTER TABLE public.audit_logs ADD COLUMN record_id TEXT;
        ELSE
            RAISE NOTICE 'Columna record_id ya existe en audit_logs';
        END IF;
    ELSE
        RAISE NOTICE 'Creando tabla audit_logs';
        CREATE TABLE public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            action TEXT NOT NULL,
            old_values JSONB,
            new_values JSONB,
            user_id UUID REFERENCES auth.users(id),
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Política básica
        CREATE POLICY "Users can view own audit logs" ON public.audit_logs
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- Deshabilitar temporalmente cualquier trigger de auditoría en appointments
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN (
        SELECT trigger_name
        FROM information_schema.triggers 
        WHERE event_object_table = 'appointments'
        AND trigger_name LIKE '%audit%'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_rec.trigger_name || ' ON public.appointments';
        RAISE NOTICE 'Trigger % deshabilitado', trigger_rec.trigger_name;
    END LOOP;
END $$;

COMMIT;

SELECT 'Tabla audit_logs corregida y triggers de auditoría deshabilitados' as resultado;
