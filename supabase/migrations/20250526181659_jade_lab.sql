/*
  # Add Prescription Style Support
  
  1. Changes
    - Add prescription_style column to profiles table for storing prescription formatting preferences
    
  2. Notes
    - Uses JSONB type for flexible styling options
    - Default empty object provided
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