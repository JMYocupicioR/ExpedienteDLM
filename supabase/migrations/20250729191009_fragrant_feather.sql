/*
  # Fix Infinite Recursion in RLS Policies
  
  This migration resolves the infinite recursion error in RLS policies by:
  1. Creating a SECURITY DEFINER function to safely get user roles
  2. Updating all RLS policies to use this function instead of JWT metadata
  
  The recursion occurs because policies try to get roles from JWT metadata,
  but the actual roles are stored in the profiles table, causing a loop.
*/

-- =============================================
-- CREATE SECURITY DEFINER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.get_app_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Return null if no user_id provided
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get role directly from profiles table, bypassing RLS
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    -- Return null if any error occurs
    RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_app_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_user_role(UUID) TO service_role;

-- =============================================
-- UPDATE PROFILES TABLE RLS POLICIES
-- =============================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id 
  OR 
  public.get_app_user_role() IN ('administrator', 'doctor')
);

CREATE POLICY "profiles_insert_policy" 
ON profiles FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  auth.uid() = id 
  OR 
  auth.role() = 'service_role'
);

CREATE POLICY "profiles_update_policy" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" 
ON profiles FOR DELETE 
TO authenticated 
USING (public.get_app_user_role() = 'administrator');

-- =============================================
-- UPDATE PATIENTS TABLE RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;

CREATE POLICY "patients_select_policy"
ON patients FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  public.get_app_user_role() IN ('administrator', 'doctor', 'nurse')
);

CREATE POLICY "patients_insert_policy"
ON patients FOR INSERT
TO authenticated
WITH CHECK (
  public.get_app_user_role() IN ('administrator', 'doctor')
);

CREATE POLICY "patients_update_policy"
ON patients FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL AND
  public.get_app_user_role() IN ('administrator', 'doctor')
)
WITH CHECK (
  public.get_app_user_role() IN ('administrator', 'doctor')
);

CREATE POLICY "patients_delete_policy"
ON patients FOR DELETE
TO authenticated
USING (public.get_app_user_role() = 'administrator');

-- =============================================
-- UPDATE MEDICAL RECORDS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "medical_records_select_policy" ON medical_records;
DROP POLICY IF EXISTS "medical_records_modify_policy" ON medical_records;

CREATE POLICY "medical_records_select_policy"
ON medical_records FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  public.get_app_user_role() IN ('administrator', 'doctor', 'nurse')
);

CREATE POLICY "medical_records_modify_policy"
ON medical_records FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  public.get_app_user_role() IN ('administrator', 'doctor')
)
WITH CHECK (
  public.get_app_user_role() IN ('administrator', 'doctor')
);

-- =============================================
-- UPDATE HEREDITARY BACKGROUNDS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "hereditary_backgrounds_select_policy" ON hereditary_backgrounds;
DROP POLICY IF EXISTS "hereditary_backgrounds_modify_policy" ON hereditary_backgrounds;

CREATE POLICY "hereditary_backgrounds_select_policy"
ON hereditary_backgrounds FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "hereditary_backgrounds_modify_policy"
ON hereditary_backgrounds FOR ALL
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor'))
WITH CHECK (public.get_app_user_role() IN ('administrator', 'doctor'));

-- =============================================
-- UPDATE PATHOLOGICAL HISTORIES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "pathological_histories_select_policy" ON pathological_histories;
DROP POLICY IF EXISTS "pathological_histories_modify_policy" ON pathological_histories;

CREATE POLICY "pathological_histories_select_policy"
ON pathological_histories FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "pathological_histories_modify_policy"
ON pathological_histories FOR ALL
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor'))
WITH CHECK (public.get_app_user_role() IN ('administrator', 'doctor'));

-- =============================================
-- UPDATE NON-PATHOLOGICAL HISTORIES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "non_pathological_histories_select_policy" ON non_pathological_histories;
DROP POLICY IF EXISTS "non_pathological_histories_modify_policy" ON non_pathological_histories;

CREATE POLICY "non_pathological_histories_select_policy"
ON non_pathological_histories FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "non_pathological_histories_modify_policy"
ON non_pathological_histories FOR ALL
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor'))
WITH CHECK (public.get_app_user_role() IN ('administrator', 'doctor'));

-- =============================================
-- UPDATE CONSULTATIONS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "consultations_select_policy" ON consultations;
DROP POLICY IF EXISTS "consultations_modify_policy" ON consultations;

CREATE POLICY "consultations_select_policy"
ON consultations FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR public.get_app_user_role() IN ('administrator', 'nurse'))
);

CREATE POLICY "consultations_modify_policy"
ON consultations FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator')
)
WITH CHECK (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
);

-- =============================================
-- UPDATE PHYSICAL EXAM TEMPLATES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "templates_select_policy" ON physical_exam_templates;
DROP POLICY IF EXISTS "templates_modify_policy" ON physical_exam_templates;

CREATE POLICY "templates_select_policy"
ON physical_exam_templates FOR SELECT
TO authenticated
USING (
  is_active = TRUE AND
  (doctor_id = auth.uid() OR is_public = TRUE OR public.get_app_user_role() = 'administrator')
);

CREATE POLICY "templates_modify_policy"
ON physical_exam_templates FOR ALL
TO authenticated
USING (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  doctor_id = auth.uid() AND
  validate_jsonb_schema(definition, 'physical_exam_template')
);

-- =============================================
-- UPDATE TEMPLATE AUDIT RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "template_audit_select_policy" ON template_audit;

CREATE POLICY "template_audit_select_policy"
ON template_audit FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator'
);

-- =============================================
-- UPDATE TEMPLATE VERSIONS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "template_versions_select_policy" ON template_versions;

CREATE POLICY "template_versions_select_policy"
ON template_versions FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR public.get_app_user_role() = 'administrator'
);

-- =============================================
-- UPDATE MEDICATIONS CATALOG RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "medications_catalog_select_policy" ON medications_catalog;
DROP POLICY IF EXISTS "medications_catalog_modify_policy" ON medications_catalog;

CREATE POLICY "medications_catalog_select_policy"
ON medications_catalog FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "medications_catalog_modify_policy"
ON medications_catalog FOR ALL
TO authenticated
USING (public.get_app_user_role() = 'administrator')
WITH CHECK (public.get_app_user_role() = 'administrator');

-- =============================================
-- UPDATE DRUG INTERACTIONS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "drug_interactions_select_policy" ON drug_interactions;
DROP POLICY IF EXISTS "drug_interactions_modify_policy" ON drug_interactions;

CREATE POLICY "drug_interactions_select_policy"
ON drug_interactions FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "drug_interactions_modify_policy"
ON drug_interactions FOR ALL
TO authenticated
USING (public.get_app_user_role() = 'administrator')
WITH CHECK (public.get_app_user_role() = 'administrator');

-- =============================================
-- UPDATE PRESCRIPTIONS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "prescriptions_select_policy" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_modify_policy" ON prescriptions;

CREATE POLICY "prescriptions_select_policy"
ON prescriptions FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR public.get_app_user_role() IN ('administrator', 'nurse'))
);

CREATE POLICY "prescriptions_modify_policy"
ON prescriptions FOR ALL
TO authenticated
USING (
  deleted_at IS NULL AND
  (doctor_id = auth.uid() OR public.get_app_user_role() = 'administrator')
)
WITH CHECK (
  doctor_id = auth.uid() AND
  validate_jsonb_schema(medications, 'prescription')
);

-- =============================================
-- UPDATE PHYSICAL EXAM FILES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "physical_exam_files_select_policy" ON physical_exam_files;
DROP POLICY IF EXISTS "physical_exam_files_modify_policy" ON physical_exam_files;

CREATE POLICY "physical_exam_files_select_policy"
ON physical_exam_files FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "physical_exam_files_modify_policy"
ON physical_exam_files FOR ALL
TO authenticated
USING (
  uploaded_by = auth.uid() OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  uploaded_by = auth.uid() AND public.get_app_user_role() IN ('administrator', 'doctor')
);

-- =============================================
-- UPDATE ATTACHMENTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "attachments_select_policy" ON attachments;
DROP POLICY IF EXISTS "attachments_modify_policy" ON attachments;

CREATE POLICY "attachments_select_policy"
ON attachments FOR SELECT
TO authenticated
USING (public.get_app_user_role() IN ('administrator', 'doctor', 'nurse'));

CREATE POLICY "attachments_modify_policy"
ON attachments FOR ALL
TO authenticated
USING (
  uploaded_by = auth.uid() OR public.get_app_user_role() = 'administrator'
)
WITH CHECK (
  uploaded_by = auth.uid() AND public.get_app_user_role() IN ('administrator', 'doctor')
);

-- =============================================
-- LOG MIGRATION COMPLETION
-- =============================================

DO $$
BEGIN
  RAISE LOG '✅ INFINITE RECURSION IN RLS POLICIES FIXED';
  RAISE LOG '🔧 Created get_app_user_role() SECURITY DEFINER function';
  RAISE LOG '🔄 Updated all RLS policies to use the new function';
  RAISE LOG '🚀 Dashboard and patient queries should now work without recursion';
END $$;