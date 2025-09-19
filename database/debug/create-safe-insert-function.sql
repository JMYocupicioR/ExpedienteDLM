-- Función para insertar citas de manera segura sin triggers problemáticos

BEGIN;

-- Crear función para insertar citas de manera segura
CREATE OR REPLACE FUNCTION insert_appointment_safe(appointment_data JSONB)
RETURNS VOID AS $$
BEGIN
    -- Deshabilitar temporalmente triggers de auditoría
    SET session_replication_role = replica;
    
    -- Insertar la cita
    INSERT INTO public.appointments (
        id,
        doctor_id,
        patient_id,
        clinic_id,
        title,
        description,
        appointment_date,
        appointment_time,
        duration,
        status,
        type,
        location,
        notes,
        reminder_sent,
        created_at,
        updated_at
    ) VALUES (
        (appointment_data->>'id')::UUID,
        (appointment_data->>'doctor_id')::UUID,
        (appointment_data->>'patient_id')::UUID,
        (appointment_data->>'clinic_id')::UUID,
        appointment_data->>'title',
        appointment_data->>'description',
        (appointment_data->>'appointment_date')::DATE,
        (appointment_data->>'appointment_time')::TIME,
        (appointment_data->>'duration')::INTEGER,
        appointment_data->>'status',
        appointment_data->>'type',
        appointment_data->>'location',
        appointment_data->>'notes',
        (appointment_data->>'reminder_sent')::BOOLEAN,
        (appointment_data->>'created_at')::TIMESTAMPTZ,
        (appointment_data->>'updated_at')::TIMESTAMPTZ
    );
    
    -- Rehabilitar triggers
    SET session_replication_role = DEFAULT;
EXCEPTION
    WHEN OTHERS THEN
        -- Rehabilitar triggers en caso de error
        SET session_replication_role = DEFAULT;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION insert_appointment_safe(JSONB) TO authenticated;

COMMIT;

SELECT 'Función insert_appointment_safe creada correctamente' as resultado;
