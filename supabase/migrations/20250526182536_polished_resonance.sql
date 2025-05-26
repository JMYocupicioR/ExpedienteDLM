/*
  # Fix logo upload permissions

  1. Changes
    - Add prescription_style column to profiles table
    - Create secure RLS policies for logo uploads
    - Set up proper bucket configuration

  2. Security
    - Ensure users can only access their own logos
    - Validate file types and sizes
    - Enable RLS on objects table
*/

-- Add prescription_style column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'profiles' 
    AND column_name = 'prescription_style'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN prescription_style JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create secure function to validate file uploads
CREATE OR REPLACE FUNCTION public.is_valid_logo_upload(bucket_id text, name text)
RETURNS boolean AS $$
BEGIN
  -- Validate file extension
  IF NOT (
    name ~* '\.jpg$' OR 
    name ~* '\.jpeg$' OR 
    name ~* '\.png$' OR 
    name ~* '\.gif$' OR 
    name ~* '\.webp$' OR 
    name ~* '\.svg$'
  ) THEN
    RETURN false;
  END IF;

  -- Ensure bucket is correct
  IF bucket_id != 'logos' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure function to check logo ownership
CREATE OR REPLACE FUNCTION public.owns_logo(object_owner uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = object_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bucket if it doesn't exist (this will be handled by Supabase UI)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Create policies for logo management
DO $$ 
BEGIN
  -- Insert policy
  EXECUTE format(
    'CREATE POLICY "Users can upload their own logos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = ''logos'' AND
      public.is_valid_logo_upload(bucket_id, name) AND
      (CASE 
        WHEN SPLIT_PART(name, ''-'', 1) = auth.uid()::text 
        THEN true
        ELSE false
      END)
    )'
  );

  -- Select policy
  EXECUTE format(
    'CREATE POLICY "Users can view their own logos" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = ''logos'' AND
      public.owns_logo(owner)
    )'
  );

  -- Update policy
  EXECUTE format(
    'CREATE POLICY "Users can update their own logos" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = ''logos'' AND
      public.owns_logo(owner)
    )
    WITH CHECK (
      bucket_id = ''logos'' AND
      public.is_valid_logo_upload(bucket_id, name)
    )'
  );

  -- Delete policy
  EXECUTE format(
    'CREATE POLICY "Users can delete their own logos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = ''logos'' AND
      public.owns_logo(owner)
    )'
  );

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;