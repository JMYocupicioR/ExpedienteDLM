/*
  # Fix storage policies for logo uploads

  1. Changes
    - Add prescription_style column to profiles table
    - Add policy for users to update their own prescription style
    - Add storage bucket configuration for logos

  2. Security
    - Enable RLS on profiles table
    - Add policy for prescription style updates
*/

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

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add policy for users to update their own prescription style
CREATE POLICY "Users can update their own prescription style"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Create storage.buckets if it doesn't exist (this is safe and won't fail)
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- Insert logos bucket configuration
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