/*
  # Fix storage RLS policies for logo uploads

  1. Changes
    - Add RLS policies to allow authenticated users to manage their logos
    - Enable authenticated users to upload, read, and update their logos
    - Restrict access to only the logos bucket
    - Ensure users can only manage their own logos

  2. Security
    - Enable RLS on storage.objects table
    - Add policies for INSERT, SELECT, and UPDATE operations
    - Restrict access by user_id and bucket_id
*/

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'logos'
);

-- Allow users to read their own logos
CREATE POLICY "Allow users to read their own logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'logos' AND
  owner = auth.uid()
);

-- Allow users to update their own logos
CREATE POLICY "Allow users to update their own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'logos' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'logos' AND
  owner = auth.uid()
);

-- Allow users to delete their own logos
CREATE POLICY "Allow users to delete their own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'logos' AND
  owner = auth.uid()
);