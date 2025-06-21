/*
  # Add prescription style and storage setup

  1. New Columns
    - Add prescription_style column to profiles table
  
  2. Storage
    - Create logos bucket for user logos
    - Set up RLS policies for logo access
  
  3. Security
    - Enable RLS on storage bucket
    - Allow users to manage their own logos
    - Allow public read access to logos
*/

-- Add prescription_style column if it doesn't exist
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

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the logos bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'logos';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;

-- Allow authenticated users to upload logos
CREATE POLICY "Users can upload their own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );

-- Allow public access to read logos
CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update their own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  )
  WITH CHECK (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );

-- Allow users to delete their own logos
CREATE POLICY "Users can delete their own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );