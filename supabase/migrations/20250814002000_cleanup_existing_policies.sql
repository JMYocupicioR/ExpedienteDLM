-- Migration: Cleanup Existing Policies
-- Author: Expediente DLM Team
-- Date: 2025-08-14
-- Purpose: Clean up existing policies to prevent conflicts during migration

-- This migration runs BEFORE the RLS policy migration to ensure clean state

-- Function to safely drop all policies for a table
CREATE OR REPLACE FUNCTION cleanup_table_policies(p_table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER := 0;
BEGIN
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = p_table_name;
    
    RAISE NOTICE 'Found % existing policies for table %', policy_count, p_table_name;
    
    -- Drop all policies for the specified table
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, cmd
        FROM pg_policies 
        WHERE tablename = p_table_name
        ORDER BY cmd, policyname
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || 
                policy_record.schemaname || '.' || policy_record.tablename;
        RAISE NOTICE 'Dropped policy: % (% on %)', 
                     policy_record.policyname, 
                     policy_record.cmd, 
                     policy_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'Cleanup completed for table %', p_table_name;
END;
$$;

-- Clean up patients table policies
SELECT cleanup_table_policies('patients');

-- Clean up clinic_user_relationships table policies (if they exist)
SELECT cleanup_table_policies('clinic_user_relationships');

-- Clean up clinics table policies (if they exist)
SELECT cleanup_table_policies('clinics');

-- Drop the cleanup function as it's no longer needed
DROP FUNCTION IF EXISTS cleanup_table_policies(text);

-- Verify cleanup
DO $$
DECLARE
    remaining_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_policies
    FROM pg_policies 
    WHERE tablename = 'patients';
    
    IF remaining_policies > 0 THEN
        RAISE WARNING 'Still have % policies on patients table after cleanup', remaining_policies;
    ELSE
        RAISE NOTICE 'Successfully cleaned up all policies on patients table';
    END IF;
END $$;
