-- Add administrative_assistant to profiles.role CHECK constraint
-- This allows users whose primary/global role is receptionist to have profiles.role = 'administrative_assistant'.
-- Note: clinic_user_relationships.role_in_clinic is the per-clinic role; profiles.role is the global role.
-- If the constraint doesn't exist, this migration is a no-op for the DROP; the ADD will create it.

DO $$
BEGIN
  -- Drop existing constraint if it exists (constraint may have been added by Supabase or another migration)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Add new constraint with administrative_assistant included.
  -- Includes all known profile roles used in the app.
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'doctor',
    'super_admin',
    'admin_staff',
    'administrator',
    'admin',
    'health_staff',
    'patient',
    'nurse',
    'staff',
    'administrative_assistant'
  ));
END $$;
