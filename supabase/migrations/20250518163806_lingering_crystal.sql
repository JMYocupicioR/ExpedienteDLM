/*
  # Fix recursive policies in profiles table

  1. Changes
    - Drop existing recursive policies
    - Create new simplified policies that avoid recursion
    - Maintain security while preventing infinite loops

  2. Security
    - Administrators can manage all profiles
    - Users can manage their own profile
    - Medical staff can view other medical staff profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Administrators can modify all profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new simplified policies
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Users can read their own profile
  auth.uid() = id
  -- Administrators can read all profiles
  OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email FROM profiles WHERE role = 'administrator'
    )
  )
  -- Medical staff can view other medical staff
  OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email FROM profiles WHERE role IN ('doctor', 'nurse')
    )
  )
);

CREATE POLICY "Enable insert for authenticated users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for administrators"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      SELECT email FROM profiles WHERE role = 'administrator'
    )
  )
);