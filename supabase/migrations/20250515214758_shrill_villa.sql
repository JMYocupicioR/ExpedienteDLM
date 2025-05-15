/*
  # Add Row Level Security Policies
  
  1. Security Functions
    - Create helper functions to check user roles
  
  2. RLS Policies
    - Enable RLS on all tables
    - Create policies for data access based on user roles
*/

-- Helper function to check if user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM auth.users 
      WHERE role = 'administrator'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a doctor
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM auth.users 
      WHERE role = 'doctor'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a nurse
CREATE OR REPLACE FUNCTION public.is_nurse()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM auth.users 
      WHERE role = 'nurse'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create basic RLS policies for auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow administrators to manage all users
CREATE POLICY "Administrators can manage users"
  ON auth.users
  TO authenticated
  USING (is_admin());

-- Create policies for profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'doctor', 'nurse')),
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow administrators to manage all profiles
CREATE POLICY "Administrators can manage profiles"
  ON public.profiles
  TO authenticated
  USING (is_admin());

-- Create trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert a default admin profile if it doesn't exist
INSERT INTO auth.users (email, role, instance_id)
SELECT 'admin@expedientedlm.com', 'administrator', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE role = 'administrator'
);

INSERT INTO public.profiles (id, email, role)
SELECT id, email, role
FROM auth.users
WHERE role = 'administrator'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE role = 'administrator'
);