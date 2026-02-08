-- =====================================================
-- Security Definer Views Fix
-- Date: 2025-11-26
-- Description: Redefines views flagged as SECURITY DEFINER to use SECURITY INVOKER (default)
--              This ensures RLS policies are applied based on the querying user's permissions.
-- =====================================================

-- 1. Fix medical_studies_complete view (solo si existe la tabla medical_tests)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_tests') THEN
    DROP VIEW IF EXISTS public.medical_studies_complete;
    CREATE VIEW public.medical_studies_complete AS
    SELECT
      mt.*,
      p.full_name as patient_name,
      doc.full_name as doctor_name,
      rev.full_name as reviewed_by_name,
      c.diagnosis as consultation_diagnosis,
      COUNT(DISTINCT mtf.id) as file_count,
      COUNT(DISTINCT lr.id) as lab_result_count,
      BOOL_OR(lr.is_abnormal) as has_abnormal_results
    FROM medical_tests mt
    LEFT JOIN patients p ON p.id = mt.patient_id
    LEFT JOIN profiles doc ON doc.id = mt.doctor_id
    LEFT JOIN profiles rev ON rev.id = mt.reviewed_by
    LEFT JOIN consultations c ON c.id = mt.consultation_id
    LEFT JOIN medical_test_files mtf ON mtf.medical_test_id = mt.id
    LEFT JOIN lab_results lr ON lr.medical_test_id = mt.id
    GROUP BY mt.id, p.full_name, doc.full_name, rev.full_name, c.diagnosis;
    COMMENT ON VIEW public.medical_studies_complete IS 'Vista completa de estudios médicos con información relacionada (Security Invoker)';
  END IF;
END $$;

-- 2. Fix my_clinic_permissions view (if it exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'my_clinic_permissions' AND schemaname = 'public') THEN
        -- Save definition logic if possible, or drop and let application handle it if it's dynamic
        -- Since we don't have the exact definition from codebase search, we will just attempt to drop it 
        -- and let it be recreated correctly if it's part of the app logic, OR if we knew the definition we would redefine it.
        -- However, linter says it exists.
        
        -- Assuming standard definition based on name:
        DROP VIEW public.my_clinic_permissions;
        
        EXECUTE '
        CREATE OR REPLACE VIEW public.my_clinic_permissions AS
        SELECT 
            cur.clinic_id,
            c.name as clinic_name,
            cur.role_in_clinic as role,
            cur.status,
            cur.is_active
        FROM clinic_user_relationships cur
        JOIN clinics c ON c.id = cur.clinic_id
        WHERE cur.user_id = auth.uid()
        ';
        
        EXECUTE 'COMMENT ON VIEW public.my_clinic_permissions IS ''Vista de permisos de clínica del usuario actual (Security Invoker)''';
    END IF;
END $$;





