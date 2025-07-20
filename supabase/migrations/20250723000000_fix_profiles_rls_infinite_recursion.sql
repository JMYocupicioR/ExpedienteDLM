/*
  # Fix Profiles RLS Infinite Recursion - Final Fix

  The migration 20250627000001_fix_permission_validation.sql reintroduced infinite
  recursion by creating a policy that queries the profiles table from within itself.
  
  This migration fixes the issue by:
  1. Dropping the problematic policy
  2. Creating a non-recursive replacement that uses JWT claims instead
  3. Ensuring all policies are safe and don't cause recursion

  ## Root Cause
  The policy "Users can view their own profile and doctors can view other doctors"
  contains: EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()...)
  This creates infinite recursion when the policy is evaluated.

  ## Solution
  Use auth.jwt() claims and auth.users metadata instead of querying profiles table.
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view their own profile and doctors can view other doctors" ON profiles;

-- Create a safe, non-recursive replacement policy
CREATE POLICY "profiles_select_safe_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid() 
    OR 
    -- Check role from JWT claims instead of querying profiles table
    (auth.jwt() ->> 'user_metadata' ->> 'role' IN ('doctor', 'administrator'))
    OR
    -- Fallback: check via auth.users metadata (non-recursive)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data ->> 'role' IN ('doctor', 'administrator')
    )
  );

-- Also ensure the other policies from the fix migration are properly applied
-- Drop any remaining problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create safe versions of all policies
CREATE POLICY "profiles_select_policy_final"
ON profiles FOR SELECT 
TO authenticated 
USING (
  -- Users can always see their own profile
  auth.uid() = id 
  OR 
  -- Check role from JWT claims instead of querying profiles table
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator')
  OR
  -- Alternative: use a simpler role check that doesn't recurse
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data ->> 'role' IN ('administrator', 'doctor', 'nurse')
  )
);

CREATE POLICY "profiles_delete_policy_final" 
ON profiles FOR DELETE 
TO authenticated 
USING (
  -- Only allow delete if user is administrator (check via JWT)
  auth.jwt() ->> 'user_metadata' ->> 'role' = 'administrator'
  OR
  -- Fallback: check via auth.users metadata
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data ->> 'role' = 'administrator'
  )
);

CREATE POLICY "profiles_insert_policy_final" 
ON profiles FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Users can create their own profile
  auth.uid() = id 
  OR 
  -- Service role can create any profile
  auth.role() = 'service_role'
);

CREATE POLICY "profiles_update_policy_final" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Log the fix
DO $$
BEGIN
  RAISE LOG 'MIGRATION COMPLETED: Fixed infinite recursion in profiles RLS policies. All policies now use non-recursive checks.';
END $$; 