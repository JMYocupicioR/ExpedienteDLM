-- Fix storage policies for logos bucket
-- This migration handles RLS policies that couldn't be set in the previous migration

-- First ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- The following policies should be created via Supabase dashboard or by a superuser:
-- We'll document them here for reference

/*
REQUIRED STORAGE POLICIES (to be applied via dashboard):

1. "Users can upload their own logos" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (
     bucket_id = 'logos' AND 
     auth.uid()::text = split_part(name, '-', 1)
   );

2. "Anyone can view logos" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'logos');

3. "Users can update their own logos" ON storage.objects
   FOR UPDATE TO authenticated
   USING (
     bucket_id = 'logos' AND 
     auth.uid()::text = split_part(name, '-', 1)
   );

4. "Users can delete their own logos" ON storage.objects
   FOR DELETE TO authenticated
   USING (
     bucket_id = 'logos' AND 
     auth.uid()::text = split_part(name, '-', 1)
   );
*/

-- Log migration completion
DO $$
BEGIN
  RAISE LOG 'MIGRATION APPLIED: Storage policies documentation - 20250626051200_fix_storage_policies.sql';
  RAISE NOTICE 'Please apply storage policies manually via Supabase dashboard';
END $$;