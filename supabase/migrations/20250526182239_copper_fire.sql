/*
  # Create logos storage bucket and policies

  1. New Storage
    - Creates 'logos' bucket for storing user logos
    - Sets bucket as public for viewing
  
  2. Security
    - Enables RLS on storage.objects
    - Adds policies for upload, view, update, and delete operations
    - Restricts file types to images
    - Sets 2MB file size limit
*/

-- Create the logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Allow authenticated users to update their own logos
CREATE POLICY "Allow authenticated users to update their own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
)
WITH CHECK (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Allow authenticated users to delete their own logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Allow public access to view logos
CREATE POLICY "Allow public to view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');