-- Super admin clinic creation RPC
-- Fixes RLS failure from clinics trigger -> clinic_configurations on direct client inserts.

BEGIN;

CREATE OR REPLACE FUNCTION public.super_admin_create_clinic(
  p_name text,
  p_address text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_admin_role text DEFAULT 'admin_staff'
)
RETURNS public.clinics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic public.clinics%ROWTYPE;
  v_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create clinics';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Clinic name is required';
  END IF;

  IF p_admin_role NOT IN ('owner', 'director', 'admin_staff', 'doctor', 'nurse', 'staff', 'administrative_assistant') THEN
    RAISE EXCEPTION 'Invalid admin role: %', p_admin_role;
  END IF;

  INSERT INTO public.clinics (name, address, type, is_active)
  VALUES (btrim(p_name), NULLIF(btrim(p_address), ''), 'clinic', true)
  RETURNING * INTO v_clinic;

  IF p_admin_email IS NOT NULL AND btrim(p_admin_email) <> '' THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE lower(email) = lower(btrim(p_admin_email))
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
      INSERT INTO public.clinic_user_relationships (
        clinic_id,
        user_id,
        role_in_clinic,
        status,
        is_active,
        approved_at,
        approved_by
      )
      VALUES (
        v_clinic.id,
        v_profile_id,
        p_admin_role,
        'approved',
        true,
        now(),
        auth.uid()
      )
      ON CONFLICT (clinic_id, user_id) DO UPDATE
      SET
        role_in_clinic = EXCLUDED.role_in_clinic,
        status = 'approved',
        is_active = true,
        approved_at = now(),
        approved_by = auth.uid(),
        updated_at = now();
    END IF;
  END IF;

  RETURN v_clinic;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_create_clinic(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_create_clinic(text, text, text, text) TO authenticated;

COMMIT;
