-- =====================================================
-- HOTFIX: Essential RLS Functions for Production
-- Date: 2025-08-24
-- =====================================================

-- Function to get the current user's clinic_id
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Function to check if user is in a specific clinic
CREATE OR REPLACE FUNCTION public.is_user_in_clinic(check_clinic_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_clinic_id UUID;
    user_role_val TEXT;
BEGIN
    -- Get user's clinic and role
    SELECT clinic_id, role
    INTO user_clinic_id, user_role_val
    FROM public.profiles
    WHERE id = auth.uid();

    -- Super admin can access all clinics
    IF user_role_val = 'super_admin' THEN
        RETURN true;
    END IF;

    -- Check if user belongs to the clinic
    IF user_clinic_id = check_clinic_id THEN
        RETURN true;
    END IF;

    -- Check if user has explicit relationship with the clinic
    IF EXISTS (
        SELECT 1 
        FROM public.clinic_user_relationships 
        WHERE user_id = auth.uid() 
        AND clinic_id = check_clinic_id 
        AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Function to check if user is admin of a specific clinic
CREATE OR REPLACE FUNCTION public.is_clinic_admin(check_clinic_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_val TEXT;
    user_clinic_id UUID;
BEGIN
    -- Get user's role and clinic
    SELECT role, clinic_id
    INTO user_role_val, user_clinic_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Super admin can administrate all clinics
    IF user_role_val = 'super_admin' THEN
        RETURN true;
    END IF;

    -- Check if user is admin_staff of the clinic
    IF user_role_val = 'admin_staff' AND user_clinic_id = check_clinic_id THEN
        RETURN true;
    END IF;

    -- Check through clinic_user_relationships
    IF EXISTS (
        SELECT 1 
        FROM public.clinic_user_relationships 
        WHERE user_id = auth.uid() 
        AND clinic_id = check_clinic_id 
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_clinic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;