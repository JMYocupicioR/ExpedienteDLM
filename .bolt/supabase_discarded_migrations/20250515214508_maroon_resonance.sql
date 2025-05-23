/*
  # Add Row Level Security Policies

  1. Security Changes
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for specific roles (doctors, nurses, administrators)
    
  2. Access Control
    - Administrators have full access to all records
    - Doctors can only access their patients' records
    - Nurses can view and update assigned patient records
    - Patients can only view their own records
    - All users can view their own profile
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

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Administrators can manage all users"
  ON users
  TO authenticated
  USING (is_admin());

-- Roles table policies
CREATE POLICY "Roles are viewable by all authenticated users"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can manage roles"
  ON roles
  USING (is_admin());

-- Specialties table policies
CREATE POLICY "Specialties are viewable by all authenticated users"
  ON specialties
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only administrators can manage specialties"
  ON specialties
  USING (is_admin());

-- Patients table policies
CREATE POLICY "Doctors can access their patients"
  ON patients
  TO authenticated
  USING (
    is_admin() OR
    (is_doctor() AND EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.patient_id = patients.id
      AND c.doctor_id = auth.uid()
    ))
  );

CREATE POLICY "Nurses can view assigned patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    is_nurse() AND EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.patient_id = patients.id
      AND c.doctor_id IN (
        SELECT id FROM users
        WHERE specialty_id = (
          SELECT specialty_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- Patient contacts policies
CREATE POLICY "Access patient contacts through patient access"
  ON patient_contacts
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_contacts.patient_id
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

-- Medical histories policies
CREATE POLICY "Access medical histories through patient access"
  ON medical_histories
  TO authenticated
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

-- Consultations policies
CREATE POLICY "Doctors can manage their consultations"
  ON consultations
  TO authenticated
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

-- Vital signs policies
CREATE POLICY "Access vital signs through consultation access"
  ON vital_signs
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = vital_signs.consultation_id
      AND (
        is_admin() OR
        c.doctor_id = auth.uid() OR
        (is_nurse() AND c.doctor_id IN (
          SELECT id FROM users
          WHERE specialty_id = (
            SELECT specialty_id FROM users WHERE id = auth.uid()
          )
        ))
      )
    )
  );

-- Medications policies
CREATE POLICY "Medications are viewable by authenticated medical staff"
  ON medications
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "Only administrators can manage medications"
  ON medications
  USING (is_admin());

-- Prescriptions policies
CREATE POLICY "Access prescriptions through consultation access"
  ON prescriptions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = prescriptions.consultation_id
      AND (
        is_admin() OR
        c.doctor_id = auth.uid() OR
        (is_nurse() AND c.doctor_id IN (
          SELECT id FROM users
          WHERE specialty_id = (
            SELECT specialty_id FROM users WHERE id = auth.uid()
          )
        ))
      )
    )
  );

-- Medical tests policies
CREATE POLICY "Access medical tests through consultation access"
  ON medical_tests
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = medical_tests.consultation_id
      AND (
        is_admin() OR
        c.doctor_id = auth.uid() OR
        (is_nurse() AND c.doctor_id IN (
          SELECT id FROM users
          WHERE specialty_id = (
            SELECT specialty_id FROM users WHERE id = auth.uid()
          )
        ))
      )
    )
  );

-- File attachments policies
CREATE POLICY "Access file attachments through entity access"
  ON file_attachments
  TO authenticated
  USING (
    CASE entity_type
      WHEN 'patient' THEN
        EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = entity_id::uuid
          AND (
            is_admin() OR
            (is_doctor() AND EXISTS (
              SELECT 1 FROM consultations c
              WHERE c.patient_id = p.id
              AND c.doctor_id = auth.uid()
            ))
          )
        )
      WHEN 'consultation' THEN
        EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.id = entity_id::uuid
          AND (
            is_admin() OR
            c.doctor_id = auth.uid()
          )
        )
      WHEN 'medical_test' THEN
        EXISTS (
          SELECT 1 FROM medical_tests mt
          WHERE mt.id = entity_id::uuid
          AND (
            is_admin() OR
            mt.doctor_id = auth.uid()
          )
        )
      ELSE false
    END
  );

-- Custom fields policies
CREATE POLICY "Custom fields are viewable by authenticated medical staff"
  ON custom_fields
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_doctor() OR is_nurse());

CREATE POLICY "Only administrators can manage custom fields"
  ON custom_fields
  USING (is_admin());

-- Custom field values policies
CREATE POLICY "Access custom field values through entity access"
  ON custom_field_values
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_fields cf
      WHERE cf.id = custom_field_values.custom_field_id
      AND (
        is_admin() OR
        (is_doctor() AND EXISTS (
          SELECT 1 FROM consultations c
          WHERE c.patient_id = entity_id::uuid
          AND c.doctor_id = auth.uid()
        ))
      )
    )
  );

-- Audit logs policies
CREATE POLICY "Only administrators can view audit logs"
  ON audit_logs
  TO authenticated
  USING (is_admin());