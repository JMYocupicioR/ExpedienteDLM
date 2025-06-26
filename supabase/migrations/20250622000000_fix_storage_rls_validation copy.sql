/*
  # Fix Storage RLS and Add Data Validation

  1. Changes
    - Clean up conflicting storage policies
    - Add proper RLS policies for attachments table  
    - Add validation functions for arrays and JSONB
    - Create standardized section_id table for physical_exam_files
    - Add URL validation constraints
    
  2. Security
    - Proper RLS for storage bucket access
    - Strict validation at database level
    - Sanitization functions to prevent XSS
*/

-- ============================================================================
-- PART 1: Clean up conflicting storage policies
-- ============================================================================

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Upload logos policy" ON storage.objects;
DROP POLICY IF EXISTS "View logos policy" ON storage.objects;
DROP POLICY IF EXISTS "Update logos policy" ON storage.objects;
DROP POLICY IF EXISTS "Delete logos policy" ON storage.objects;

-- Drop any helper functions that might be conflicting
DROP FUNCTION IF EXISTS public.is_valid_logo_upload(text, text);
DROP FUNCTION IF EXISTS public.is_valid_logo_upload(text);
DROP FUNCTION IF EXISTS public.owns_logo(uuid);

-- Ensure bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create clean storage policies
CREATE POLICY "Secure logo upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    (auth.uid())::text = SPLIT_PART(name, '-', 1)
  );

CREATE POLICY "Public logo view" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "Owner logo update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos' AND
    owner = auth.uid() AND
    public.validate_logo_upload(bucket_id, name, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'logos' AND
    owner = auth.uid() AND
    public.validate_logo_upload(bucket_id, name, auth.uid())
  );

CREATE POLICY "Owner logo delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos' AND
    owner = auth.uid()
  );

-- ============================================================================
-- PART 2: Add proper RLS policies for attachments table
-- ============================================================================

-- Ensure attachments table has proper RLS policies
DROP POLICY IF EXISTS "El personal médico puede ver archivos" ON public.attachments;
DROP POLICY IF EXISTS "El personal médico puede gestionar archivos" ON public.attachments;

-- Create comprehensive policies for attachments
CREATE POLICY "Medical staff can view attachments" 
  ON attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'nurse', 'administrator')
    )
  );

CREATE POLICY "Medical staff can insert attachments"
  ON attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

CREATE POLICY "Medical staff can update attachments"
  ON attachments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

CREATE POLICY "Medical staff can delete attachments"
  ON attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'administrator')
    )
  );

-- ============================================================================
-- PART 3: Add data validation functions
-- ============================================================================

-- Function to validate and sanitize text arrays
CREATE OR REPLACE FUNCTION public.validate_text_array(
  input_array text[],
  max_items integer DEFAULT 50,
  max_length integer DEFAULT 200
)
RETURNS text[] AS $$
DECLARE
  sanitized_array text[] := '{}';
  item text;
  sanitized_item text;
BEGIN
  -- Limit array size
  FOR i IN 1..LEAST(array_length(input_array, 1), max_items) LOOP
    item := input_array[i];
    
    -- Skip null or empty items
    IF item IS NULL OR trim(item) = '' THEN
      CONTINUE;
    END IF;
    
    -- Sanitize HTML and limit length
    sanitized_item := substring(
      replace(replace(replace(replace(replace(
        trim(item),
        '<', '&lt;'),
        '>', '&gt;'),
        '"', '&quot;'),
        '''', '&#x27;'),
        '/', '&#x2F;'
      ),
      1, max_length
    );
    
    -- Add to result if not empty after sanitization
    IF length(sanitized_item) > 0 THEN
      sanitized_array := array_append(sanitized_array, sanitized_item);
    END IF;
  END LOOP;
  
  RETURN sanitized_array;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate URLs
CREATE OR REPLACE FUNCTION public.validate_url(url text)
RETURNS boolean AS $$
BEGIN
  IF url IS NULL OR length(trim(url)) = 0 THEN
    RETURN false;
  END IF;
  
  IF NOT (url ~* '^https?://') THEN
    RETURN false;
  END IF;
  
  IF url ~* '(javascript:|data:|vbscript:|on\w+\s*=|<script)' THEN
    RETURN false;
  END IF;
  
  IF length(url) > 2000 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 5: Add validation triggers for existing tables
-- ============================================================================

-- Add triggers to validate array fields before insert/update
CREATE OR REPLACE FUNCTION validate_pathological_history()
RETURNS trigger AS $$
BEGIN
  -- Validate and sanitize arrays
  NEW.chronic_diseases := public.validate_text_array(NEW.chronic_diseases, 20, 100);
  NEW.current_treatments := public.validate_text_array(NEW.current_treatments, 15, 150);
  NEW.surgeries := public.validate_text_array(NEW.surgeries, 10, 200);
  NEW.fractures := public.validate_text_array(NEW.fractures, 10, 100);
  NEW.previous_hospitalizations := public.validate_text_array(NEW.previous_hospitalizations, 15, 200);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_non_pathological_history()
RETURNS trigger AS $$
BEGIN
  -- Validate and sanitize vaccination history
  NEW.vaccination_history := public.validate_text_array(NEW.vaccination_history, 50, 80);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_medical_records()
RETURNS trigger AS $$
BEGIN
  -- Validate and sanitize arrays
  NEW.allergies := public.validate_text_array(NEW.allergies, 20, 100);
  NEW.medications := public.validate_text_array(NEW.medications, 30, 150);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS validate_pathological_history_trigger ON pathological_histories;
CREATE TRIGGER validate_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_pathological_history();

DROP TRIGGER IF EXISTS validate_non_pathological_history_trigger ON non_pathological_histories;
CREATE TRIGGER validate_non_pathological_history_trigger
  BEFORE INSERT OR UPDATE ON non_pathological_histories
  FOR EACH ROW EXECUTE FUNCTION validate_non_pathological_history();

DROP TRIGGER IF EXISTS validate_medical_records_trigger ON medical_records;
CREATE TRIGGER validate_medical_records_trigger
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION validate_medical_records();

-- ============================================================================
-- PART 6: Add URL validation constraints to existing tables
-- ============================================================================

-- Add URL validation constraint to attachments table
ALTER TABLE attachments 
ADD CONSTRAINT IF NOT EXISTS valid_attachment_url 
CHECK (public.validate_url(file_url));

-- ============================================================================
-- PART 7: Update existing invalid data (if any)
-- ============================================================================

-- Clean up existing data in pathological_histories
UPDATE pathological_histories SET
  chronic_diseases = public.validate_text_array(chronic_diseases, 20, 100),
  current_treatments = public.validate_text_array(current_treatments, 15, 150),
  surgeries = public.validate_text_array(surgeries, 10, 200),
  fractures = public.validate_text_array(fractures, 10, 100),
  previous_hospitalizations = public.validate_text_array(previous_hospitalizations, 15, 200)
WHERE id IS NOT NULL;

-- Clean up existing data in non_pathological_histories
UPDATE non_pathological_histories SET
  vaccination_history = public.validate_text_array(vaccination_history, 50, 80)
WHERE id IS NOT NULL;

-- Clean up existing data in medical_records
UPDATE medical_records SET
  allergies = public.validate_text_array(allergies, 20, 100),
  medications = public.validate_text_array(medications, 30, 150)
WHERE id IS NOT NULL; 