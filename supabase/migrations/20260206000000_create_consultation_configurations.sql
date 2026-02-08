-- Create consultation_configurations table
CREATE TABLE IF NOT EXISTS consultation_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    
    -- General Configuration (Start Mode)
    general_config JSONB DEFAULT '{
        "start_mode": "classic", 
        "hide_physical_exam": false,
        "unify_hpi": false
    }'::JSONB,
    
    -- HPI Configuration
    hpi_config JSONB DEFAULT '{
        "enable_voice": false,
        "enable_autocomplete": true,
        "show_chronology": true
    }'::JSONB,
    
    -- Alerts Configuration
    alerts_config JSONB DEFAULT '{
        "alert_missing_prescription": true,
        "alert_missing_diagnosis": true,
        "alert_allergies": true,
        "alert_vital_signs": false
    }'::JSONB,
    
    -- Prescription Configuration
    prescription_config JSONB DEFAULT '{
        "add_brand_name": false,
        "natural_language_instructions": true,
        "include_diagnosis": false,
        "include_next_appointment": true,
        "default_digital_signature": true
    }'::JSONB,
    
    -- Automation Configuration
    automation_config JSONB DEFAULT '{
        "auto_send_prescription": false,
        "generate_summary": false
    }'::JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id, clinic_id)
);

-- Enable RLS
ALTER TABLE consultation_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own configuration" ON consultation_configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configuration" ON consultation_configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configuration" ON consultation_configurations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configuration" ON consultation_configurations
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_consultation_configurations_updated_at
    BEFORE UPDATE ON consultation_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
