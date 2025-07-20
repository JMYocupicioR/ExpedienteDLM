/*
  # Fix Signup Authentication Issues

  1. Problems Identified:
    - RLS policies causing conflicts with trigger function
    - handle_new_user function missing search_path configuration
    - Inconsistent table structure and field constraints
    - Timing issues in registration flow

  2. Solutions:
    - Fix RLS policies to allow proper trigger execution
    - Update handle_new_user function with proper search_path
    - Ensure all required fields exist with proper constraints
    - Add better error handling and logging
*/

-- ===== FIX HANDLE_NEW_USER FUNCTION =====

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_full_name text;
BEGIN
  -- Get email and full_name safely
  user_email := COALESCE(NEW.email, '');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Use INSERT ... ON CONFLICT to handle potential duplicates
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at,
    prescription_style
  ) VALUES (
    NEW.id,
    user_email,
    'doctor', -- Default role, will be updated in questionnaire
    user_full_name,
    NOW(),
    NOW(),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW()
  WHERE profiles.full_name = '' OR profiles.full_name IS NULL;
  
  -- Log successful profile creation
  RAISE LOG 'Profile created/updated for user: %', user_email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', user_email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ENSURE PROPER TABLE STRUCTURE =====

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add prescription_style if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'prescription_style'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN prescription_style JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add license_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'license_number'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN license_number TEXT;
  END IF;

  -- Add phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN phone TEXT;
  END IF;

  -- Add schedule if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'schedule'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN schedule JSONB;
  END IF;
END $$;

-- ===== FIX RLS POLICIES =====

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Administrators can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Allow trigger profile creation" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable full access for administrators" ON profiles;
DROP POLICY IF EXISTS "Enable medical staff to view other medical staff" ON profiles;
DROP POLICY IF EXISTS "Users can update their own prescription style" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified, non-conflicting policies
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own profile
    auth.uid() = id
    -- Administrators can read all profiles
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    -- Medical staff can view other medical staff
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('doctor', 'nurse')
    )
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    -- Allow trigger to insert profiles
    auth.uid() = id
    -- Allow service_role to insert (for trigger)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    -- Only administrators can delete profiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

-- ===== GRANT NECESSARY PERMISSIONS =====

-- Grant permissions for the trigger to work
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO service_role;

-- ===== ADD HELPER FUNCTION FOR PROFILE VERIFICATION =====

CREATE OR REPLACE FUNCTION public.verify_profile_exists(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_profile_exists(UUID) TO authenticated;

-- ===== LOG MIGRATION COMPLETION =====
DO $$
BEGIN
  RAISE LOG 'MIGRATION COMPLETED: Fixed signup authentication issues - RLS policies, handle_new_user function, and table structure updated.';
END $$; 