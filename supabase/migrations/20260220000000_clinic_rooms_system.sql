-- =====================================================
-- MIGRATION: Clinic Rooms System
-- Description: Creates clinic_rooms, room_assignments,
--              adds columns to profiles and appointments,
--              conflict detection RPC, and RLS policies
-- Date: 2026-02-20
-- =====================================================

BEGIN;

-- 1. clinic_rooms table
CREATE TABLE IF NOT EXISTS public.clinic_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_name TEXT,
  floor TEXT,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  equipment TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_clinic_rooms_clinic ON public.clinic_rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_rooms_active ON public.clinic_rooms(clinic_id, is_active) WHERE is_active = true;

ALTER TABLE public.clinic_rooms ENABLE ROW LEVEL SECURITY;

-- clinic_rooms RLS: read for clinic members, write for admin/owner
CREATE POLICY "clinic_rooms_select" ON public.clinic_rooms
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_active_member(clinic_id)
  );

CREATE POLICY "clinic_rooms_insert" ON public.clinic_rooms
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.is_clinic_admin(clinic_id)
  );

CREATE POLICY "clinic_rooms_update" ON public.clinic_rooms
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.is_clinic_admin(clinic_id)
  );

CREATE POLICY "clinic_rooms_delete" ON public.clinic_rooms
  FOR DELETE USING (
    public.is_super_admin()
    OR public.is_clinic_admin(clinic_id)
  );

-- 2. room_assignments table
CREATE TABLE IF NOT EXISTS public.room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.clinic_rooms(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_staff ON public.room_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_clinic ON public.room_assignments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room ON public.room_assignments(room_id);

ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

-- room_assignments RLS
CREATE POLICY "room_assignments_select" ON public.room_assignments
  FOR SELECT USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_active_member(clinic_id)
  );

CREATE POLICY "room_assignments_insert" ON public.room_assignments
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.is_clinic_admin(clinic_id)
    OR (staff_id = auth.uid() AND public.is_active_member(clinic_id))
  );

CREATE POLICY "room_assignments_update" ON public.room_assignments
  FOR UPDATE USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_clinic_admin(clinic_id)
  );

CREATE POLICY "room_assignments_delete" ON public.room_assignments
  FOR DELETE USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_clinic_admin(clinic_id)
  );

-- 3. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepts_appointments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS physical_presence_schedule JSONB DEFAULT '[]';

COMMENT ON COLUMN public.profiles.accepts_appointments IS 'If false, doctor uses walk-in mode with physical presence schedule';
COMMENT ON COLUMN public.profiles.physical_presence_schedule IS 'Array of {day: 0-6, start: "08:00", end: "14:00"} for walk-in mode';

-- 4. Add room_id to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_room ON public.appointments(room_id);

-- 5. Trigger for updated_at on clinic_rooms
CREATE OR REPLACE FUNCTION public.update_clinic_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clinic_rooms_updated_at ON public.clinic_rooms;
CREATE TRIGGER trigger_update_clinic_rooms_updated_at
  BEFORE UPDATE ON public.clinic_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clinic_rooms_updated_at();

-- 6. RPC: check scheduling conflicts
CREATE OR REPLACE FUNCTION public.check_scheduling_conflicts(
  p_room_id UUID,
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflict_type TEXT,
  conflicting_appointment_id UUID,
  conflicting_doctor_id UUID,
  conflicting_title TEXT,
  conflicting_time_start TIME,
  conflicting_time_end TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_clinic_id UUID;
BEGIN
  -- Get clinic for room
  SELECT clinic_id INTO v_room_clinic_id FROM public.clinic_rooms WHERE id = p_room_id;

  -- Room conflict: another appointment in same room overlapping
  RETURN QUERY
  SELECT
    'room_conflict'::TEXT AS conflict_type,
    a.id AS conflicting_appointment_id,
    a.doctor_id AS conflicting_doctor_id,
    a.title AS conflicting_title,
    a.appointment_time AS conflicting_time_start,
    (a.appointment_time + (a.duration || ' minutes')::INTERVAL)::TIME AS conflicting_time_end
  FROM public.appointments a
  WHERE a.room_id = p_room_id
    AND a.appointment_date = p_appointment_date
    AND a.status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND (
      (a.appointment_time, (a.appointment_time + (a.duration || ' minutes')::INTERVAL)::TIME)
      OVERLAPS (p_start_time, p_end_time)
    );

  -- Doctor conflict: same doctor with overlapping appointment in any room
  RETURN QUERY
  SELECT
    'doctor_conflict'::TEXT AS conflict_type,
    a.id AS conflicting_appointment_id,
    a.doctor_id AS conflicting_doctor_id,
    a.title AS conflicting_title,
    a.appointment_time AS conflicting_time_start,
    (a.appointment_time + (a.duration || ' minutes')::INTERVAL)::TIME AS conflicting_time_end
  FROM public.appointments a
  WHERE a.doctor_id = p_doctor_id
    AND a.appointment_date = p_appointment_date
    AND a.status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND (
      (a.appointment_time, (a.appointment_time + (a.duration || ' minutes')::INTERVAL)::TIME)
      OVERLAPS (p_start_time, p_end_time)
    );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.check_scheduling_conflicts(
  UUID, UUID, DATE, TIME, TIME, UUID
) TO authenticated;

-- 7. Update manual_insert_appointment to support room_id
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
  p_notes TEXT DEFAULT NULL,
  p_room_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    p_doctor_id = auth.uid()
    OR (p_clinic_id IS NOT NULL AND public.is_clinic_admin(p_clinic_id))
    OR (p_clinic_id IS NOT NULL AND public.is_administrative_assistant(p_clinic_id))
  ) THEN
    RAISE EXCEPTION 'Access denied: cannot create appointment for this doctor';
  END IF;

  IF p_doctor_id <> auth.uid() AND p_clinic_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clinic_user_relationships
      WHERE user_id = p_doctor_id
        AND clinic_id = p_clinic_id
        AND status = 'approved'
        AND is_active = true
        AND role_in_clinic <> 'administrative_assistant'
    ) THEN
      RAISE EXCEPTION 'Access denied: doctor must be in the same clinic';
    END IF;
  END IF;

  INSERT INTO public.appointments (
    id, doctor_id, patient_id, clinic_id, title, appointment_date, appointment_time,
    description, duration, status, type, location, notes, room_id
  ) VALUES (
    p_id, p_doctor_id, p_patient_id, p_clinic_id, p_title, p_appointment_date, p_appointment_time,
    p_description, p_duration, p_status, p_type, p_location, p_notes, p_room_id
  );
END;
$$;

-- 8. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_assignments TO authenticated;

COMMIT;
