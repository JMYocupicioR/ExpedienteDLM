/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing policies that are causing infinite recursion
    - Create new, optimized policies for the profiles table that avoid recursion
    
  2. Security
    - Enable RLS on profiles table (in case it was disabled)
    - Add policies for:
      - Users can read their own profile
      - Users can update their own profile
      - Administrators can manage all profiles
      - Medical staff can view other medical staff profiles
*/

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies without recursive checks

-- Users can read their own profile
CREATE POLICY "Enable read access for users to own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Enable update for users to own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Administrators can manage all profiles
CREATE POLICY "Enable full access for administrators"
ON profiles FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'administrator'
);

-- Medical staff can view other medical staff profiles
CREATE POLICY "Enable medical staff to view other medical staff"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' IN ('doctor', 'nurse'))
  AND
  (role IN ('doctor', 'nurse'))
);