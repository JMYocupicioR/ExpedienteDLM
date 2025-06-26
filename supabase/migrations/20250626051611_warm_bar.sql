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
-- Using proper JSONB syntax
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('logos', 'logos', true);
  END IF;
END $$;

-- Note: RLS policies for storage will be handled separately via Supabase dashboard
-- due to permission restrictions in migrations

-- Log migration completion
DO $$
BEGIN
  RAISE LOG 'MIGRATION APPLIED: Fix prescription_style and logos bucket - 20250525191009_emerald_mud.sql';
END $$;