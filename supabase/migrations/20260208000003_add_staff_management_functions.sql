-- =====================================================
-- SYSTEM: CLINIC STAFF MANAGEMENT FUNCTIONS
-- Date: 2026-02-08
-- Description: Adds RPC functions for approving/rejecting staff,
-- checking access status, and searching users to invite.
-- Required by ClinicStaffService.
-- =====================================================

-- 1. Approve Clinic User
-- Only accessible by Clinic Admins of the target clinic
CREATE OR REPLACE FUNCTION public.approve_clinic_user(target_user_id uuid, target_clinic_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executor_id uuid;
  is_admin boolean;
BEGIN
  executor_id := auth.uid();
  
  -- Check if executor is admin of the clinic
  is_admin := public.is_clinic_admin(target_clinic_id);
  
  IF NOT is_admin AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: You are not an administrator of this clinic';
  END IF;

  -- Update relationship
  UPDATE public.clinic_user_relationships
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = executor_id,
    rejected_at = NULL,
    rejected_by = NULL,
    rejection_reason = NULL,
    updated_at = now()
  WHERE 
    user_id = target_user_id 
    AND clinic_id = target_clinic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Relationship not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'User approved successfully'
  );
END;
$$;

-- 2. Reject Clinic User
-- Only accessible by Clinic Admins of the target clinic
CREATE OR REPLACE FUNCTION public.reject_clinic_user(
  target_user_id uuid, 
  target_clinic_id uuid, 
  rejection_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executor_id uuid;
  is_admin boolean;
BEGIN
  executor_id := auth.uid();
  
  -- Check if executor is admin of the clinic
  is_admin := public.is_clinic_admin(target_clinic_id);
  
  IF NOT is_admin AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: You are not an administrator of this clinic';
  END IF;

  -- Update relationship
  UPDATE public.clinic_user_relationships
  SET 
    status = 'rejected',
    rejected_at = now(),
    rejected_by = executor_id,
    rejection_reason = rejection_reason,
    approved_at = NULL,
    approved_by = NULL,
    updated_at = now()
  WHERE 
    user_id = target_user_id 
    AND clinic_id = target_clinic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Relationship not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'User rejected successfully'
  );
END;
$$;

-- 3. Check Approved Access (RPC wrapper for frontend)
CREATE OR REPLACE FUNCTION public.user_has_approved_access_to_clinic(check_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin always has access
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Check simple active member status
  RETURN public.is_active_member(check_clinic_id);
END;
$$;

-- 4. Check Clinic Admin (RPC wrapper for frontend)
CREATE OR REPLACE FUNCTION public.user_is_clinic_admin(check_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin is considered admin
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  RETURN public.is_clinic_admin(check_clinic_id);
END;
$$;

-- 5. Search Profiles for Invite
-- Finds users by email who are NOT already in the clinic
CREATE OR REPLACE FUNCTION public.search_profiles_for_invite(
  search_term text, 
  target_clinic_id uuid
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  specialty text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if user is admin of that clinic (or super admin)
  IF NOT (public.is_clinic_admin(target_clinic_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.specialty,
    p.role
  FROM profiles p
  WHERE 
    (
      p.email ILIKE '%' || search_term || '%'
      OR
      p.full_name ILIKE '%' || search_term || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM clinic_user_relationships cur
      WHERE cur.user_id = p.id AND cur.clinic_id = target_clinic_id
    )
  LIMIT 10;
END;
$$;
