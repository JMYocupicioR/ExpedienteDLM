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

-- Enable RLS on the logos bucket (this is enabled by default in newer versions)
-- No action needed as RLS is enabled by default on storage.objects

-- Allow authenticated users to upload logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own logos'
  ) THEN
    CREATE POLICY "Users can upload their own logos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'logos' AND 
        (auth.uid())::text = SPLIT_PART(name, '-', 1)
      );
  END IF;
END $$;

-- Allow public access to read logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view logos'
  ) THEN
    CREATE POLICY "Anyone can view logos" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'logos');
  END IF;
END $$;

-- Allow users to update their own logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own logos'
  ) THEN
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
  END IF;
END $$;

-- Allow users to delete their own logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own logos'
  ) THEN
    CREATE POLICY "Users can delete their own logos" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'logos' AND 
        (auth.uid())::text = SPLIT_PART(name, '-', 1)
      );
  END IF;
END $$;