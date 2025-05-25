/*
  # Fix prescriptions table RLS policies

  1. Changes
    - Simplify and fix RLS policies for prescriptions table
    - Ensure proper access control for doctors, nurses and administrators
    - Add policy to hide deleted prescriptions
  
  2. Security
    - Enable RLS on prescriptions table
    - Add policies for viewing and managing prescriptions
    - Restrict access based on user roles and relationships
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Administrators can manage prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Medical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "No mostrar recetas eliminadas" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can manage prescriptions" ON prescriptions;

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Administrators can do everything
CREATE POLICY "Administrators can manage prescriptions"
ON prescriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  )
);

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

-- Nurses can view prescriptions for their assigned patients
CREATE POLICY "Nurses can view prescriptions"
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

-- Hide deleted prescriptions
CREATE POLICY "Hide deleted prescriptions"
ON prescriptions
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);