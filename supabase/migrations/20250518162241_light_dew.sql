/*
  # Database Optimizations
  
  1. Search Capabilities
    - Enables trigram extension for fuzzy search
    - Adds search vector for full-text search
    - Creates optimized indexes
  
  2. Performance Indexes
    - Adds indexes for common query patterns
    - Optimizes joins and filters
*/

-- Enable trigram extension for fuzzy searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search capabilities to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION patients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.address, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_search_vector_trigger
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION patients_search_vector_update();

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_patients_search_vector ON patients USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_email_trgm ON patients USING gin(email gin_trgm_ops);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date ON consultations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_pathological_histories_patient ON pathological_histories(patient_id);
CREATE INDEX IF NOT EXISTS idx_non_pathological_histories_patient ON non_pathological_histories(patient_id);
CREATE INDEX IF NOT EXISTS idx_hereditary_backgrounds_patient ON hereditary_backgrounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_attachments_record ON attachments(medical_record_id);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON profiles USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING gin(full_name gin_trgm_ops);