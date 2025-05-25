/*
  # Add prescription style and storage configuration
  
  1. Changes
    - Add prescription_style column to profiles table
    - Create storage bucket for logos
    - Configure storage permissions
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

-- Create storage bucket for logos
DO $$
BEGIN
  EXECUTE format(
    'CREATE EXTENSION IF NOT EXISTS %I SCHEMA extensions;',
    'storage'
  );
END $$;

SELECT storage.create_bucket('logos');

-- Set bucket to public
UPDATE storage.buckets
SET public = true
WHERE id = 'logos';

-- Create storage policies
BEGIN;
  -- Policy for uploads
  SELECT storage.create_policy(
    'logos',
    'Upload logos policy',
    'INSERT',
    'authenticated',
    '(auth.uid())::text = SPLIT_PART(name, ''-'', 1)'
  );

  -- Policy for viewing
  SELECT storage.create_policy(
    'logos',
    'View logos policy',
    'SELECT',
    'public',
    'bucket_id = ''logos'''
  );

  -- Policy for updates
  SELECT storage.create_policy(
    'logos',
    'Update logos policy',
    'UPDATE',
    'authenticated',
    '(auth.uid())::text = SPLIT_PART(name, ''-'', 1)'
  );

  -- Policy for deletions
  SELECT storage.create_policy(
    'logos',
    'Delete logos policy',
    'DELETE',
    'authenticated',
    '(auth.uid())::text = SPLIT_PART(name, ''-'', 1)'
  );
COMMIT;