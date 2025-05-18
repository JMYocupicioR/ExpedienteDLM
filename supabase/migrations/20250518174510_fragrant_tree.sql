/*
  # Add RLS policy for audit logs

  1. Changes
    - Add RLS policy to allow authenticated users to insert into audit_logs table
    - This is necessary because audit_logs are created automatically by triggers
    - Only administrators can view audit logs (existing policy)

  2. Security
    - Maintains existing read policy for administrators
    - Adds insert policy for all authenticated users
    - Ensures audit trail integrity while allowing normal operations
*/

-- Add policy to allow authenticated users to insert into audit_logs
CREATE POLICY "Allow authenticated users to insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);