-- Migration: Emergency Policy Cleanup
-- Author: Expediente DLM Team
-- Date: 2025-08-14
-- Purpose: Emergency cleanup of duplicate policies that may exist

-- This migration handles specific policy conflicts that may occur

-- Drop specific policies that commonly cause conflicts
DROP POLICY IF EXISTS "patients_insert_only_active_approved_clinics" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_by_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_clinic" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients in their clinics" ON public.patients;
DROP POLICY IF EXISTS "patients_clinic_insert" ON public.patients;

-- Also drop any other INSERT policies that might exist
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Find and drop all INSERT policies for patients table
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd
        FROM pg_policies 
        WHERE tablename = 'patients' 
        AND cmd = 'INSERT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || 
                policy_record.schemaname || '.' || policy_record.tablename;
        RAISE NOTICE 'Emergency cleanup: Dropped INSERT policy % on %', 
                     policy_record.policyname, 
                     policy_record.tablename;
    END LOOP;
END $$;

-- Verify cleanup
DO $$
DECLARE
    remaining_insert_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_insert_policies
    FROM pg_policies 
    WHERE tablename = 'patients' 
    AND cmd = 'INSERT';
    
    IF remaining_insert_policies > 0 THEN
        RAISE WARNING 'Still have % INSERT policies on patients table after emergency cleanup', remaining_insert_policies;
    ELSE
        RAISE NOTICE 'Emergency cleanup successful: No INSERT policies remaining on patients table';
    END IF;
END $$;
