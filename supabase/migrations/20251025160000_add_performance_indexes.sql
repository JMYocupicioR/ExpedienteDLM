-- =====================================================
-- Performance Optimization - Database Indexes
-- Fecha: 2025-10-25
-- Descripcion: Indices para optimizar queries frecuentes
-- =====================================================

-- =====================================================
-- PATIENTS TABLE INDEXES
-- =====================================================

-- Index for patient search by name (case-insensitive)
-- Using pg_trgm extension for fuzzy text search
CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm
ON patients
USING gin (full_name extensions.gin_trgm_ops);

-- Index for patient lookup by clinic
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id_active
ON patients (clinic_id, is_active)
WHERE is_active = true;

-- Index for patient lookup by doctor
CREATE INDEX IF NOT EXISTS idx_patients_primary_doctor
ON patients (primary_doctor_id)
WHERE primary_doctor_id IS NOT NULL;

-- Index for patient search by CURP
CREATE INDEX IF NOT EXISTS idx_patients_curp
ON patients (social_security_number)
WHERE social_security_number IS NOT NULL;

-- Composite index for common patient queries
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created
ON patients (clinic_id, created_at DESC);

-- =====================================================
-- CONSULTATIONS TABLE INDEXES
-- =====================================================

-- Index for consultations by patient
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date
ON consultations (patient_id, created_at DESC);

-- Index for consultations by doctor
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_date
ON consultations (doctor_id, created_at DESC);

-- Index for recent consultations
CREATE INDEX IF NOT EXISTS idx_consultations_created
ON consultations (created_at DESC);

-- Index for patient-doctor consultation history
CREATE INDEX IF NOT EXISTS idx_consultations_patient_doctor
ON consultations (patient_id, doctor_id, created_at DESC);

-- =====================================================
-- APPOINTMENTS TABLE INDEXES
-- =====================================================

-- Index for appointments by patient
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
ON appointments (patient_id, appointment_date DESC, appointment_time DESC);

-- Index for appointments by doctor
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
ON appointments (doctor_id, appointment_date DESC, appointment_time DESC);

-- Index for appointments by clinic
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
ON appointments (clinic_id, appointment_date DESC);

-- Index for appointment status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status_date
ON appointments (status, appointment_date DESC)
WHERE status IN ('scheduled', 'confirmed_by_patient');

-- Index for conflict detection (overlapping appointments)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_datetime
ON appointments (doctor_id, appointment_date, appointment_time)
WHERE status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show');

-- =====================================================
-- CLINIC USER RELATIONSHIPS INDEXES
-- =====================================================

-- Index for user's clinics lookup
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_active
ON clinic_user_relationships (user_id, is_active, status)
WHERE is_active = true AND status = 'approved';

-- Index for clinic's staff lookup
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic_active
ON clinic_user_relationships (clinic_id, is_active, role_in_clinic)
WHERE is_active = true AND status = 'approved';

-- Index for pending access requests
CREATE INDEX IF NOT EXISTS idx_clinic_users_pending
ON clinic_user_relationships (clinic_id, status, requested_at DESC)
WHERE status = 'pending';

-- =====================================================
-- PROFILES TABLE INDEXES
-- =====================================================

-- Index for profile lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles (email)
WHERE email IS NOT NULL;

-- Index for profile search by name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
ON profiles
USING gin (full_name extensions.gin_trgm_ops);

-- Index for doctors by specialty
CREATE INDEX IF NOT EXISTS idx_profiles_specialty
ON profiles (specialty_id)
WHERE specialty_id IS NOT NULL;

-- =====================================================
-- ACTIVITY LOGS TABLE INDEXES
-- =====================================================

-- Index for activity logs by user
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date
ON activity_logs (user_id, created_at DESC);

-- Index for activity logs by clinic
CREATE INDEX IF NOT EXISTS idx_activity_logs_clinic_date
ON activity_logs (clinic_id, created_at DESC)
WHERE clinic_id IS NOT NULL;

-- Index for activity logs by action type
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_date
ON activity_logs (action_type, created_at DESC);

-- =====================================================
-- MEDICAL TEST FILES INDEXES
-- =====================================================

-- Index for files by medical test
CREATE INDEX IF NOT EXISTS idx_medical_files_test
ON medical_test_files (medical_test_id, created_at DESC);

-- Index for files by hash (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_medical_files_hash
ON medical_test_files (file_hash)
WHERE file_hash IS NOT NULL;

-- =====================================================
-- CLINIC CONFIGURATIONS INDEXES
-- =====================================================

-- Index for configuration by clinic
CREATE INDEX IF NOT EXISTS idx_clinic_config_clinic
ON clinic_configurations (clinic_id);

-- Index for recent configurations
CREATE INDEX IF NOT EXISTS idx_clinic_config_updated
ON clinic_configurations (updated_at DESC);

-- =====================================================
-- USER CLINIC PREFERENCES INDEXES
-- =====================================================

-- Composite index for user preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_clinic
ON user_clinic_preferences (user_id, clinic_id);

-- =====================================================
-- PRESCRIPTION VISUAL LAYOUTS INDEXES
-- =====================================================

-- Index for layouts by user
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_user
ON prescription_visual_layouts (user_id, created_at DESC);

-- Index for public layouts
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_public
ON prescription_visual_layouts (is_public, created_at DESC)
WHERE is_public = true;

-- Index for active layouts
CREATE INDEX IF NOT EXISTS idx_prescription_layouts_active
ON prescription_visual_layouts (user_id, is_active)
WHERE is_active = true;

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

-- Update statistics for query planner optimization
ANALYZE patients;
ANALYZE consultations;
ANALYZE appointments;
ANALYZE clinic_user_relationships;
ANALYZE profiles;
ANALYZE activity_logs;
ANALYZE medical_test_files;
ANALYZE clinic_configurations;
ANALYZE user_clinic_preferences;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    index_count INT;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE 'Total performance indexes created: %', index_count;
END $$;

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
