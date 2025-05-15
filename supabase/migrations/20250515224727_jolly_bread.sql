/*
  # Update patient policies
  
  1. Changes
    - Drop existing policies for patients table
    - Create new granular policies for INSERT, UPDATE, and DELETE operations
  
  2. Security
    - Ensure only administrators and doctors can manage patients
    - Separate policies for different operations for better control
*/

-- Drop all existing policies for patients table
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;
DROP POLICY IF EXISTS "Administrators and doctors can create patients" ON patients;
DROP POLICY IF EXISTS "Administrators and doctors can update patients" ON patients;
DROP POLICY IF EXISTS "Administrators and doctors can delete patients" ON patients;

-- Create separate policies for each operation
CREATE POLICY "Administrators and doctors can create patients"
ON patients
FOR INSERT
TO authenticated
WITH CHECK (is_admin() OR is_doctor());

CREATE POLICY "Administrators and doctors can update patients"
ON patients
FOR UPDATE
TO authenticated
USING (is_admin() OR is_doctor())
WITH CHECK (is_admin() OR is_doctor());

CREATE POLICY "Administrators and doctors can delete patients"
ON patients
FOR DELETE
TO authenticated
USING (is_admin() OR is_doctor());