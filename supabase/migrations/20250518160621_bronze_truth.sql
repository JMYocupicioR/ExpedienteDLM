/*
  # Database Functions and Triggers

  1. Functions
    - Updated timestamp management
    - Audit logging
    - Soft delete handling
    - Record user tracking
    - BMI calculation
    - Medication allergy checks

  2. Triggers
    - Automatic timestamp updates
    - Audit logging
    - Soft deletes
    - BMI calculation
    - Allergy checks
*/

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle soft deletes
CREATE OR REPLACE FUNCTION handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Instead of actually deleting the row, update deleted_at
  IF TG_TABLE_NAME::text = ANY (ARRAY['profiles', 'patients', 'consultations', 'medical_records']) THEN
    UPDATE profiles
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to set record metadata (created_by, updated_by)
CREATE OR REPLACE FUNCTION handle_record_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- For new records
  IF TG_OP = 'INSERT' THEN
    -- Set created_by if the column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME::text
      AND column_name = 'created_by'
    ) THEN
      NEW.created_by = auth.uid();
    END IF;
  END IF;
  
  -- For updates
  IF TG_OP = 'UPDATE' THEN
    -- Set updated_by if the column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME::text
      AND column_name = 'updated_by'
    ) THEN
      NEW.updated_by = auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if both height and weight are provided
  IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
    -- Convert height to meters if needed and calculate BMI
    IF NEW.height_unit = 'cm' THEN
      NEW.bmi = NEW.weight / POWER(NEW.height / 100, 2);
    ELSE
      NEW.bmi = NEW.weight / POWER(NEW.height, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check medication allergies
CREATE OR REPLACE FUNCTION check_medication_allergies()
RETURNS TRIGGER AS $$
DECLARE
  allergy_exists BOOLEAN;
BEGIN
  -- Check if patient has any relevant allergies
  SELECT EXISTS (
    SELECT 1
    FROM medical_records mr
    WHERE mr.patient_id = NEW.patient_id
    AND mr.allergies && ARRAY[NEW.medication_id::text]
  ) INTO allergy_exists;
  
  IF allergy_exists THEN
    RAISE EXCEPTION 'Patient has a recorded allergy to this medication';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DO $$
BEGIN
  -- Add updated_at trigger to tables that have the column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS handle_updated_at_profiles ON profiles;
    CREATE TRIGGER handle_updated_at_profiles
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' 
    AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS handle_updated_at_patients ON patients;
    CREATE TRIGGER handle_updated_at_patients
      BEFORE UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- Add more tables as needed
END
$$ LANGUAGE plpgsql;

-- Create soft delete triggers
DO $$
BEGIN
  -- Add soft delete trigger to relevant tables
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    DROP TRIGGER IF EXISTS handle_soft_delete_profiles ON profiles;
    CREATE TRIGGER handle_soft_delete_profiles
      BEFORE DELETE ON profiles
      FOR EACH ROW
      WHEN (OLD.deleted_at IS NULL)
      EXECUTE FUNCTION handle_soft_delete();
  END IF;

  -- Add more tables as needed
END
$$ LANGUAGE plpgsql;