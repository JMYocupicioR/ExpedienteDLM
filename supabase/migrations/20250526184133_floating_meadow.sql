/*
  # Add prescription style and policies
  
  1. Changes
    - Add prescription_style column to profiles table
    - Add policy for users to update their own prescription style
    - Add policy for users to read profiles
  
  2. Security
    - Enable RLS on profiles table
    - Restrict prescription style updates to authenticated users
*/

-- Add prescription_style column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'prescription_style'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN prescription_style JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add policy for users to update their own prescription style
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update their own prescription style'
  ) THEN
    CREATE POLICY "Users can update their own prescription style"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Add policy for users to read profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Enable read access for users to own profile'
  ) THEN
    CREATE POLICY "Enable read access for users to own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
  END IF;
END $$;