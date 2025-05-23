/*
  # Update patients table RLS policies

  1. Changes
    - Split the ALL policy into separate policies for each operation
    - Add explicit policies for INSERT, UPDATE, and DELETE operations
    - Keep existing SELECT policy unchanged
    
  2. Security
    - Administrators and doctors can perform all operations
    - Nurses can only view patients
    - All policies are permissive
*/

-- Drop existing ALL policy
DROP POLICY IF EXISTS "El personal médico puede gestionar pacientes" ON patients;

-- Create separate policies for each operation
CREATE POLICY "Administrators and doctors can create patients"
ON patients
FOR INSERT
TO authenticated
USING (is_admin() OR is_doctor())
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