-- Migration to create the 'scale-assets' bucket and enable public read access

-- 1. Insert the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('scale-assets', 'scale-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to view the files
DROP POLICY IF EXISTS "Public Access for Scale Assets" ON storage.objects;
CREATE POLICY "Public Access for Scale Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'scale-assets');

-- 3. Allow authenticated users to upload and manage files in the bucket
DROP POLICY IF EXISTS "Authenticated users can upload scale assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload scale assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scale-assets');

DROP POLICY IF EXISTS "Authenticated users can update scale assets" ON storage.objects;
CREATE POLICY "Authenticated users can update scale assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'scale-assets');

DROP POLICY IF EXISTS "Authenticated users can delete scale assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete scale assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'scale-assets');
