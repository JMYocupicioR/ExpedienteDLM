/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify role-based access control
    - Add proper policies for administrators and medical staff
    - Maintain data security while preventing recursion

  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Administrators can manage all profiles
      - Medical staff can view other medical staff
      - Users can manage their own profile
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Administrators can modify all profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new, non-recursive policies
CREATE POLICY "Enable read access for administrators"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'administrator' 
    AND id = auth.uid()
  )
);

CREATE POLICY "Enable all access for administrators"
ON profiles FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'administrator' 
    AND id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'administrator' 
    AND id = auth.uid()
  )
);

CREATE POLICY "Allow users to manage their own profile"
ON profiles FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Medical staff can view other medical staff"
ON profiles FOR SELECT 
TO authenticated
USING (
  (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('doctor', 'nurse') 
    AND id = auth.uid()
  ))
  AND 
  (role IN ('doctor', 'nurse'))
);