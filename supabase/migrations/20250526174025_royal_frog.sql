/*
  # Add Prescription Style and Logo Storage

  1. Changes
    - Add prescription_style column to profiles table
    - Add logo storage capabilities
  
  2. Security
    - Enable RLS for storage objects
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

-- Create bucket function
CREATE OR REPLACE FUNCTION create_storage_bucket()
RETURNS void AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute bucket creation
SELECT create_storage_bucket();

-- Drop the function after use
DROP FUNCTION IF EXISTS create_storage_bucket();

-- Create policies function
CREATE OR REPLACE FUNCTION create_storage_policies()
RETURNS void AS $$
BEGIN
  -- Enable RLS
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Upload policy
  DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
  CREATE POLICY "Users can upload their own logos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'logos' AND 
      (auth.uid())::text = SPLIT_PART(name, '-', 1)
    );

  -- Read policy
  DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
  CREATE POLICY "Anyone can view logos" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'logos');

  -- Update policy
  DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
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

  -- Delete policy
  DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
  CREATE POLICY "Users can delete their own logos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'logos' AND 
      (auth.uid())::text = SPLIT_PART(name, '-', 1)
    );
END;
$$ LANGUAGE plpgsql;

-- Execute policies creation
SELECT create_storage_policies();

-- Drop the function after use
DROP FUNCTION IF EXISTS create_storage_policies();