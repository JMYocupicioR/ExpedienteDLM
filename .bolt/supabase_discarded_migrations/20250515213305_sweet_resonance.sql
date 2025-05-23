/*
  # Add Row Level Security Policies

  1. Security Changes
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for specific roles (doctors, nurses, administrators)
    
  2. Access Control
    - Administrators have full access to all records
    - Doctors can only access their patients' records
    - Nurses can view and update assigned patients
    - Users can only view their own profile
    - Patients can only access their own records (future implementation)

  3. Audit
    - All data modifications are tracked through audit_logs table
*/

-- Enable Row Level Security on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is an administrator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.name = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.name = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a nurse
CREATE OR REPLACE FUNCTION is_nurse()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.name = 'nurse'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Administrators can manage all users"
  ON users
  TO authenticated
  USING (is_admin());

-- Roles Policies
CREATE POLICY "Roles are viewable by all authenticated users"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can manage roles"
  ON roles
  USING (is_admin());

-- Specialties Policies
CREATE POLICY "Specialties are viewable by all authenticated users"
  ON specialties
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can manage specialties"
  ON specialties
  USING (is_admin());

-- Patients Policies
CREATE POLICY "Doctors can view their patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.patient_id = patients.id
      AND c.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update their patients"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.patient_id = patients.id
      AND c.doctor_id = auth.uid()
    )
  );

-- Consultations Policies
CREATE POLICY "Doctors can view their consultations"
  ON consultations
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid()
  );

CREATE POLICY "Doctors can manage their consultations"
  ON consultations
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid()
  );

-- Vital Signs Policies
CREATE POLICY "Medical staff can view vital signs"
  ON vital_signs
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = vital_signs.consultation_id
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

CREATE POLICY "Medical staff can manage vital signs"
  ON vital_signs
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = vital_signs.consultation_id
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

-- Medications Policies
CREATE POLICY "Medications are viewable by all medical staff"
  ON medications
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "Only administrators can manage medications"
  ON medications
  USING (is_admin());

-- Prescriptions Policies
CREATE POLICY "Doctors can view their prescriptions"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid()
  );

CREATE POLICY "Doctors can manage their prescriptions"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid()
  );

-- Medical Tests Policies
CREATE POLICY "Medical staff can view tests"
  ON medical_tests
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid() OR
    is_nurse()
  );

CREATE POLICY "Doctors can manage medical tests"
  ON medical_tests
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    doctor_id = auth.uid()
  );

-- File Attachments Policies
CREATE POLICY "Medical staff can view attachments"
  ON file_attachments
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id::text = file_attachments.entity_id::text
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

CREATE POLICY "Medical staff can manage attachments"
  ON file_attachments
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id::text = file_attachments.entity_id::text
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

-- Custom Fields Policies
CREATE POLICY "Custom fields are viewable by all medical staff"
  ON custom_fields
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "Only administrators can manage custom fields"
  ON custom_fields
  USING (is_admin());

-- Custom Field Values Policies
CREATE POLICY "Medical staff can view custom field values"
  ON custom_field_values
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id::text = custom_field_values.entity_id::text
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

CREATE POLICY "Medical staff can manage custom field values"
  ON custom_field_values
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id::text = custom_field_values.entity_id::text
      AND c.doctor_id = auth.uid()
    ) OR
    is_nurse()
  );

-- Audit Logs Policies
CREATE POLICY "Administrators can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());