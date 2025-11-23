-- Enhanced Appointments System with Google Calendar Integration
-- This migration creates a comprehensive appointment management system

BEGIN;

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,

    -- Basic appointment info
    title TEXT NOT NULL,
    description TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30, -- minutes

    -- Status and type
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'confirmed_by_patient', 'in_progress',
        'completed', 'cancelled_by_clinic', 'cancelled_by_patient', 'no_show'
    )),
    type TEXT NOT NULL DEFAULT 'consultation' CHECK (type IN (
        'consultation', 'follow_up', 'check_up', 'procedure', 'emergency', 'telemedicine'
    )),

    -- Location and logistics
    location TEXT,
    room_number TEXT,
    notes TEXT,

    -- Google Calendar integration
    google_calendar_event_id TEXT,
    google_calendar_sync_enabled BOOLEAN DEFAULT false,
    google_calendar_last_sync TIMESTAMPTZ,

    -- Notifications and reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    confirmation_required BOOLEAN DEFAULT true,
    confirmed_at TIMESTAMPTZ,

    -- Medical integration
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure no overlapping appointments for same doctor
    EXCLUDE USING gist (
        doctor_id WITH =,
        tsrange(
            (appointment_date::text || ' ' || appointment_time::text)::timestamp,
            (appointment_date::text || ' ' || appointment_time::text)::timestamp + (duration || ' minutes')::interval
        ) WITH &&
    ) WHERE (status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show'))
);

-- Create Google Calendar integration table
CREATE TABLE IF NOT EXISTS public.google_calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Google API credentials
    google_calendar_id TEXT NOT NULL,
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expires_at TIMESTAMPTZ,

    -- Sync settings
    sync_enabled BOOLEAN DEFAULT false,
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')),
    auto_create_events BOOLEAN DEFAULT true,
    auto_update_events BOOLEAN DEFAULT true,
    sync_past_events BOOLEAN DEFAULT false,
    sync_future_days INTEGER DEFAULT 365,

    -- Notification preferences
    default_reminder_minutes INTEGER DEFAULT 15,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,

    -- Last sync info
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'success', 'error')),
    last_sync_error TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(doctor_id)
);

-- Create appointment notifications table
CREATE TABLE IF NOT EXISTS public.appointment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,

    -- Notification details
    type TEXT NOT NULL CHECK (type IN ('reminder', 'confirmation', 'cancellation', 'rescheduling')),
    method TEXT NOT NULL CHECK (method IN ('email', 'sms', 'push', 'whatsapp')),
    recipient TEXT NOT NULL, -- email or phone number

    -- Content
    subject TEXT,
    message TEXT NOT NULL,
    template_used TEXT,

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create appointment availability slots table
CREATE TABLE IF NOT EXISTS public.appointment_availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,

    -- Time slot definition
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Slot configuration
    slot_duration INTEGER NOT NULL DEFAULT 30, -- minutes
    buffer_time INTEGER DEFAULT 0, -- minutes between appointments
    max_appointments_per_slot INTEGER DEFAULT 1,

    -- Availability settings
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_until DATE,

    -- Special settings
    appointment_types TEXT[] DEFAULT ARRAY['consultation', 'follow_up', 'check_up'],
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (start_time < end_time)
);

-- Create appointment conflicts log
CREATE TABLE IF NOT EXISTS public.appointment_conflicts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Conflict details
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('time_overlap', 'double_booking', 'availability_mismatch')),
    conflict_description TEXT NOT NULL,
    conflicting_appointment_ids UUID[],

    -- Resolution
    resolved BOOLEAN DEFAULT false,
    resolution_action TEXT CHECK (resolution_action IN ('rescheduled', 'cancelled', 'forced_override')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_conflicts_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Users can view appointments they are involved in" ON public.appointments
    FOR SELECT USING (
        doctor_id = auth.uid() OR
        patient_id IN (
            SELECT id FROM public.patients
            WHERE responsible_doctor_id = auth.uid()
        ) OR
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_staff
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Doctors can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (
        doctor_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_staff
            WHERE user_id = auth.uid() AND role IN ('administrator', 'doctor') AND status = 'active'
        )
    );

CREATE POLICY "Doctors can update their appointments" ON public.appointments
    FOR UPDATE USING (
        doctor_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_staff
            WHERE user_id = auth.uid() AND role IN ('administrator', 'doctor') AND status = 'active'
        )
    );

CREATE POLICY "Doctors can delete their appointments" ON public.appointments
    FOR DELETE USING (
        doctor_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_staff
            WHERE user_id = auth.uid() AND role = 'administrator' AND status = 'active'
        )
    );

-- RLS Policies for Google Calendar settings
CREATE POLICY "Users can manage their own calendar settings" ON public.google_calendar_settings
    FOR ALL USING (doctor_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view notifications for their appointments" ON public.appointment_notifications
    FOR SELECT USING (
        appointment_id IN (
            SELECT id FROM public.appointments
            WHERE doctor_id = auth.uid()
        )
    );

-- RLS Policies for availability slots
CREATE POLICY "Users can manage their availability slots" ON public.appointment_availability_slots
    FOR ALL USING (
        doctor_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_staff
            WHERE user_id = auth.uid() AND role IN ('administrator', 'doctor') AND status = 'active'
        )
    );

-- RLS Policies for conflicts log
CREATE POLICY "Users can view conflicts for their appointments" ON public.appointment_conflicts_log
    FOR SELECT USING (
        doctor_id = auth.uid() OR
        resolved_by = auth.uid()
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON public.appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event ON public.appointments(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_consultation ON public.appointments(consultation_id) WHERE consultation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_calendar_settings_doctor ON public.google_calendar_settings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_settings_sync ON public.google_calendar_settings(sync_enabled, last_sync_at);

CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON public.appointment_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled ON public.appointment_notifications(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON public.appointment_availability_slots(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_active ON public.appointment_availability_slots(is_active, effective_from, effective_until);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_settings_updated_at
    BEFORE UPDATE ON public.google_calendar_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_slots_updated_at
    BEFORE UPDATE ON public.appointment_availability_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflicts(
    p_doctor_id UUID,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_duration INTEGER,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    conflicting_appointments UUID[]
) AS $$
DECLARE
    appointment_start TIMESTAMP;
    appointment_end TIMESTAMP;
    conflicts UUID[];
BEGIN
    -- Calculate appointment time range
    appointment_start := (p_appointment_date::text || ' ' || p_appointment_time::text)::timestamp;
    appointment_end := appointment_start + (p_duration || ' minutes')::interval;

    -- Find conflicting appointments
    SELECT ARRAY(
        SELECT id
        FROM public.appointments
        WHERE doctor_id = p_doctor_id
        AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
        AND status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
        AND tsrange(
            (appointment_date::text || ' ' || appointment_time::text)::timestamp,
            (appointment_date::text || ' ' || appointment_time::text)::timestamp + (duration || ' minutes')::interval
        ) && tsrange(appointment_start, appointment_end)
    ) INTO conflicts;

    RETURN QUERY SELECT
        array_length(conflicts, 1) > 0,
        conflicts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get available time slots
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_doctor_id UUID,
    p_date DATE,
    p_duration INTEGER DEFAULT 30
)
RETURNS TABLE(
    slot_time TIME,
    is_available BOOLEAN,
    appointment_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH doctor_availability AS (
        SELECT
            start_time,
            end_time,
            slot_duration
        FROM public.appointment_availability_slots
        WHERE doctor_id = p_doctor_id
        AND day_of_week = EXTRACT(DOW FROM p_date)
        AND is_active = true
        AND (effective_from IS NULL OR effective_from <= p_date)
        AND (effective_until IS NULL OR effective_until >= p_date)
    ),
    time_slots AS (
        SELECT
            generate_series(
                start_time::time,
                end_time::time - (slot_duration || ' minutes')::interval,
                (slot_duration || ' minutes')::interval
            )::time as slot_time,
            slot_duration
        FROM doctor_availability
    ),
    existing_appointments AS (
        SELECT
            appointment_time,
            duration,
            id as appointment_id
        FROM public.appointments
        WHERE doctor_id = p_doctor_id
        AND appointment_date = p_date
        AND status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
    )
    SELECT
        ts.slot_time,
        ea.appointment_id IS NULL as is_available,
        ea.appointment_id
    FROM time_slots ts
    LEFT JOIN existing_appointments ea ON (
        tsrange(
            (p_date::text || ' ' || ts.slot_time::text)::timestamp,
            (p_date::text || ' ' || ts.slot_time::text)::timestamp + (p_duration || ' minutes')::interval
        ) && tsrange(
            (p_date::text || ' ' || ea.appointment_time::text)::timestamp,
            (p_date::text || ' ' || ea.appointment_time::text)::timestamp + (ea.duration || ' minutes')::interval
        )
    )
    ORDER BY ts.slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default availability slots for doctors (Monday to Friday, 9 AM to 5 PM)
INSERT INTO public.appointment_availability_slots (doctor_id, day_of_week, start_time, end_time, slot_duration)
SELECT
    id as doctor_id,
    generate_series(1, 5) as day_of_week, -- Monday to Friday
    '09:00:00'::time as start_time,
    '17:00:00'::time as end_time,
    30 as slot_duration
FROM public.profiles
WHERE role = 'doctor'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.appointments IS 'Medical appointments with Google Calendar integration';
COMMENT ON TABLE public.google_calendar_settings IS 'Google Calendar synchronization settings per doctor';
COMMENT ON TABLE public.appointment_notifications IS 'Notification history and queue for appointments';
COMMENT ON TABLE public.appointment_availability_slots IS 'Doctor availability configuration';
COMMENT ON TABLE public.appointment_conflicts_log IS 'Log of appointment scheduling conflicts';

COMMIT;