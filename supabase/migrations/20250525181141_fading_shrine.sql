/*
  # Fix Prescriptions RLS Policies

  1. Changes
    - Add RLS policies for prescriptions table
    - Allow doctors to manage their prescriptions
    - Allow medical staff to view prescriptions for their patients
    - Add soft delete handling

  2. Security
    - Enable RLS on prescriptions table
    - Add policies for different user roles
    - Ensure proper access control
*/

-- Enable RLS on prescriptions if not already enabled
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Doctors can manage their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Medical staff can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "No mostrar recetas eliminadas" ON prescriptions;

-- Create new policies
CREATE POLICY "Doctors can manage their prescriptions"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (
    (is_doctor() AND doctor_id = auth.uid()) OR is_admin()
  )
  WITH CHECK (
    (is_doctor() AND doctor_id = auth.uid()) OR is_admin()
  );

CREATE POLICY "Medical staff can view prescriptions"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (
    has_patient_access(patient_id)
  );

CREATE POLICY "No mostrar recetas eliminadas"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Add helper function to check if user is doctor
CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;