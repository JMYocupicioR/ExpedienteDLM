/*
  # Add prescription style and logo storage
  
  1. Changes
    - Add prescription_style column to profiles table
    - Create storage bucket for logos
    - Set up RLS policies for logo storage
  
  2. Security
    - Enable RLS on logos bucket
    - Restrict logo access by user ID
    - Allow public read access
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
DO $$
BEGIN
  EXECUTE format(
    'CREATE BUCKET IF NOT EXISTS logos WITH (public = true)'
  );
END $$;

-- Enable RLS on the logos bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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