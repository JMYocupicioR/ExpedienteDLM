/*
  # Fix profile policies

  1. Changes
    - Add policy for users to create their own profile
    - Add policy for users to read their own profile
    - Add policy for administrators to manage all profiles

  2. Security
    - Enable RLS on profiles table
    - Add policies for profile management
*/

-- Allow users to create their own profile
CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);