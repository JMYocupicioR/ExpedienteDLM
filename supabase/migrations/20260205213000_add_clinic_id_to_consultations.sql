-- Add missing clinic_id column to consultations table
-- User reported error 42703: column "clinic_id" does not exist when creating indexes

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'clinic_id') THEN
        ALTER TABLE consultations ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_consultations_clinic_id ON consultations(clinic_id);
    END IF;
END $$;
