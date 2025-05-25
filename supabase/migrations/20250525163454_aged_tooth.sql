/*
  # Add QR code column to prescriptions table
  
  1. Changes
    - Add qr_code column to prescriptions table
    - Add status column if it doesn't exist
    - Add expires_at column if it doesn't exist
*/

DO $$ 
BEGIN
  -- Add qr_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE prescriptions ADD COLUMN qr_code TEXT;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' AND column_name = 'status'
  ) THEN
    ALTER TABLE prescriptions ADD COLUMN status TEXT DEFAULT 'active';
    ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check 
      CHECK (status = ANY (ARRAY['active', 'expired', 'dispensed']));
  END IF;

  -- Add expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE prescriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for status and expiration date
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_expires_at ON prescriptions(expires_at);