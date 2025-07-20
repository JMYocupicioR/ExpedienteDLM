-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security for the logos bucket
-- 1. Allow public read access to all logos
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

-- 2. Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'logos' AND owner = auth.uid() );

-- 3. Allow users to update their own logos
CREATE POLICY "Allow users to update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'logos' AND owner = auth.uid() );

-- 4. Allow users to delete their own logos
CREATE POLICY "Allow users to delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'logos' AND owner = auth.uid() ); 