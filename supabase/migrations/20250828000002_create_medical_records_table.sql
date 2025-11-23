-- Create medical_records table
-- This migration creates the medical_records table that is referenced by other migrations

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    record_type TEXT NOT NULL DEFAULT 'general' CHECK (record_type IN (
        'general', 'vital_signs', 'lab_results', 'imaging', 'procedure', 'allergy', 'medication'
    )),
    title TEXT NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}'::JSONB,
    file_url TEXT,
    file_type TEXT,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with conflict handling)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON medical_records;
    DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON medical_records;
    DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON medical_records;
    DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON medical_records;
    
    -- Create new policies
    CREATE POLICY "medical_records_select_own_clinic" ON medical_records
        FOR SELECT USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "medical_records_insert_own_clinic" ON medical_records
        FOR INSERT WITH CHECK (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "medical_records_update_own_clinic" ON medical_records
        FOR UPDATE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "medical_records_delete_own_clinic" ON medical_records
        FOR DELETE USING (
            clinic_id IN (
                SELECT clinic_id FROM clinic_user_relationships 
                WHERE user_id = auth.uid() AND is_active = true
            )
        );
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_clinic_id ON medical_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_consultation_id ON medical_records(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_important ON medical_records(is_important);
