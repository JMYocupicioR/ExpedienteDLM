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

-- Create policies for storage.objects
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND 
  auth.uid()::text = SPLIT_PART(name, '-', 1)
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos' AND 
  auth.uid()::text = SPLIT_PART(name, '-', 1)
)
WITH CHECK (
  bucket_id = 'logos' AND 
  auth.uid()::text = SPLIT_PART(name, '-', 1)
);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'logos' AND 
  auth.uid()::text = SPLIT_PART(name, '-', 1)
);