/*
  # Fix infinite recursion in profiles RLS policy
  
  The profiles_select_policy was causing infinite recursion by checking 
  user roles from JWT metadata, which triggers another lookup on the 
  profiles table itself.
  
  This migration fixes the recursion by simplifying the policy to only 
  allow users to access their own profile record.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Recreate the policy without recursive role checking
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Also fix any other policies that might have similar recursion issues
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = id);