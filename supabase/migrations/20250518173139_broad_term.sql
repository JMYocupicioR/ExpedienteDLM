/*
  # Add RLS policies for patients table

  1. Security Changes
    - Enable RLS on patients table
    - Add policies for:
      - Administrators: full access to all patients
      - Doctors: full access to all patients
      - Nurses: read-only access to all patients
*/

-- Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy for administrators to manage all patients
CREATE POLICY "Administrators can manage patients"
ON patients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  )
);

-- Policy for doctors to manage all patients
CREATE POLICY "Doctors can manage patients"
ON patients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'doctor'
  )
);

-- Policy for nurses to view all patients
CREATE POLICY "Nurses can view patients"
ON patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'nurse'
  )
);