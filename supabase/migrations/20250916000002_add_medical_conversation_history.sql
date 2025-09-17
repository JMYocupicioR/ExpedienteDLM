-- Create table for medical conversation history
CREATE TABLE IF NOT EXISTS medical_conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSON NOT NULL DEFAULT '[]'::JSON,
    is_starred BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE medical_conversation_history ENABLE ROW LEVEL SECURITY;

-- Doctors can only access their own conversation history
CREATE POLICY "Doctors can view their own conversation history" ON medical_conversation_history
    FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can insert their own conversation history" ON medical_conversation_history
    FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their own conversation history" ON medical_conversation_history
    FOR UPDATE USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their own conversation history" ON medical_conversation_history
    FOR DELETE USING (doctor_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_conversation_history_doctor_id ON medical_conversation_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_conversation_history_patient_id ON medical_conversation_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_conversation_history_consultation_id ON medical_conversation_history(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medical_conversation_history_updated_at ON medical_conversation_history(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_conversation_history_is_starred ON medical_conversation_history(is_starred) WHERE is_starred = true;

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_medical_conversation_history_updated_at
    BEFORE UPDATE ON medical_conversation_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE medical_conversation_history IS 'Stores conversation history between doctors and the AI medical assistant';
COMMENT ON COLUMN medical_conversation_history.messages IS 'JSON array of conversation messages with metadata';
COMMENT ON COLUMN medical_conversation_history.title IS 'Human-readable title for the conversation';
COMMENT ON COLUMN medical_conversation_history.is_starred IS 'Whether the conversation is marked as important by the doctor';
COMMENT ON COLUMN medical_conversation_history.tags IS 'Array of tags for categorizing conversations';