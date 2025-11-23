-- Add new fields for advanced medical consultation system

-- Add columns to consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS medications JSON DEFAULT '[]'::JSON;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS cie10_code TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS cie10_description TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS recommendations JSON DEFAULT '{}'::JSON;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quality_metrics JSON DEFAULT '{}'::JSON;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS symptom_analysis JSON DEFAULT '{}'::JSON;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS red_flags JSON DEFAULT '[]'::JSON;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultations_cie10_code ON consultations(cie10_code);
CREATE INDEX IF NOT EXISTS idx_consultations_validation_score ON consultations(validation_score);

-- Create table for CIE-10 favorites per doctor
CREATE TABLE IF NOT EXISTS doctor_cie10_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cie10_code TEXT NOT NULL,
    cie10_description TEXT NOT NULL,
    category TEXT,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, cie10_code)
);

-- Create table for medical recommendations history
CREATE TABLE IF NOT EXISTS medical_recommendations_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendations JSON NOT NULL DEFAULT '{}'::JSON,
    ai_generated BOOLEAN DEFAULT true,
    confidence_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for prescription templates
CREATE TABLE IF NOT EXISTS prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medications JSON NOT NULL DEFAULT '[]'::JSON,
    instructions TEXT,
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE doctor_cie10_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_recommendations_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- CIE-10 favorites policies
CREATE POLICY "Users can view their own CIE-10 favorites" ON doctor_cie10_favorites
    FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Users can insert their own CIE-10 favorites" ON doctor_cie10_favorites
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Users can update their own CIE-10 favorites" ON doctor_cie10_favorites
    FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Users can delete their own CIE-10 favorites" ON doctor_cie10_favorites
    FOR DELETE USING (doctor_id = auth.uid());

-- Medical recommendations history policies
CREATE POLICY "Users can view their own recommendations history" ON medical_recommendations_history
    FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Users can insert their own recommendations history" ON medical_recommendations_history
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

-- Prescription templates policies
CREATE POLICY "Users can view their own and public prescription templates" ON prescription_templates
    FOR SELECT USING (doctor_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert their own prescription templates" ON prescription_templates
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Users can update their own prescription templates" ON prescription_templates
    FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Users can delete their own prescription templates" ON prescription_templates
    FOR DELETE USING (doctor_id = auth.uid());

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_doctor_cie10_favorites_doctor_id ON doctor_cie10_favorites(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_cie10_favorites_usage_count ON doctor_cie10_favorites(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_medical_recommendations_history_consultation_id ON medical_recommendations_history(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor_id ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_usage_count ON prescription_templates(usage_count DESC);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prescription_templates_updated_at
    BEFORE UPDATE ON prescription_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on new columns
COMMENT ON COLUMN consultations.medications IS 'JSON array of prescribed medications with detailed information';
COMMENT ON COLUMN consultations.cie10_code IS 'Selected CIE-10 diagnostic code';
COMMENT ON COLUMN consultations.cie10_description IS 'Description of the CIE-10 diagnostic code';
COMMENT ON COLUMN consultations.recommendations IS 'AI-generated medical recommendations JSON object';
COMMENT ON COLUMN consultations.validation_score IS 'Medical safety validation score (0-100)';
COMMENT ON COLUMN consultations.quality_metrics IS 'Quality metrics and safety indicators JSON object';
COMMENT ON COLUMN consultations.symptom_analysis IS 'AI analysis of symptoms including timeline, severity, red flags';
COMMENT ON COLUMN consultations.red_flags IS 'JSON array of critical red flags detected during consultation';