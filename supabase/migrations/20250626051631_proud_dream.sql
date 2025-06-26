-- Verification script to check database schema integrity
-- This migration verifies that all required tables and columns exist

DO $$
DECLARE
    missing_items TEXT[] := '{}';
    item_count INTEGER;
BEGIN
    -- Check if profiles table has prescription_style column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'prescription_style'
    ) THEN
        missing_items := array_append(missing_items, 'profiles.prescription_style column');
    END IF;

    -- Check if physical_exam_templates table exists with definition column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'physical_exam_templates' AND column_name = 'definition'
    ) THEN
        missing_items := array_append(missing_items, 'physical_exam_templates.definition column');
    END IF;

    -- Check if physical_exam_sections table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'physical_exam_sections'
    ) THEN
        missing_items := array_append(missing_items, 'physical_exam_sections table');
    END IF;

    -- Check if logos bucket exists
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'logos'
    ) THEN
        missing_items := array_append(missing_items, 'logos storage bucket');
    END IF;

    -- Check sections count
    SELECT COUNT(*) INTO item_count FROM physical_exam_sections;
    IF item_count < 10 THEN
        missing_items := array_append(missing_items, 'physical_exam_sections data (expected 10, found ' || item_count || ')');
    END IF;

    -- Report results
    IF array_length(missing_items, 1) IS NULL THEN
        RAISE NOTICE 'DATABASE SCHEMA VERIFICATION: ✅ ALL CHECKS PASSED';
        RAISE LOG 'Schema verification completed successfully';
    ELSE
        RAISE WARNING 'DATABASE SCHEMA VERIFICATION: ❌ MISSING ITEMS: %', array_to_string(missing_items, ', ');
        RAISE LOG 'Schema verification found missing items: %', array_to_string(missing_items, ', ');
    END IF;
END $$;