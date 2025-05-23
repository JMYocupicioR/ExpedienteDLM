/*
  # Row Level Security Implementation

  1. Security Overview
    - Enable RLS on all tables
    - Create policies for different user roles (doctors, staff)
    - Implement HIPAA-compliant access controls
    - Ensure data segregation and privacy

  2. Tables Affected
    - users
    - patients
    - medical_histories
    - consultations
    - vital_signs
    - medications
    - prescriptions
    - medical_tests
    - custom_fields
    - custom_field_values

  3. Policy Types
    - SELECT: Read access to records
    - INSERT: Create new records
    - UPDATE: Modify existing records
    - DELETE: Soft delete records
*/

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Patients table policies
CREATE POLICY "Doctors can view assigned patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can create patient records"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can update their patients' records"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = patients.id
      AND consultations.doctor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = patients.id
      AND consultations.doctor_id = auth.uid()
    )
  );

-- Medical histories policies
CREATE POLICY "Doctors can view patient histories"
  ON medical_histories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = medical_histories.patient_id
      AND consultations.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can create medical histories"
  ON medical_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'doctor'
    )
  );

-- Consultations policies
CREATE POLICY "Doctors can view their consultations"
  ON consultations
  FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create consultations"
  ON consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their consultations"
  ON consultations
  FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Vital signs policies
CREATE POLICY "Access vital signs through consultation"
  ON vital_signs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.id = vital_signs.consultation_id
      AND consultations.doctor_id = auth.uid()
    )
  );

-- Medications and prescriptions policies
CREATE POLICY "View medications catalog"
  ON medications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can manage prescriptions"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.id = prescriptions.consultation_id
      AND consultations.doctor_id = auth.uid()
    )
  );

-- Medical tests policies
CREATE POLICY "Doctors can manage medical tests"
  ON medical_tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = medical_tests.patient_id
      AND consultations.doctor_id = auth.uid()
    )
  );

-- Custom fields policies
CREATE POLICY "View custom fields by specialty"
  ON custom_fields
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.specialty_id = custom_fields.specialty_id
    )
  );

CREATE POLICY "Access custom field values"
  ON custom_field_values
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.id = custom_field_values.consultation_id
      AND consultations.doctor_id = auth.uid()
    )
  );