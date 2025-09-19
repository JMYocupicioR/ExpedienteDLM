-- Script para deshabilitar triggers de auditoría problemáticos
-- Ejecutar si hay errores relacionados con audit_logs

BEGIN;

-- Deshabilitar triggers de auditoría en appointments si existen
DO $$
BEGIN
    -- Verificar si existe el trigger y deshabilitarlo
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'audit_appointments_trigger'
        AND event_object_table = 'appointments'
    ) THEN
        DROP TRIGGER audit_appointments_trigger ON public.appointments;
        RAISE NOTICE 'Trigger audit_appointments_trigger deshabilitado';
    ELSE
        RAISE NOTICE 'Trigger audit_appointments_trigger no existe';
    END IF;

    -- Verificar otros triggers de auditoría
    FOR rec IN (
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_name LIKE '%audit%'
        AND event_object_schema = 'public'
    ) LOOP
        RAISE NOTICE 'Trigger de auditoría encontrado: % en tabla %', rec.trigger_name, rec.event_object_table;
    END LOOP;
END $$;

-- Verificar si la tabla audit_logs existe y su estructura
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE NOTICE 'Tabla audit_logs existe';
        
        -- Verificar columnas
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            AND column_name = 'record_id'
        ) THEN
            RAISE NOTICE 'Columna record_id existe en audit_logs';
        ELSE
            RAISE NOTICE 'PROBLEMA: Columna record_id NO existe en audit_logs';
        END IF;
    ELSE
        RAISE NOTICE 'PROBLEMA: Tabla audit_logs NO existe';
    END IF;
END $$;

-- Mostrar estructura actual de audit_logs si existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'audit_logs'
AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;

SELECT 'Verificación de auditoría completada. Revisa los mensajes NOTICE arriba.' as mensaje;
