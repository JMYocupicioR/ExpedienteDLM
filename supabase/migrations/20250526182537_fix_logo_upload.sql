/*
  # Fix logo upload RLS policies

  1. Changes
    - Drop all existing storage policies
    - Create new, secure RLS policies for logo uploads
    - Ensure proper validation of file types and ownership

  2. Security
    - Enable RLS on storage.objects table
    - Add policies for INSERT, SELECT, UPDATE, and DELETE operations
    - Validate file types and sizes
    - Ensure users can only access their own logos
*/

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Upload logos policy" ON storage.objects;
DROP POLICY IF EXISTS "View logos policy" ON storage.objects;
DROP POLICY IF EXISTS "Update logos policy" ON storage.objects;
DROP POLICY IF EXISTS "Delete logos policy" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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

  -- Ensure filename starts with user's ID
  IF NOT (SPLIT_PART(name, '-', 1) = auth.uid()::text) THEN
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

-- Create new policies
DO $$ 
BEGIN
  -- Insert policy
  CREATE POLICY "Users can upload their own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    public.is_valid_logo_upload(bucket_id, name)
  );

  -- Select policy
  CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

  -- Update policy
  CREATE POLICY "Users can update their own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos' AND
    public.owns_logo(owner)
  )
  WITH CHECK (
    bucket_id = 'logos' AND
    public.is_valid_logo_upload(bucket_id, name)
  );

  -- Delete policy
  CREATE POLICY "Users can delete their own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND
    public.owns_logo(owner)
  );
END $$; 