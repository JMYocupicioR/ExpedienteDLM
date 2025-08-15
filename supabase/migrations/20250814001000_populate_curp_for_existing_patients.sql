-- Migration: Populate CURP for existing patients
-- Author: Expediente DLM Team
-- Date: 2025-08-14
-- Purpose: Ensure existing patients have CURP values to prevent constraint violations

-- Update existing patients to have a placeholder CURP if they don't have one
-- This prevents the UNIQUE constraint from failing on existing data
UPDATE public.patients 
SET curp = 'PENDIENTE_' || id::text
WHERE curp IS NULL OR curp = '';

-- Add comment to the curp column
COMMENT ON COLUMN public.patients.curp IS 
'Clave Única de Registro de Población. Debe ser única por clínica.';

-- Create a function to generate a temporary CURP for testing purposes
CREATE OR REPLACE FUNCTION generate_temp_curp()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate a temporary CURP format: TEMP_YYYYMMDD_HHMMSS
  RETURN 'TEMP_' || to_char(now(), 'YYYYMMDD_HH24MISS');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_temp_curp TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION generate_temp_curp IS 
'Generates a temporary CURP for testing purposes. Should be replaced with actual CURP in production.';
