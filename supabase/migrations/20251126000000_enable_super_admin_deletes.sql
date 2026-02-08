-- Enable DELETE for super_admin on clinics table
-- This allows super admins to delete entire clinics.
-- Because of ON DELETE CASCADE, this will also delete associated:
-- - clinic_user_relationships
-- - patients
-- - consultations
-- - etc.

DROP POLICY IF EXISTS "clinics_delete_super_admin" ON public.clinics;

CREATE POLICY "clinics_delete_super_admin"
  ON public.clinics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Enable DELETE for super_admin on clinic_user_relationships
-- This allows removing specific users from a clinic (stripping their access/roles).

DROP POLICY IF EXISTS "clinic_relationships_delete_super_admin" ON public.clinic_user_relationships;

CREATE POLICY "clinic_relationships_delete_super_admin"
  ON public.clinic_user_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
