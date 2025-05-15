/*
  # Add profile fields for doctors

  1. Changes
    - Add license_number column for medical license
    - Add phone column for contact information
    - Add schedule column for availability
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS schedule jsonb;

COMMENT ON COLUMN profiles.license_number IS 'Medical license number';
COMMENT ON COLUMN profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN profiles.schedule IS 'Doctor availability schedule';