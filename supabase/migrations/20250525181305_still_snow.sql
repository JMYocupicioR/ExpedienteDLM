-- Add SELECT policy for prescriptions
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Medical staff can view prescriptions" ON prescriptions;

-- Create new SELECT policy
CREATE POLICY "Medical staff can view prescriptions"
  ON prescriptions
  FOR SELECT
  TO authenticated
  USING (
    has_patient_access(patient_id)
  );