-- Create prescriptions table
-- This migration creates the prescriptions table that is referenced by other migrations

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    prescription_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    medications JSONB DEFAULT '[]'::JSONB,
    instructions TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with conflict handling)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON prescriptions;
    DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON prescriptions;
    DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON prescriptions;
    DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON prescriptions;
    
    -- Create new policies
    CREATE POLICY "prescriptions_select_own_clinic" ON prescriptions
        FOR SELECT USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "prescriptions_insert_own_clinic" ON prescriptions
        FOR INSERT WITH CHECK (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "prescriptions_update_own_clinic" ON prescriptions
        FOR UPDATE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "prescriptions_delete_own_clinic" ON prescriptions
        FOR DELETE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date);
