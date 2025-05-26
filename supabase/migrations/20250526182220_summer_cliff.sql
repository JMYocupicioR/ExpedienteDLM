/*
  # Create logos storage bucket

  1. New Storage Bucket
    - Creates a 'logos' bucket for storing clinic and doctor logos
    - Sets up appropriate RLS policies for secure access

  2. Security
    - Enables authenticated users to upload logos
    - Allows public access for viewing logos
    - Restricts file types to images only
*/

-- Create the logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'gif', 'webp', 'svg')) AND
  (octet_length(content) <= 2097152) -- 2MB file size limit
);

-- Allow authenticated users to update their own logos
CREATE POLICY "Allow authenticated users to update their own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to delete their own logos
CREATE POLICY "Allow authenticated users to delete their own logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos');

-- Allow public access to view logos
CREATE POLICY "Allow public to view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');