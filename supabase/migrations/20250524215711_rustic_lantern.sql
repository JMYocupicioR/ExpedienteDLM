/*
  # Add prescription templates

  1. New Tables
    - prescription_templates for storing reusable prescription templates
  
  2. Security
    - RLS policies for template access
    - Audit triggers
    - Soft delete functionality
  
  3. Performance
    - Indexes for common queries
*/

-- Create prescription templates table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'prescription_templates'
  ) THEN
    CREATE TABLE prescription_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL REFERENCES profiles(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      medications JSONB NOT NULL,
      diagnosis TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_prescription_templates_doctor'
  ) THEN
    CREATE INDEX idx_prescription_templates_doctor ON prescription_templates(doctor_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_prescription_templates_category'
  ) THEN
    CREATE INDEX idx_prescription_templates_category ON prescription_templates(category);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Doctors can manage their templates'
    AND tablename = 'prescription_templates'
  ) THEN
    CREATE POLICY "Doctors can manage their templates"
      ON prescription_templates
      TO authenticated
      USING ((is_doctor() AND doctor_id = auth.uid()) OR is_admin())
      WITH CHECK ((is_doctor() AND doctor_id = auth.uid()) OR is_admin());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Medical staff can view templates'
    AND tablename = 'prescription_templates'
  ) THEN
    CREATE POLICY "Medical staff can view templates"
      ON prescription_templates
      FOR SELECT
      TO authenticated
      USING (is_doctor() OR is_admin());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'No mostrar plantillas eliminadas'
    AND tablename = 'prescription_templates'
  ) THEN
    CREATE POLICY "No mostrar plantillas eliminadas"
      ON prescription_templates
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- Add triggers if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_prescription_templates'
  ) THEN
    CREATE TRIGGER audit_prescription_templates
      AFTER INSERT OR UPDATE OR DELETE ON prescription_templates
      FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_timestamp_prescription_templates'
  ) THEN
    CREATE TRIGGER set_timestamp_prescription_templates
      BEFORE UPDATE ON prescription_templates
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'soft_delete_prescription_templates'
  ) THEN
    CREATE TRIGGER soft_delete_prescription_templates
      BEFORE UPDATE ON prescription_templates
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION soft_delete();
  END IF;
END $$;