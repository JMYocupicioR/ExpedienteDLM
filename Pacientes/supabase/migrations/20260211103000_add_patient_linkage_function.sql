-- =====================================================
-- MIGRATION: Add Patient Linkage Function
-- Date: 2026-02-11
-- Description: Allows linking an existing patient row to the current auth user by email.
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_patient_to_current_user_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_patient_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return already linked patient if present.
  SELECT id
  INTO v_patient_id
  FROM public.patients
  WHERE patient_user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_patient_id IS NOT NULL THEN
    RETURN v_patient_id;
  END IF;

  -- Link the newest unlinked patient row with matching email.
  UPDATE public.patients p
  SET patient_user_id = v_user_id,
      updated_at = NOW()
  WHERE p.id = (
    SELECT p2.id
    FROM public.patients p2
    WHERE p2.patient_user_id IS NULL
      AND p2.email IS NOT NULL
      AND lower(trim(p2.email)) = lower(trim(p_email))
    ORDER BY p2.created_at DESC
    LIMIT 1
  )
  RETURNING p.id INTO v_patient_id;

  RETURN v_patient_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_patient_to_current_user_by_email(TEXT) TO authenticated;

