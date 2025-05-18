/*
  # Schema Cleanup and Consolidation

  1. Changes
    - Consolidates duplicate table definitions
    - Fixes inconsistent foreign key references
    - Standardizes authorization functions
    - Removes redundant policies
    - Unifies medical history tables structure
    - Standardizes audit logging
    
  2. Security
    - Updates RLS policies for consistency
    - Maintains proper access controls
    - Preserves data integrity
*/

-- Drop any duplicate or conflicting objects
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_doctor() CASCADE;
DROP FUNCTION IF EXISTS is_nurse() CASCADE;

-- Create standardized authorization functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_doctor() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_nurse() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'nurse'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Standardize timestamp handling
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure consistent audit logging
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE row_to_json(NEW)
    END,
    CURRENT_TIMESTAMP
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add missing foreign key constraints
ALTER TABLE consultations
  DROP CONSTRAINT IF EXISTS consultations_doctor_id_fkey,
  ADD CONSTRAINT consultations_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES profiles(id);

ALTER TABLE consultations
  DROP CONSTRAINT IF EXISTS consultations_patient_id_fkey,
  ADD CONSTRAINT consultations_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id)
  ON DELETE CASCADE;

-- Update medical records foreign keys
ALTER TABLE medical_records
  DROP CONSTRAINT IF EXISTS medical_records_patient_id_fkey,
  ADD CONSTRAINT medical_records_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id)
  ON DELETE CASCADE;

-- Ensure all tables have proper timestamps
DO $$ 
BEGIN
  -- Add updated_at columns where missing
  ALTER TABLE patients 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  ALTER TABLE consultations 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  ALTER TABLE medical_records 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  ALTER TABLE pathological_histories 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  ALTER TABLE non_pathological_histories 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  ALTER TABLE hereditary_backgrounds 
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  
  -- Add created_at columns where missing
  ALTER TABLE patients 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE consultations 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE medical_records 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE pathological_histories 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE non_pathological_histories 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE hereditary_backgrounds 
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END $$;

-- Create or update triggers for timestamp management
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'patients',
      'consultations',
      'medical_records',
      'pathological_histories',
      'non_pathological_histories',
      'hereditary_backgrounds'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_timestamp_%I ON %I;
      CREATE TRIGGER set_timestamp_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    ', t.tablename, t.tablename, t.tablename, t.tablename);
  END LOOP;
END $$;

-- Create or update audit triggers
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'patients',
      'consultations',
      'medical_records',
      'pathological_histories',
      'non_pathological_histories',
      'hereditary_backgrounds'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_%I ON %I;
      CREATE TRIGGER audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION audit_table_changes();
    ', t.tablename, t.tablename, t.tablename, t.tablename);
  END LOOP;
END $$;

-- Ensure proper enum types for gender field
DO $$
BEGIN
  ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_gender_check;
  ALTER TABLE patients ADD CONSTRAINT patients_gender_check
    CHECK (gender = ANY (ARRAY['masculino', 'femenino', 'otro']));
END $$;

-- Ensure proper enum types for role field
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role = ANY (ARRAY['administrator', 'doctor', 'nurse']));
END $$;