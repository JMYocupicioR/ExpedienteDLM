-- Multi-personal appointments: appointment_assignments + staff_schedules
-- Keeps appointments.doctor_id for backwards compatibility (primary doctor).
-- appointment_assignments allows secondary staff (nurse, physio, etc).

BEGIN;

-- 1. appointment_assignments: links staff to appointments
CREATE TABLE IF NOT EXISTS public.appointment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL DEFAULT 'assistant', -- 'primary', 'assistant', 'nurse', 'physiotherapist'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(appointment_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_assignments_appointment
  ON public.appointment_assignments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_assignments_staff
  ON public.appointment_assignments(staff_id, assigned_at DESC);

ALTER TABLE public.appointment_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: clinic members see assignments for their clinic's appointments
CREATE POLICY "appointment_assignments_select" ON public.appointment_assignments
  FOR SELECT USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_assignments.appointment_id
        AND (
          a.doctor_id = auth.uid()
          OR (
            a.clinic_id IS NOT NULL
            AND public.is_active_member(a.clinic_id)
          )
        )
    )
  );

CREATE POLICY "appointment_assignments_insert" ON public.appointment_assignments
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_assignments.appointment_id
        AND (
          a.doctor_id = auth.uid()
          OR (a.clinic_id IS NOT NULL AND public.is_clinic_admin(a.clinic_id))
        )
    )
  );

CREATE POLICY "appointment_assignments_update" ON public.appointment_assignments
  FOR UPDATE USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_assignments.appointment_id
        AND a.clinic_id IS NOT NULL
        AND public.is_clinic_admin(a.clinic_id)
    )
  );

CREATE POLICY "appointment_assignments_delete" ON public.appointment_assignments
  FOR DELETE USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_assignments.appointment_id
        AND (
          a.doctor_id = auth.uid()
          OR (a.clinic_id IS NOT NULL AND public.is_clinic_admin(a.clinic_id))
        )
    )
  );

-- 2. staff_schedules: availability by staff per clinic
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_clinic
  ON public.staff_schedules(staff_id, clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_clinic_day
  ON public.staff_schedules(clinic_id, day_of_week);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_schedules_select" ON public.staff_schedules
  FOR SELECT USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_active_member(clinic_id)
  );

CREATE POLICY "staff_schedules_insert" ON public.staff_schedules
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_clinic_admin(clinic_id)
  );

CREATE POLICY "staff_schedules_update" ON public.staff_schedules
  FOR UPDATE USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_clinic_admin(clinic_id)
  );

CREATE POLICY "staff_schedules_delete" ON public.staff_schedules
  FOR DELETE USING (
    public.is_super_admin()
    OR staff_id = auth.uid()
    OR public.is_clinic_admin(clinic_id)
  );

-- 3. RPC: get clinic appointments summary for admin
CREATE OR REPLACE FUNCTION public.get_clinic_appointments_summary(
  p_clinic_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  staff_role TEXT,
  total_appointments BIGINT,
  completed BIGINT,
  scheduled BIGINT,
  cancelled BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.is_clinic_admin(p_clinic_id)) THEN
    RAISE EXCEPTION 'Access denied: not clinic admin';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS staff_id,
    p.full_name AS staff_name,
    cur.role_in_clinic::TEXT AS staff_role,
    COUNT(a.id)::BIGINT AS total_appointments,
    COUNT(a.id) FILTER (WHERE a.status = 'completed')::BIGINT AS completed,
    COUNT(a.id) FILTER (WHERE a.status IN ('scheduled', 'confirmed', 'confirmed_by_patient', 'in_progress'))::BIGINT AS scheduled,
    COUNT(a.id) FILTER (WHERE a.status IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show'))::BIGINT AS cancelled
  FROM public.clinic_user_relationships cur
  JOIN public.profiles p ON p.id = cur.user_id
  LEFT JOIN public.appointments a ON a.doctor_id = cur.user_id
    AND a.clinic_id = p_clinic_id
    AND a.appointment_date >= p_date_from
    AND a.appointment_date <= p_date_to
  WHERE cur.clinic_id = p_clinic_id
    AND cur.status = 'approved'
    AND cur.is_active = true
  GROUP BY p.id, p.full_name, cur.role_in_clinic;
END;
$$;

-- 4. RPC: get staff workload (citas por personal en rango)
CREATE OR REPLACE FUNCTION public.get_staff_workload(
  p_clinic_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  role_in_clinic TEXT,
  appointment_count BIGINT,
  completed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.is_clinic_admin(p_clinic_id)) THEN
    RAISE EXCEPTION 'Access denied: not clinic admin';
  END IF;

  RETURN QUERY
  SELECT
    cur.user_id AS staff_id,
    pr.full_name,
    cur.role_in_clinic::TEXT,
    COUNT(a.id)::BIGINT AS appointment_count,
    COUNT(a.id) FILTER (WHERE a.status = 'completed')::BIGINT AS completed_count
  FROM public.clinic_user_relationships cur
  JOIN public.profiles pr ON pr.id = cur.user_id
  LEFT JOIN public.appointments a ON a.doctor_id = cur.user_id
    AND a.clinic_id = p_clinic_id
    AND a.appointment_date >= p_date_from
    AND a.appointment_date <= p_date_to
    AND a.status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient')
  WHERE cur.clinic_id = p_clinic_id
    AND cur.status = 'approved'
    AND cur.is_active = true
    AND (p_staff_id IS NULL OR cur.user_id = p_staff_id)
  GROUP BY cur.user_id, pr.full_name, cur.role_in_clinic;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_appointments_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_workload(UUID, DATE, DATE, UUID) TO authenticated;

COMMIT;
