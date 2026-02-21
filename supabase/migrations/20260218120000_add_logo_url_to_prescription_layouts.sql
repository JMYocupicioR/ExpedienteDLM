-- Add logo_url to prescription_layouts for unified logo persistence
-- Enables logo to be stored per layout and synced with profile/clinic-assets
--
-- IMPORTANT: If you get "relation prescription_layouts does not exist", run first:
--   supabase/migrations/20260214000000_prescription_module_tables.sql

DO $$
BEGIN
  -- Only alter if the table exists (created by 20260214000000_prescription_module_tables.sql)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'prescription_layouts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prescription_layouts' AND column_name = 'logo_url'
    ) THEN
      ALTER TABLE prescription_layouts ADD COLUMN logo_url TEXT;
    END IF;
  ELSE
    RAISE NOTICE 'La tabla prescription_layouts no existe. Ejecute primero 20260214000000_prescription_module_tables.sql';
  END IF;
END $$;
