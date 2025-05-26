/*
  # Add Storage RLS Policies for Logo Uploads

  1. Changes
    - Add RLS policy to allow authenticated users to upload logos
    - Add RLS policy to allow public access to view logos
    - Ensure bucket_id matches 'logos' for both policies
    - Validate user ownership through folder name matching auth.uid()

  2. Security
    - Restricts uploads to authenticated users
    - Ensures users can only upload to their own folders
    - Allows public read access to all logos
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for uploading logos (authenticated users only)
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

-- Policy for viewing logos (public access)
CREATE POLICY "Allow public to view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');