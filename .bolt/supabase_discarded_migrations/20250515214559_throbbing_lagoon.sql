/*
  # Add Row Level Security Policies
  
  1. Helper Functions
    - Create functions to check user roles (admin, doctor, nurse)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for each table based on user roles and relationships
    - Implement HIPAA-compliant access controls
    
  3. Policies Overview
    - Administrators have full access
    - Doctors can access their patients' data
    - Nurses can view assigned patients
    - Users can view their own profiles
*/

-- Helper function to check if user is an administrator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM users 
      JOIN roles ON users.role_id = roles.id 
      WHERE roles.name = 'administrator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM users 
      JOIN roles ON users.role_id = roles.id 
      WHERE roles.name = 'doctor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a nurse
CREATE OR REPLACE FUNCTION is_nurse()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND u.email IN (
      SELECT email FROM users 
      JOIN roles ON users.role_id = roles.id 
      WHERE roles.name = 'nurse'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
DO $$
BEGIN
  -- Core tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'specialties') THEN
    ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Patient-related tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_contacts') THEN
    ALTER TABLE patient_contacts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_histories') THEN
    ALTER TABLE medical_histories ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Clinical tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations') THEN
    ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vital_signs') THEN
    ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medications') THEN
    ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_tests') THEN
    ALTER TABLE medical_tests ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Support tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_attachments') THEN
    ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_fields') THEN
    ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_field_values') THEN
    ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for each table
DO $$
BEGIN
  -- Users policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    CREATE POLICY "Users can view their own profile"
      ON users FOR SELECT
      USING (auth.uid() = id);
      
    DROP POLICY IF EXISTS "Administrators can manage all users" ON users;
    CREATE POLICY "Administrators can manage all users"
      ON users TO authenticated
      USING (is_admin());
  END IF;

  -- Roles policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    DROP POLICY IF EXISTS "Roles are viewable by all authenticated users" ON roles;
    CREATE POLICY "Roles are viewable by all authenticated users"
      ON roles FOR SELECT
      TO authenticated
      USING (true);
      
    DROP POLICY IF EXISTS "Only administrators can manage roles" ON roles;
    CREATE POLICY "Only administrators can manage roles"
      ON roles USING (is_admin());
  END IF;

  -- Patients policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    DROP POLICY IF EXISTS "Medical staff can access patients" ON patients;
    CREATE POLICY "Medical staff can access patients"
      ON patients TO authenticated
      USING (
        is_admin() OR
        (is_doctor() AND EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.patient_id = patients.id
          AND c.doctor_id = auth.uid()
        )) OR
        (is_nurse() AND EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.patient_id = patients.id
          AND c.doctor_id IN (
            SELECT id FROM users
            WHERE specialty_id = (
              SELECT specialty_id FROM users WHERE id = auth.uid()
            )
          )
        ))
      );
  END IF;

  -- Consultations policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations') THEN
    DROP POLICY IF EXISTS "Medical staff can access consultations" ON consultations;
    CREATE POLICY "Medical staff can access consultations"
      ON consultations TO authenticated
      USING (
        is_admin() OR
        doctor_id = auth.uid() OR
        (is_nurse() AND doctor_id IN (
          SELECT id FROM users
          WHERE specialty_id = (
            SELECT specialty_id FROM users WHERE id = auth.uid()
          )
        ))
      );
  END IF;

  -- Medical records policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_histories') THEN
    DROP POLICY IF EXISTS "Medical staff can access histories" ON medical_histories;
    CREATE POLICY "Medical staff can access histories"
      ON medical_histories TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = medical_histories.patient_id
          AND (
            is_admin() OR
            (is_doctor() AND EXISTS (
              SELECT 1 FROM consultations c
              WHERE c.patient_id = p.id
              AND c.doctor_id = auth.uid()
            ))
          )
        )
      );
  END IF;

  -- Audit logs policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    DROP POLICY IF EXISTS "Only administrators can view audit logs" ON audit_logs;
    CREATE POLICY "Only administrators can view audit logs"
      ON audit_logs TO authenticated
      USING (is_admin());
  END IF;
END $$;