-- =====================================================
-- Permitir a administrative_assistant ejecutar RPCs de workload/summary
-- Fecha: 2026-02-18
-- Descripción: Los asistentes necesitan ver carga de personal y resumen de citas
--   para el panel operativo (Personal de la clínica, Agenda). Extiende el acceso.
-- =====================================================

BEGIN;

-- Garantizar que is_administrative_assistant existe (puede venir de 20260218100000)
CREATE OR REPLACE FUNCTION public.is_administrative_assistant(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
      AND role_in_clinic = 'administrative_assistant'
  );
$$;

-- Recrear get_clinic_appointments_summary: permitir admin O assistant
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
  IF NOT (
    public.is_super_admin()
    OR public.is_clinic_admin(p_clinic_id)
    OR public.is_administrative_assistant(p_clinic_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: not clinic admin or assistant';
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

-- Recrear get_staff_workload: permitir admin O assistant
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
  IF NOT (
    public.is_super_admin()
    OR public.is_clinic_admin(p_clinic_id)
    OR public.is_administrative_assistant(p_clinic_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: not clinic admin or assistant';
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

COMMIT;
