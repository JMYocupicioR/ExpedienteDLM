/*
  # Fix Profiles RLS Infinite Recursion

  The current profiles policies are causing infinite recursion because they query
  the profiles table from within the policies themselves. This creates a loop:
  
  Query profiles → Policy checks profiles → Query profiles → Policy checks profiles...

  ## Changes
  1. Simplify SELECT policy to avoid recursive queries
  2. Use auth.jwt() instead of role queries where possible
  3. Remove complex EXISTS subqueries that reference profiles
  4. Keep security intact with non-recursive checks

  ## Security
  - Users can view their own profile
  - Administrators can view all profiles (using JWT claims)
  - Medical staff basic access maintained
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create simplified, non-recursive SELECT policy
CREATE POLICY "profiles_select_policy_fixed" 
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

-- Create simplified DELETE policy without recursion
CREATE POLICY "profiles_delete_policy_fixed" 
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

-- Update INSERT policy to be more permissive for profile creation
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy_fixed" 
ON profiles FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Users can create their own profile
  auth.uid() = id 
  OR 
  -- Service role can create any profile
  auth.role() = 'service_role'
);

-- Keep UPDATE policy simple (it was already non-recursive)
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy_fixed" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);