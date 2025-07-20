/*
  # Add Automatic Profile Creation Trigger - Enhanced Version

  1. Function
    - Create robust handle_new_user function with error handling
    - Set default role as 'doctor' for new users
    - Use UPSERT pattern to avoid conflicts
  
  2. Trigger
    - Create trigger on auth.users to call handle_new_user
    - Ensure profile is created immediately after user registration
  
  3. Security
    - Maintain existing RLS policies
    - Proper error handling and logging
    - Compatible with existing frontend code
  
  4. Compatibility
    - Works with existing signup questionnaire flow
    - Handles cases where profile might already exist
*/

-- Enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    'doctor', -- Default role, will be updated in questionnaire
    user_full_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW()
  WHERE profiles.full_name = '' OR profiles.full_name IS NULL;
  
  -- Log successful profile creation (optional, can be removed in production)
  RAISE LOG 'Profile created/updated for user: %', user_email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', user_email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Grant necessary permissions for the trigger to work
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO service_role;

-- Verify RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add policy to allow trigger to insert profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow trigger profile creation'
  ) THEN
    CREATE POLICY "Allow trigger profile creation"
      ON profiles FOR INSERT
      TO authenticated, service_role
      WITH CHECK (true);
  END IF;
END $$;