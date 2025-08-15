-- Migration: Strengthen Patient Insert Policy
-- Author: Expediente DLM Team
-- Date: 2025-08-15
-- Purpose: Ensure users can only create patients in clinics where they have active, approved access

-- Note: This migration assumes that cleanup_existing_policies.sql has been run first
-- to remove any conflicting policies

-- Create new strict insert policy
CREATE POLICY "patients_insert_only_active_approved_clinics"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must have an active, approved relationship with the clinic
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = patients.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
    -- Additionally, ensure the clinic itself is active
    AND EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = patients.clinic_id
        AND c.is_active = true
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "patients_insert_only_active_approved_clinics" ON public.patients IS 
'Ensures users can only create patients in clinics where they have active, approved access, and the clinic itself is active';

-- Create audit trigger for patient creation attempts (optional but recommended)
CREATE OR REPLACE FUNCTION audit_patient_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the creation attempt
  INSERT INTO public.activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    clinic_id
  ) VALUES (
    auth.uid(),
    'create',
    'patient',
    NEW.id,
    jsonb_build_object(
      'patient_name', NEW.full_name,
      'curp', COALESCE(NEW.curp, ''),
      'created_by', auth.uid(),
      'clinic_id', NEW.clinic_id
    ),
    NEW.clinic_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for patient creation audit
DROP TRIGGER IF EXISTS audit_patient_creation_trigger ON public.patients;
CREATE TRIGGER audit_patient_creation_trigger
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION audit_patient_creation();

-- Add index to improve performance of the policy check
CREATE INDEX IF NOT EXISTS idx_cur_user_clinic_status_active 
ON public.clinic_user_relationships(user_id, clinic_id, status, is_active)
WHERE status = 'approved' AND is_active = true;

-- Verify no orphan patients exist (patients in clinics where no users have access)
-- This is a safety check, not a modification
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO orphan_count
  FROM public.patients p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships cur
    WHERE cur.clinic_id = p.clinic_id
      AND cur.status = 'approved'
      AND cur.is_active = true
  );
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % orphan patients in clinics without active users', orphan_count;
  END IF;
END $$;
