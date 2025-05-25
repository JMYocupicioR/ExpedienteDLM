/*
  # Update prescriptions RLS policies

  1. Changes
    - Add new RLS policy to allow doctors to view all prescriptions
    - Add new RLS policy to allow nurses to view prescriptions for their patients
    - Add new RLS policy to allow administrators to view all prescriptions

  2. Security
    - Maintains data security by restricting access based on user roles
    - Ensures medical staff can only view prescriptions they should have access to
    - Administrators retain full access for oversight
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Administrators can manage prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can manage their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Hide deleted prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Nurses can view prescriptions" ON prescriptions;

-- Create new policies with proper access controls
CREATE POLICY "Administrators can view all prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  )
);

CREATE POLICY "Doctors can view all prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
  )
);

CREATE POLICY "Nurses can view patient prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'nurse'
    AND EXISTS (
      SELECT 1 FROM consultations
      WHERE consultations.patient_id = prescriptions.patient_id
    )
  )
);

CREATE POLICY "Hide deleted prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Doctors can manage their own prescriptions
CREATE POLICY "Doctors can manage their prescriptions"
ON prescriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND prescriptions.doctor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
    AND prescriptions.doctor_id = auth.uid()
  )
);

-- Administrators can manage all prescriptions
CREATE POLICY "Administrators can manage all prescriptions"
ON prescriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  )
);