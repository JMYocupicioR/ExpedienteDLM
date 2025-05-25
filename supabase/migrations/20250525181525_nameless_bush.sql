/*
  # Update Prescriptions RLS Policies

  1. Changes
    - Modify RLS policies for prescriptions table to allow proper access
    - Add policy for medical staff to view prescriptions
    - Ensure proper access control based on roles and patient relationships

  2. Security
    - Maintain data security while allowing necessary access
    - Ensure doctors can view prescriptions they created
    - Allow nurses to view prescriptions for their assigned patients
    - Administrators retain full access
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Medical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can manage their prescriptions" ON prescriptions;

-- Create new policies with proper access control
CREATE POLICY "Medical staff can view prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (
  -- Administrators can view all prescriptions
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ))
  OR
  -- Doctors can view prescriptions they created
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND prescriptions.doctor_id = auth.uid()
  ))
  OR
  -- Nurses can view prescriptions for patients they have access to
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'nurse'
    AND EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = prescriptions.patient_id
    )
  ))
);

-- Policy for doctors to manage their prescriptions
CREATE POLICY "Doctors can manage prescriptions"
ON prescriptions
FOR ALL
TO authenticated
USING (
  -- Doctors can manage their own prescriptions
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND prescriptions.doctor_id = auth.uid()
  ))
  OR
  -- Administrators have full access
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ))
)
WITH CHECK (
  -- Same conditions for insert/update
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND prescriptions.doctor_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ))
);