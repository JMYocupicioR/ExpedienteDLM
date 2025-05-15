/*
  # Add license number and schedule fields to profiles

  1. Changes
    - Add license_number column to profiles table
    - Add schedule column to store doctor's available hours
    - Add phone column for contact information

  2. Description
    These fields are needed for doctor profile management and scheduling
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN license_number text,
    ADD COLUMN phone text,
    ADD COLUMN schedule jsonb;
  END IF;
END $$;