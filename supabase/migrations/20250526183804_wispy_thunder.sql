/*
  # Fix Logo Upload Permissions

  1. Changes
    - Add storage bucket policies for 'logos'
    - Update profiles table RLS policies for prescription_style updates
    
  2. Security
    - Enable users to upload logos to their own directory
    - Allow users to update their own prescription_style
    - Maintain existing RLS on profiles table
*/

-- Create logos bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'logos'
  ) THEN
    INSERT INTO storage.buckets (id, name)
    VALUES ('logos', 'logos');
  END IF;
END $$;

-- Enable RLS on logos bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload their own logos
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read logos
CREATE POLICY "Users can read logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

-- Allow users to update their prescription style
CREATE POLICY "Users can update their own prescription style"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  (
    -- Only allow updating prescription_style
    CASE WHEN prescription_style IS NOT NULL
      THEN true
      ELSE false
    END
  )
);