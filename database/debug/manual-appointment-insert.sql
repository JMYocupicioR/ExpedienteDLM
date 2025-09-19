-- Función manual para insertar citas evitando triggers problemáticos

BEGIN;

-- Crear función que inserte citas manualmente
CREATE OR REPLACE FUNCTION manual_insert_appointment(
    p_id UUID,
    p_doctor_id UUID,
    p_patient_id UUID,
    p_clinic_id UUID,
    p_title TEXT,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_description TEXT DEFAULT NULL,
    p_duration INTEGER DEFAULT 30,
    p_status TEXT DEFAULT 'scheduled',
    p_type TEXT DEFAULT 'consultation',
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    inserted_id UUID;
BEGIN
    -- Insertar directamente con SQL para evitar triggers
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
        p_id,
        p_doctor_id,
        p_patient_id,
        p_clinic_id,
        p_title,
        p_description,
        p_appointment_date,
        p_appointment_time,
        p_duration,
        p_status,
        p_type,
        p_location,
        p_notes,
        false,
        NOW(),
        NOW()
    );
    
    RETURN p_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando cita: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos
GRANT EXECUTE ON FUNCTION manual_insert_appointment(UUID, UUID, UUID, UUID, TEXT, DATE, TIME, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

SELECT 'Función manual_insert_appointment creada' as resultado;
