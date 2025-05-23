/*
  ExpedienteDLM - Medical Records System
  Additional Indexing Strategy
*/

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_name ON users (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = true;

-- Patient-related indexes
CREATE INDEX IF NOT EXISTS idx_patients_name_fuzzy ON patients USING gin(first_name gin_trgm_ops, last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_insurance_policy ON patients (insurance_provider, insurance_policy_number);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients (is_active) WHERE is_active = true;

-- Consultation-related indexes
CREATE INDEX IF NOT EXISTS idx_consultations_date_range ON consultations (consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_upcoming ON consultations (consultation_date) 
  WHERE consultation_date > CURRENT_DATE AND status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_consultations_recent ON consultations (patient_id, consultation_date DESC);

-- Vital signs indexes for reporting
CREATE INDEX IF NOT EXISTS idx_vital_signs_metrics ON vital_signs (patient_id, measured_at, blood_pressure_systolic, blood_pressure_diastolic);
CREATE INDEX IF NOT EXISTS idx_vital_signs_glucose ON vital_signs (patient_id, measured_at, glucose_level);

-- Prescription indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_active ON prescriptions (patient_id, status) 
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_prescriptions_date_range ON prescriptions (start_date, end_date);

-- Custom fields indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_usage ON custom_fields (entity_type, specialty_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_search ON custom_field_values USING gin(value gin_trgm_ops);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_date ON audit_logs (entity_type, entity_id, timestamp DESC);

-- Enable text search for patient records
ALTER TABLE patients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION patients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.middle_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.insurance_provider, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.insurance_policy_number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_search_vector_trigger
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION patients_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_patients_search_vector ON patients USING gin(search_vector);

-- Enable trigram extension for fuzzy searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;