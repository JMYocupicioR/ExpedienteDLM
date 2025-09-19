-- Fix audit_logs table structure
-- Esta migración asegura que la tabla audit_logs tenga la estructura correcta

BEGIN;

-- Crear tabla audit_logs si no existe
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existe pero no tiene la columna record_id, agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'record_id'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN record_id TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS para audit_logs
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Users can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE role IN ('super_admin', 'admin_staff')
        )
    );

-- Política para insertar logs de auditoría (solo el sistema)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true); -- Permitir inserción desde triggers

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- Función de auditoría genérica
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo auditar si la tabla tiene un campo id
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id::TEXT,
            TG_OP,
            to_jsonb(OLD),
            auth.uid()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id::TEXT,
            TG_OP,
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id::TEXT,
            TG_OP,
            to_jsonb(NEW),
            auth.uid()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay error en auditoría, no fallar la operación principal
        RAISE WARNING 'Error in audit trigger: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger de auditoría a la tabla appointments (opcional)
-- DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
-- CREATE TRIGGER audit_appointments_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON public.appointments
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

COMMIT;
