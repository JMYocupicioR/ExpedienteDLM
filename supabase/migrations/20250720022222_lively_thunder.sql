@@ .. @@
-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

--- Enable RLS on the logos bucket
-ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-
--- Allow authenticated users to upload logos
-CREATE POLICY "Users can upload their own logos" ON storage.objects
+-- Drop existing policies if they exist to avoid conflicts
+DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
+DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
+DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
+DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
+
+-- Allow authenticated users to upload logos
+CREATE POLICY "Users can upload their own logos" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (
     bucket_id = 'logos' AND 
-    (auth.uid())::text = SPLIT_PART(name, '-', 1)
+    (auth.uid())::text = split_part(name, '-', 1)
   );

 -- Allow public access to read logos
 CREATE POLICY "Anyone can view logos" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'logos');

 -- Allow users to update their own logos
 CREATE POLICY "Users can update their own logos" ON storage.objects
   FOR UPDATE TO authenticated
   USING (
     bucket_id = 'logos' AND 
-    (auth.uid())::text = SPLIT_PART(name, '-', 1)
+    (auth.uid())::text = split_part(name, '-', 1)
   )
   WITH CHECK (
     bucket_id = 'logos' AND 
-    (auth.uid())::text = SPLIT_PART(name, '-', 1)
+    (auth.uid())::text = split_part(name, '-', 1)
   );

 -- Allow users to delete their own logos
 CREATE POLICY "Users can delete their own logos" ON storage.objects
   FOR DELETE TO authenticated
   USING (
     bucket_id = 'logos' AND 
-    (auth.uid())::text = SPLIT_PART(name, '-', 1)
+    (auth.uid())::text = split_part(name, '-', 1)
   );