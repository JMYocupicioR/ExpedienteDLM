-- =====================================================
-- MIGRATION: Create Appointments Table
-- Description: Creates the appointments table with all necessary fields,
--              indexes, constraints, RLS policies, and helper functions
-- Date: 2026-02-08
-- =====================================================

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

-- Appointment status enum
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'confirmed_by_patient',
    'in_progress',
    'completed',
    'cancelled_by_clinic',
    'cancelled_by_patient',
    'no_show'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Appointment type enum
DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM (
    'consultation',
    'follow_up',
    'check_up',
    'procedure',
    'emergency',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  
  -- Appointment details
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30, -- in minutes
  
  -- Status and type
  status appointment_status NOT NULL DEFAULT 'scheduled',
  type appointment_type NOT NULL DEFAULT 'consultation',
  
  -- Additional information
  location TEXT,
  notes TEXT,
  
  -- Notifications
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  
  -- Google Calendar integration (for future use)
  google_calendar_event_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (duration > 0 AND duration <= 480),
  CONSTRAINT valid_date CHECK (appointment_date >= CURRENT_DATE)
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Index for appointments by patient
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
  ON public.appointments (patient_id, appointment_date DESC, appointment_time DESC);

-- Index for appointments by doctor
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
  ON public.appointments (doctor_id, appointment_date DESC, appointment_time DESC);

-- Index for appointments by clinic
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON public.appointments (clinic_id, appointment_date DESC)
  WHERE clinic_id IS NOT NULL;

-- Index for appointments by status and date (for filtering)
CREATE INDEX IF NOT EXISTS idx_appointments_status_date
  ON public.appointments (status, appointment_date DESC);

-- Index for conflict detection (overlapping appointments)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_datetime
  ON public.appointments (doctor_id, appointment_date, appointment_time);

-- Index for Google Calendar sync
CREATE INDEX IF NOT EXISTS idx_appointments_google_event
  ON public.appointments (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can view appointments from their clinic or where they are the doctor/patient
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
CREATE POLICY "appointments_select_policy" ON public.appointments
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
    OR doctor_id = auth.uid()
    OR patient_id IN (
      SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid()
    )
  );

-- Policy: Users can insert appointments in their clinic or as a doctor
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
CREATE POLICY "appointments_insert_policy" ON public.appointments
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
    OR doctor_id = auth.uid()
  );

-- Policy: Users can update appointments from their clinic or where they are the doctor
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
CREATE POLICY "appointments_update_policy" ON public.appointments
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
    )
    OR doctor_id = auth.uid()
  );

-- Policy: Only clinic admins and doctors can delete appointments
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
CREATE POLICY "appointments_delete_policy" ON public.appointments
  FOR DELETE
  USING (
    doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE user_id = auth.uid()
        AND clinic_id = appointments.clinic_id
        AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function: Manual insert appointment (used by enhanced-appointment-service)
CREATE OR REPLACE FUNCTION public.manual_insert_appointment(
  p_id UUID,
  p_doctor_id UUID,
  p_patient_id UUID,
  p_clinic_id UUID,
  p_title TEXT,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_description TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 30,
  p_status appointment_status DEFAULT 'scheduled',
  p_type appointment_type DEFAULT 'consultation',
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.appointments (
    id,
    doctor_id,
    patient_id,
    clinic_id,
    title,
    appointment_date,
    appointment_time,
    description,
    duration,
    status,
    type,
    location,
    notes
  ) VALUES (
    p_id,
    p_doctor_id,
    p_patient_id,
    p_clinic_id,
    p_title,
    p_appointment_date,
    p_appointment_time,
    p_description,
    p_duration,
    p_status,
    p_type,
    p_location,
    p_notes
  );
END;
$$;

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on appointments
DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON public.appointments;
CREATE TRIGGER trigger_update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_appointments_updated_at();

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Grant usage on sequences (if any were created)
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 8. ADD COMMENTS
-- =====================================================

COMMENT ON TABLE public.appointments IS 'Stores medical appointments for patients with doctors in clinics';
COMMENT ON COLUMN public.appointments.duration IS 'Appointment duration in minutes (1-480)';
COMMENT ON COLUMN public.appointments.status IS 'Current status of the appointment';
COMMENT ON COLUMN public.appointments.type IS 'Type/category of the appointment';
COMMENT ON COLUMN public.appointments.google_calendar_event_id IS 'Google Calendar event ID for synchronization';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
