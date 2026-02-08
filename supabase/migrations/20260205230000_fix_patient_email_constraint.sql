-- Fix patient email constraint
-- This migration removes the overly restrictive email check constraint on the patients table
-- The constraint was preventing valid (though simple) email addresses like "1@test.com" from being saved

-- Drop the existing email check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'patients_email_check'
    ) THEN
        ALTER TABLE patients DROP CONSTRAINT patients_email_check;
        RAISE NOTICE 'Dropped constraint patients_email_check';
    ELSE
        RAISE NOTICE 'Constraint patients_email_check does not exist, skipping';
    END IF;
END $$;

-- Optional: Add a more lenient email validation constraint
-- This allows any string with an @ symbol and at least one character on each side
-- Remove the comments below if you want to add a basic validation

-- ALTER TABLE patients ADD CONSTRAINT patients_email_format_check 
-- CHECK (email IS NULL OR email ~* '^.+@.+$');

-- Comment: 
-- The above constraint allows NULL emails or any email with the basic format: something@something
-- This is more permissive and will allow test emails like "1@test.com"
-- If no constraint is desired, leave the table without any email validation check
