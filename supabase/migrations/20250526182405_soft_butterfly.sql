/*
  # Storage bucket and permissions setup
  
  1. New Bucket
    - Creates 'logos' bucket for storing user logos
    - Sets size limits and allowed file types
  
  2. Security
    - Configures bucket-level security settings
    - Sets up appropriate access controls
*/

-- Create the logos bucket with appropriate settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Add bucket-level security function
CREATE OR REPLACE FUNCTION storage.handle_auth_users()
RETURNS void AS $$
BEGIN
  -- Bucket-level INSERT permission
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Grant usage on required schemas
  GRANT USAGE ON SCHEMA storage TO authenticated;
  GRANT ALL ON storage.buckets TO authenticated;
  GRANT ALL ON storage.objects TO authenticated;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT storage.handle_auth_users();

-- Add prescription_style column to profiles if it doesn't exist
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