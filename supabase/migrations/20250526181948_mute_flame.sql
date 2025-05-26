/*
  # Logo Storage and Profile Updates
  
  1. Changes
    - Add prescription_style column to profiles table
    - Create storage bucket for logos with size and type limits
  
  2. Security
    - Enable RLS on storage.objects table
    - Add policies for logo management
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

-- Create bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for logo management
CREATE POLICY "Users can upload their own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

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

CREATE POLICY "Users can delete their own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND 
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );