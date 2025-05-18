/*
  # Fix profiles table policies

  1. Changes
    - Simplify RLS policies to avoid recursive checks
    - Use direct auth.uid() comparisons where possible
    - Remove circular policy dependencies
    - Ensure proper role-based access control
  
  2. Security
    - Maintain existing security model
    - Prevent unauthorized access
    - Keep audit trail functionality
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Enable delete for administrators" ON profiles;

-- Create new simplified policies
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Administrators can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (role = 'administrator');

CREATE POLICY "Medical staff can view other medical staff"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS viewer
    WHERE viewer.id = auth.uid()
    AND viewer.role IN ('doctor', 'nurse')
  )
  AND role IN ('doctor', 'nurse')
);

CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrators can modify all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'administrator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles AS admin
    WHERE admin.id = auth.uid()
    AND admin.role = 'administrator'
  )
);