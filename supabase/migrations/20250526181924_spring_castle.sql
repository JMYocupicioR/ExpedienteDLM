/*
  # Logo Storage Configuration

  1. Changes
    - Add prescription_style column to profiles table
    - Create storage bucket for logos
    - Set up storage policies for logo management

  2. Security
    - Enable RLS on storage objects
    - Add policies for upload, view, update, and delete operations
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

-- Create bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create security policies for storage
DO $$ 
DECLARE
  bucket_id text := 'logos';
BEGIN
  -- Create upload policy
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Upload logos policy' AND bucket_id = bucket_id
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'Upload logos policy',
      bucket_id,
      'INSERT',
      '((auth.uid())::text = split_part(name, ''-'', 1))'
    );
  END IF;

  -- Create view policy
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'View logos policy' AND bucket_id = bucket_id
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'View logos policy',
      bucket_id,
      'SELECT',
      'true'
    );
  END IF;

  -- Create update policy
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Update logos policy' AND bucket_id = bucket_id
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'Update logos policy',
      bucket_id,
      'UPDATE',
      '((auth.uid())::text = split_part(name, ''-'', 1))'
    );
  END IF;

  -- Create delete policy
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Delete logos policy' AND bucket_id = bucket_id
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'Delete logos policy',
      bucket_id,
      'DELETE',
      '((auth.uid())::text = split_part(name, ''-'', 1))'
    );
  END IF;
END $$;