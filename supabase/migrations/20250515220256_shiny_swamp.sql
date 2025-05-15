/*
  # Update patients table RLS policies
  
  1. Changes
    - Drop existing ALL policy
    - Create separate policies for INSERT, UPDATE, and DELETE operations
    - Fix INSERT policy syntax by removing USING clause
    
  2. Security
    - Maintain existing security model where only administrators and doctors can manage patients
    - Keep existing view permissions intact
*/

-- Drop existing ALL policy
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