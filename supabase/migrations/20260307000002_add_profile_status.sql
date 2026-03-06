-- Migration: add_profile_status
-- Description: Adds a status column to profiles to enable soft deletes/suspension of accounts without wiping patient data permanently

-- Step 1. Add column to current profiles if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Optional: Create an index for faster filtering of suspended accounts
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
