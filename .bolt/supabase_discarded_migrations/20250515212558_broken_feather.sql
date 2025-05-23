/*
  ExpedienteDLM - Medical Records System
  Complete Database Schema with Comments
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- USERS & AUTHENTICATION
-- ================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE roles IS 'System roles for access control';

CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE specialties IS 'Medical specialties (cardiology, neurology, etc.)';

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty_id UUID REFERENCES specialties(id),
    professional_license VARCHAR(50),
    phone VARCHAR(20),
    role_id UUID NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE users IS 'System users including doctors, nurses, and administrators';

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_specialty ON users(specialty_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_professional_license ON users(professional_license);

-- ================================
-- PATIENTS
-- ================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_type VARCHAR(10),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Mexico',
    phone_mobile VARCHAR(20),
    phone_home VARCHAR(20),
    email VARCHAR(255),
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    photo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    preferred_language VARCHAR(50) DEFAULT 'es',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE patients IS 'Patient demographic and contact information';

CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_insurance ON patients(insurance_provider, insurance_policy_number);

CREATE TABLE patient_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    name VARCHAR(200) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    is_primary_contact BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE patient_contacts IS 'Emergency contacts for patients';
CREATE INDEX idx_patient_contacts_patient ON patient_contacts(patient_id);

-- ================================
-- MEDICAL HISTORY
-- ================================

CREATE TABLE medical_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    family_history TEXT,
    personal_pathological_history TEXT,
    personal_non_pathological_history TEXT,
    surgical_history TEXT,
    current_medications TEXT,
    immunization_history TEXT,
    chronic_diseases TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE medical_histories IS 'Complete medical history for patients';
CREATE INDEX idx_medical_histories_patient ON medical_histories(patient_id);

CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    allergy_type VARCHAR(50) NOT NULL, -- medication, food, environmental
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE allergies IS 'Catalog of common allergies';

CREATE TABLE patient_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    allergy_id UUID NOT NULL REFERENCES allergies(id),
    severity VARCHAR(50), -- mild, moderate, severe
    reaction_description TEXT,
    diagnosis_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(patient_id, allergy_id)
);

COMMENT ON TABLE patient_allergies IS 'Junction table connecting patients to their allergies';
CREATE INDEX idx_patient_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_allergy ON patient_allergies(allergy_id);

-- ================================
-- CONSULTATIONS
-- ================================

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    consultation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    chief_complaint TEXT NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, canceled, no-show
    consultation_type VARCHAR(50) DEFAULT 'regular', -- regular, emergency, follow-up
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE consultations IS 'Medical consultations/appointments';
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_consultations_status ON consultations(status);

-- ================================
-- VITAL SIGNS
-- ================================

CREATE TABLE vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature DECIMAL(5,2),
    temperature_unit VARCHAR(1) DEFAULT 'C', -- C or F
    weight DECIMAL(5,2),
    weight_unit VARCHAR(2) DEFAULT 'kg',
    height DECIMAL(5,2),
    height_unit VARCHAR(2) DEFAULT 'cm',
    bmi DECIMAL(5,2),
    oxygen_saturation INTEGER,
    glucose_level INTEGER,
    pain_level INTEGER,
    notes TEXT,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE vital_signs IS 'Patient vital signs recorded during consultations';
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_consultation ON vital_signs(consultation_id);
CREATE INDEX idx_vital_signs_measured_at ON vital_signs(measured_at);

-- ================================
-- MEDICATIONS & PRESCRIPTIONS
-- ================================

CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    form VARCHAR(100) NOT NULL, -- tablet, liquid, injection, etc.
    strength VARCHAR(100) NOT NULL,
    strength_unit VARCHAR(50) NOT NULL,
    administration_route VARCHAR(100) NOT NULL, -- oral, topical, etc.
    pharmaceutical_class VARCHAR(255),
    contraindications TEXT,
    side_effects TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE medications IS 'Medication catalog with details';
CREATE INDEX idx_medications_brand ON medications(brand_name);
CREATE INDEX idx_medications_generic ON medications(generic_name);
CREATE INDEX idx_medications_class ON medications(pharmaceutical_class);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    medication_id UUID NOT NULL REFERENCES medications(id),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100),
    quantity INTEGER,
    refills INTEGER DEFAULT 0,
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, discontinued
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE prescriptions IS 'Medication prescriptions given to patients';
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_consultation ON prescriptions(consultation_id);
CREATE INDEX idx_prescriptions_medication ON prescriptions(medication_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);

-- ================================
-- MEDICAL TESTS & STUDIES
-- ================================

CREATE TABLE medical_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    consultation_id UUID REFERENCES consultations(id),
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(100) NOT NULL, -- blood test, imaging, etc.
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_date TIMESTAMP WITH TIME ZONE,
    results TEXT,
    interpretation TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'requested', -- requested, completed, canceled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE medical_tests IS 'Medical tests and studies for patients';
CREATE INDEX idx_medical_tests_patient ON medical_tests(patient_id);
CREATE INDEX idx_medical_tests_doctor ON medical_tests(doctor_id);
CREATE INDEX idx_medical_tests_consultation ON medical_tests(consultation_id);
CREATE INDEX idx_medical_tests_status ON medical_tests(status);

CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- patient, consultation, medical_test
    entity_id UUID NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

COMMENT ON TABLE file_attachments IS 'Files attached to various entities in the system';
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);

-- ================================
-- CUSTOM FIELDS
-- ================================

CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) NOT NULL, -- patient, consultation, medical_history
    field_type VARCHAR(50) NOT NULL, -- text, number, date, select, checkbox, etc.
    options JSONB, -- For select, checkbox, etc.
    default_value TEXT,
    is_required BOOLEAN DEFAULT false,
    is_searchable BOOLEAN DEFAULT false,
    display_order INTEGER,
    specialty_id UUID REFERENCES specialties(id), -- NULL means available for all specialties
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE custom_fields IS 'Custom fields defined for different entities';
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX idx_custom_fields_specialty ON custom_fields(specialty_id);

CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_field_id UUID NOT NULL REFERENCES custom_fields(id),
    entity_id UUID NOT NULL, -- ID of the entity (patient, consultation, etc.)
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE custom_field_values IS 'Values for custom fields';
CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_id);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_id);
CREATE UNIQUE INDEX idx_custom_field_entity_unique ON custom_field_values(custom_field_id, entity_id);

-- ================================
-- AUDIT LOG
-- ================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    entity_type VARCHAR(50) NOT NULL, -- table name
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'System audit logs for compliance and security';
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at column
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
        AND c.column_name = 'updated_at'
        AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log changes to audited tables
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_row JSONB := null;
    new_row JSONB := null;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_row = row_to_json(OLD)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            old_row,
            null
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_row = row_to_json(OLD)::JSONB;
        new_row = row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            old_row,
            new_row
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_row = row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            null,
            new_row
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to main tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('audit_logs') -- exclude audit table itself
    LOOP
        EXECUTE format('
            CREATE TRIGGER audit_%s_changes
            AFTER INSERT OR UPDATE OR DELETE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION audit_table_changes();
        ', table_name, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- INITIAL DATA
-- ================================

-- Insert basic roles
INSERT INTO roles (name, description) VALUES
('administrator', 'System administrator with full access'),
('doctor', 'Medical doctor with access to assigned patients'),
('nurse', 'Nursing staff with limited access'),
('receptionist', 'Front desk staff for appointments');

-- Insert common specialties
INSERT INTO specialties (name) VALUES
('General Medicine'),
('Cardiology'),
('Dermatology'),
('Endocrinology'),
('Gastroenterology'),
('Neurology'),
('Obstetrics and Gynecology'),
('Ophthalmology'),
('Orthopedics'),
('Pediatrics'),
('Psychiatry'),
('Pulmonology'),
('Radiology'),
('Urology');

-- Insert common allergies
INSERT INTO allergies (name, allergy_type) VALUES
('Penicillin', 'medication'),
('Aspirin', 'medication'),
('Ibuprofen', 'medication'),
('Sulfa', 'medication'),
('Peanuts', 'food'),
('Tree nuts', 'food'),
('Shellfish', 'food'),
('Eggs', 'food'),
('Milk', 'food'),
('Soy', 'food'),
('Wheat', 'food'),
('Pollen', 'environmental'),
('Dust mites', 'environmental'),
('Mold', 'environmental'),
('Animal dander', 'environmental'),
('Latex', 'environmental');