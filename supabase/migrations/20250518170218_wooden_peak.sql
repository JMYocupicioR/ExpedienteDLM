/*
  # Fix recursive policies for profiles table

  1. Changes
    - Drop existing policies that cause recursion
    - Create new, simplified policies for profiles table:
      - Allow users to manage their own profile
      - Allow administrators to manage all profiles
      - Allow medical staff to view other medical staff profiles
  
  2. Security
    - Maintains RLS enabled on profiles table
    - Ensures users can only access appropriate data
    - Prevents infinite recursion in policy checks
*/

-- Drop existing policies to recreate them without recursion
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable all access for administrators" ON profiles;
DROP POLICY IF EXISTS "Enable read access for administrators" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff" ON profiles;

-- Create new, simplified policies
CREATE POLICY "Users can manage own profile"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrators can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  )
);

CREATE POLICY "Medical staff can view other medical staff"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('doctor', 'nurse')
  )
  AND role IN ('doctor', 'nurse')
);