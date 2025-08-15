-- Migration: Add unique constraints to prevent patient duplicates
-- Author: Expediente DLM Team
-- Date: 2025-08-14
-- Purpose: Ensure data integrity by preventing duplicate patients per clinic

-- Add curp column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' 
    AND column_name = 'curp'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN curp text;
  END IF;
END $$;

-- Add unique constraint on (clinic_id, curp) to prevent duplicate CURP within same clinic
ALTER TABLE public.patients 
ADD CONSTRAINT patients_clinic_curp_unique UNIQUE (clinic_id, curp);

-- Create index to improve performance on CURP lookups
CREATE INDEX IF NOT EXISTS idx_patients_curp_clinic 
ON public.patients(clinic_id, curp);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT patients_clinic_curp_unique ON public.patients IS 
'Ensures each CURP is unique within a clinic to prevent duplicate patient records';

-- Create a function to check if a patient exists before creation
CREATE OR REPLACE FUNCTION check_patient_exists_by_curp(
  p_clinic_id uuid,
  p_curp text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient_id uuid;
  v_patient_name text;
BEGIN
  -- Check if patient exists with given CURP in the clinic
  SELECT 
    id,
    full_name
  INTO v_patient_id, v_patient_name
  FROM patients
  WHERE clinic_id = p_clinic_id 
    AND curp = p_curp
  LIMIT 1;

  IF v_patient_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true,
      'patient_id', v_patient_id,
      'patient_name', v_patient_name
    );
  ELSE
    RETURN jsonb_build_object(
      'exists', false
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_patient_exists_by_curp TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION check_patient_exists_by_curp IS 
'Checks if a patient with given CURP already exists in the specified clinic';
