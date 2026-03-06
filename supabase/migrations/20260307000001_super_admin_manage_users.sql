-- Migration: super_admin_manage_users
-- Description: Adds a secure RPC to allow super_admin to delete users completely

-- Drop the function if it exists to allow recreation
DROP FUNCTION IF EXISTS public.super_admin_delete_user(uuid);

-- Create the secure function
CREATE OR REPLACE FUNCTION public.super_admin_delete_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- 1. Verify the executing user is a super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Access denied. Only super_admin can perform this action.';
    END IF;

    -- 2. Delete the user from auth.users.
    -- Assuming foreign keys like public.profiles -> auth.users have ON DELETE CASCADE,
    -- this will automatically clean up the profile and any related data (patients, appointments, etc.)
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN true;
END;
$$;

-- Grant execution permission to authenticated users (the function itself verifies the role)
GRANT EXECUTE ON FUNCTION public.super_admin_delete_user(uuid) TO authenticated;
