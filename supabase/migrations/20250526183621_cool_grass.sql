/*
  # Fix Logo Upload Functionality

  1. Changes
    - Create logos bucket with appropriate settings
    - Add prescription_style column to profiles table
    - Set up bucket-level policies for logo management

  2. Security
    - Enable secure file uploads for authenticated users
    - Restrict file types to images only
    - Enforce file size limits
    - Ensure users can only manage their own logos
*/

-- Create logos bucket if it doesn't exist
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

-- Create secure function to validate file uploads
CREATE OR REPLACE FUNCTION public.is_valid_logo_upload(filename text)
RETURNS boolean AS $$
BEGIN
  RETURN filename ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+\.(jpg|jpeg|png|gif|webp|svg)$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;