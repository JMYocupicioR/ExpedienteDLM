-- Create consultations table
-- This migration creates the consultations table that is referenced by other migrations

CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with conflict handling)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "consultations_select_own_clinic" ON consultations;
    DROP POLICY IF EXISTS "consultations_insert_own_clinic" ON consultations;
    DROP POLICY IF EXISTS "consultations_update_own_clinic" ON consultations;
    DROP POLICY IF EXISTS "consultations_delete_own_clinic" ON consultations;
    
    -- Create new policies
    CREATE POLICY "consultations_select_own_clinic" ON consultations
        FOR SELECT USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "consultations_insert_own_clinic" ON consultations
        FOR INSERT WITH CHECK (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "consultations_update_own_clinic" ON consultations
        FOR UPDATE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "consultations_delete_own_clinic" ON consultations
        FOR DELETE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_clinic_id ON consultations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date);
