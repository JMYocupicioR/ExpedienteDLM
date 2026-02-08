-- Fix Foreign Key constraints to allow clinic deletion

-- 1. patients: Switch from NO ACTION to CASCADE
-- If a clinic is deleted, its patients should be deleted.
ALTER TABLE patients
DROP CONSTRAINT IF EXISTS patients_clinic_id_fkey,
ADD CONSTRAINT patients_clinic_id_fkey
    FOREIGN KEY (clinic_id)
    REFERENCES clinics(id)
    ON DELETE CASCADE;

-- 2. clinical_rules: Switch from NO ACTION to CASCADE
-- Rules belong to a clinic.
ALTER TABLE clinical_rules
DROP CONSTRAINT IF EXISTS clinical_rules_clinic_id_fkey,
ADD CONSTRAINT clinical_rules_clinic_id_fkey
    FOREIGN KEY (clinic_id)
    REFERENCES clinics(id)
    ON DELETE CASCADE;

-- 3. profiles: Switch from NO ACTION to SET NULL
-- Users might exist without a clinic, or be re-assigned.
-- Deleting a clinic should not delete the user account, just unlink it.
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_clinic_id_fkey,
ADD CONSTRAINT profiles_clinic_id_fkey
    FOREIGN KEY (clinic_id)
    REFERENCES clinics(id)
    ON DELETE SET NULL;
