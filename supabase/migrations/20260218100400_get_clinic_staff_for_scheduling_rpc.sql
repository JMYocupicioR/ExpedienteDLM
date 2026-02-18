-- =====================================================
-- RPC: Personal de clínica para asignación de citas
-- Fecha: 2026-02-18
-- Descripción: Devuelve staff elegible para citas (owner, director, doctor, etc.)
--   Excluye administrative_assistant. SECURITY DEFINER evita problemas RLS.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_clinic_staff_for_scheduling(p_clinic_id UUID)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  email TEXT,
  role_in_clinic TEXT
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
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    cur.user_id AS staff_id,
    pr.full_name,
    pr.email,
    cur.role_in_clinic::TEXT
  FROM public.clinic_user_relationships cur
  JOIN public.profiles pr ON pr.id = cur.user_id
  WHERE cur.clinic_id = p_clinic_id
    AND cur.status = 'approved'
    AND cur.is_active = true
    AND cur.role_in_clinic <> 'administrative_assistant';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clinic_staff_for_scheduling(UUID) TO authenticated;

COMMIT;
