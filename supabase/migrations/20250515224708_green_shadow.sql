/*
  # Update patient policies
  
  1. Changes
    - Remove existing policy
    - Add separate policies for INSERT, UPDATE, and DELETE operations
    - Fix policy syntax for INSERT operation
  
  2. Security
    - Maintain access control for administrators and doctors
    - Properly separate USING and WITH CHECK clauses
*/

-- Drop existing policy
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

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