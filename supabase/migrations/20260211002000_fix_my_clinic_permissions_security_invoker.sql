-- Ensure my_clinic_permissions is explicitly SECURITY INVOKER.
-- This avoids linter false positives/ambiguity and guarantees caller-context RLS evaluation.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinic_user_relationships'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clinics'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS public.my_clinic_permissions';

    EXECUTE $view$
      CREATE VIEW public.my_clinic_permissions
      WITH (security_invoker = true) AS
      SELECT
        cur.clinic_id,
        c.name AS clinic_name,
        cur.role_in_clinic AS role,
        cur.status,
        cur.is_active
      FROM public.clinic_user_relationships cur
      JOIN public.clinics c ON c.id = cur.clinic_id
      WHERE cur.user_id = auth.uid()
    $view$;

    EXECUTE $comment$
      COMMENT ON VIEW public.my_clinic_permissions IS
      'Vista de permisos de clinica del usuario actual (Security Invoker explicit)'
    $comment$;
  END IF;
END $$;
