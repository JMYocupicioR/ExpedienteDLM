@@ .. @@
 -- Mensaje de Log para confirmar la ejecución de la migración
 DO $$
 BEGIN
-  RAISE LOG 'MIGRATION APPLIED: 20250625000000_fix_template_and_sections_schema.sql';
+  RAISE LOG 'MIGRATION APPLIED: 20250626051055_velvet_king.sql - Template schema restructure';
 END $$;
+
+-- Add any missing columns to physical_exam_templates if they don't exist
+DO $$ 
+BEGIN
+  -- Add template_type if it doesn't exist
+  IF NOT EXISTS (
+    SELECT 1 FROM information_schema.columns 
+    WHERE table_name = 'physical_exam_templates' 
+    AND column_name = 'template_type'
+  ) THEN
+    ALTER TABLE physical_exam_templates 
+    ADD COLUMN template_type TEXT DEFAULT 'general';
+  END IF;
+
+  -- Add is_active if it doesn't exist
+  IF NOT EXISTS (
+    SELECT 1 FROM information_schema.columns 
+    WHERE table_name = 'physical_exam_templates' 
+    AND column_name = 'is_active'
+  ) THEN
+    ALTER TABLE physical_exam_templates 
+    ADD COLUMN is_active BOOLEAN DEFAULT true;
+  END IF;
+
+  -- Add version if it doesn't exist
+  IF NOT EXISTS (
+    SELECT 1 FROM information_schema.columns 
+    WHERE table_name = 'physical_exam_templates' 
+    AND column_name = 'version'
+  ) THEN
+    ALTER TABLE physical_exam_templates 
+    ADD COLUMN version INTEGER DEFAULT 1;
+  END IF;
+
+  -- Add parent_template_id if it doesn't exist
+  IF NOT EXISTS (
+    SELECT 1 FROM information_schema.columns 
+    WHERE table_name = 'physical_exam_templates' 
+    AND column_name = 'parent_template_id'
+  ) THEN
+    ALTER TABLE physical_exam_templates 
+    ADD COLUMN parent_template_id UUID REFERENCES physical_exam_templates(id);
+  END IF;
+END $$;