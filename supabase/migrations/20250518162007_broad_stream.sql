/*
  # Update Security Policies

  1. New Policies
    - Enable RLS and add policies for audit_logs
    - Enable RLS and add policies for roles
    - Enable RLS and add policies for specialties
    - Add coordination policies for medical staff
    - Add nurse note creation policies
  
  2. Updates
    - Add soft delete functionality
    - Add temporal restrictions for medical records
    - Enhance existing policies
*/

-- Enable RLS for tables that need it
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;

-- Audit Logs Policies
CREATE POLICY "Administrators can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ));

-- Roles Policies
CREATE POLICY "Administrators can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ));

CREATE POLICY "Medical staff can view roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse')
  ));

-- Specialties Policies
CREATE POLICY "Administrators can manage specialties"
  ON specialties
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrator'
  ));

CREATE POLICY "Medical staff can view specialties"
  ON specialties
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'doctor' OR profiles.role = 'nurse')
  ));

-- Add coordination policy for profiles
CREATE POLICY "Medical staff can view other medical staff profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'doctor' OR p.role = 'nurse')
  ));

-- Add nurse note creation policy
CREATE POLICY "Nurses can create basic consultation notes"
  ON consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'nurse'
    )
    AND (current_condition IS NOT NULL)
    AND (vital_signs IS NOT NULL)
  );

-- Add temporal restriction for medical records updates
CREATE POLICY "Time-restricted updates for medical records"
  ON medical_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
    )
    AND (
      EXTRACT(EPOCH FROM (now() - created_at)) <= 86400  -- 24 hours
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
      )
    )
  );

-- Add soft delete functionality
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pathological_histories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE non_pathological_histories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE hereditary_backgrounds ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update existing policies to handle soft deletes
CREATE POLICY "Soft delete for medical records"
  ON medical_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
    )
  )
  WITH CHECK (
    deleted_at IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'doctor' OR profiles.role = 'administrator')
      )
    )
  );

-- Update select policies to exclude soft deleted records
CREATE POLICY "View non-deleted medical records"
  ON medical_records
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'doctor' OR profiles.role = 'nurse' OR profiles.role = 'administrator')
      )
    )
  );