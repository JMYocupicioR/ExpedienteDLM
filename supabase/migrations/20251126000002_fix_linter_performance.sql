-- =====================================================
-- Performance Optimization & Linter Fixes (Safe Version)
-- Date: 2025-11-26
-- Description: Fixes auth_rls_initplan warnings, drops duplicate indexes, and cleans up redundant policies
--              Includes safety checks for missing tables/columns.
-- =====================================================

-- 1. Drop Duplicate Indexes
-- =====================================================
DROP INDEX IF EXISTS idx_patient_registration_tokens_assigned_patient;
DROP INDEX IF EXISTS idx_prt_expires_at;
DROP INDEX IF EXISTS idx_patients_name_trgm;

-- 2. Clean up Redundant Policies
-- =====================================================
DO $$
BEGIN
    -- Patients
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'patients_simple_access' AND tablename = 'patients') THEN
        DROP POLICY "patients_simple_access" ON public.patients;
    END IF;
    
    -- Appointments
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'appointments_simple_access' AND tablename = 'appointments') THEN
        DROP POLICY "appointments_simple_access" ON public.appointments;
    END IF;
    
    -- Prescriptions
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prescriptions_patient_access' AND tablename = 'prescriptions') THEN
        DROP POLICY "prescriptions_patient_access" ON public.prescriptions;
    END IF;
    
    -- Medical Records
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'View non-deleted medical records' AND tablename = 'medical_records') THEN
        DROP POLICY "View non-deleted medical records" ON public.medical_records;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Soft delete for medical records' AND tablename = 'medical_records') THEN
        DROP POLICY "Soft delete for medical records" ON public.medical_records;
    END IF;
END $$;

-- 3. Optimize RLS Policies (Fix auth_rls_initplan)
-- =====================================================

-- A. PROFILES
-- -----------------------------------------------------
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    
    -- Create new optimized policies
    CREATE POLICY "profiles_select_own" ON public.profiles
        FOR SELECT USING (id = (select auth.uid()));

    CREATE POLICY "profiles_update_own" ON public.profiles
        FOR UPDATE USING (id = (select auth.uid()));

    CREATE POLICY "profiles_insert_own" ON public.profiles
        FOR INSERT WITH CHECK (id = (select auth.uid()));
END $$;

-- B. PATIENTS
-- -----------------------------------------------------
DO $$
DECLARE
    v_has_profiles_clinic_id boolean;
BEGIN
    -- Check if profiles table has clinic_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'clinic_id'
    ) INTO v_has_profiles_clinic_id;

    -- Drop existing policies
    DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
    DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

    -- Create optimized policies
    CREATE POLICY "patients_select_policy" ON public.patients
    FOR SELECT
    USING (
      (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
      OR
      (primary_doctor_id = (select auth.uid()))
    );

    -- INSERT Policy with conditional logic based on schema
    IF v_has_profiles_clinic_id THEN
        EXECUTE '
        CREATE POLICY "patients_insert_policy" ON public.patients
        FOR INSERT
        WITH CHECK (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (clinic_id IS NULL AND primary_doctor_id = (select auth.uid()))
          OR
          (clinic_id IS NOT NULL AND primary_doctor_id = (select auth.uid()) AND
           clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = (select auth.uid())))
        )';
    ELSE
        -- Fallback if profiles.clinic_id is missing
        CREATE POLICY "patients_insert_policy" ON public.patients
        FOR INSERT
        WITH CHECK (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (clinic_id IS NULL AND primary_doctor_id = (select auth.uid()))
        );
    END IF;

    -- UPDATE Policy with conditional logic
    IF v_has_profiles_clinic_id THEN
        EXECUTE '
        CREATE POLICY "patients_update_policy" ON public.patients
        FOR UPDATE
        USING (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (primary_doctor_id = (select auth.uid()))
        )
        WITH CHECK (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (clinic_id IS NULL AND primary_doctor_id = (select auth.uid()))
          OR
          (clinic_id IS NOT NULL AND primary_doctor_id = (select auth.uid()) AND
           clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = (select auth.uid())))
        )';
    ELSE
        CREATE POLICY "patients_update_policy" ON public.patients
        FOR UPDATE
        USING (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (primary_doctor_id = (select auth.uid()))
        )
        WITH CHECK (
          (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
          OR
          (clinic_id IS NULL AND primary_doctor_id = (select auth.uid()))
        );
    END IF;

    CREATE POLICY "patients_delete_policy" ON public.patients
    FOR DELETE
    USING (
      (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
      OR
      (primary_doctor_id = (select auth.uid()))
    );
END $$;

-- C. APPOINTMENTS
-- -----------------------------------------------------
DO $$
BEGIN
    -- Only proceed if appointments table exists AND has clinic_id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'appointments'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'clinic_id'
    ) THEN
        DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

        CREATE POLICY "appointments_select_policy" ON public.appointments
        FOR SELECT USING (is_user_in_clinic(clinic_id));

        CREATE POLICY "appointments_insert_policy" ON public.appointments
        FOR INSERT WITH CHECK (is_user_in_clinic(clinic_id));

        CREATE POLICY "appointments_update_policy" ON public.appointments
        FOR UPDATE USING (is_user_in_clinic(clinic_id))
        WITH CHECK (is_user_in_clinic(clinic_id));

        CREATE POLICY "appointments_delete_policy" ON public.appointments
        FOR DELETE USING (is_user_in_clinic(clinic_id));
    END IF;
END $$;

-- D. PRESCRIPTIONS
-- -----------------------------------------------------
DO $$
BEGIN
    -- Only proceed if prescriptions table exists AND has clinic_id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'prescriptions'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'clinic_id'
    ) THEN
        DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_select_policy" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_insert_policy" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_update_policy" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_delete_policy" ON public.prescriptions;
        
        -- Drop legacy/permissive policies
        DROP POLICY IF EXISTS "Administrators can manage all prescriptions" ON public.prescriptions;
        DROP POLICY IF EXISTS "Doctors can manage their prescriptions" ON public.prescriptions;
        DROP POLICY IF EXISTS "Administrators can view all prescriptions" ON public.prescriptions;
        DROP POLICY IF EXISTS "Doctors can view all prescriptions" ON public.prescriptions;
        DROP POLICY IF EXISTS "Nurses can view patient prescriptions" ON public.prescriptions;

        CREATE POLICY "prescriptions_select_policy" ON public.prescriptions
        FOR SELECT USING (is_user_in_clinic(clinic_id));

        CREATE POLICY "prescriptions_insert_policy" ON public.prescriptions
        FOR INSERT WITH CHECK (is_user_in_clinic(clinic_id));

        CREATE POLICY "prescriptions_update_policy" ON public.prescriptions
        FOR UPDATE USING (is_user_in_clinic(clinic_id))
        WITH CHECK (is_user_in_clinic(clinic_id));

        CREATE POLICY "prescriptions_delete_policy" ON public.prescriptions
        FOR DELETE USING (is_user_in_clinic(clinic_id));
    END IF;
END $$;

-- E. MEDICAL RECORDS
-- -----------------------------------------------------
DO $$
DECLARE
    v_has_deleted_at boolean;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_records') THEN
        -- Check for deleted_at column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'medical_records' AND column_name = 'deleted_at'
        ) INTO v_has_deleted_at;

        DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_select_policy" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_insert_policy" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_update_policy" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_delete_policy" ON public.medical_records;

        -- Select Policy
        IF v_has_deleted_at THEN
            EXECUTE '
            CREATE POLICY "medical_records_select_policy" ON public.medical_records
            FOR SELECT
            USING (
              (deleted_at IS NULL)
              AND
              (
                EXISTS (
                    SELECT 1 FROM public.patients
                    WHERE patients.id = medical_records.patient_id
                      AND is_user_in_clinic(patients.clinic_id)
                )
              )
            )';
        ELSE
            CREATE POLICY "medical_records_select_policy" ON public.medical_records
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.patients
                    WHERE patients.id = medical_records.patient_id
                      AND is_user_in_clinic(patients.clinic_id)
                )
            );
        END IF;

        -- Insert Policy
        CREATE POLICY "medical_records_insert_policy" ON public.medical_records
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.patients
                WHERE patients.id = medical_records.patient_id
                  AND is_user_in_clinic(patients.clinic_id)
            )
        );

        -- Update Policy
        IF v_has_deleted_at THEN
            EXECUTE '
            CREATE POLICY "medical_records_update_policy" ON public.medical_records
            FOR UPDATE
            USING (
                (deleted_at IS NULL)
                AND
                (
                    EXISTS (
                        SELECT 1 FROM public.patients
                        WHERE patients.id = medical_records.patient_id
                          AND is_user_in_clinic(patients.clinic_id)
                    )
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.patients
                    WHERE patients.id = medical_records.patient_id
                      AND is_user_in_clinic(patients.clinic_id)
                )
            )';
        ELSE
            CREATE POLICY "medical_records_update_policy" ON public.medical_records
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.patients
                    WHERE patients.id = medical_records.patient_id
                      AND is_user_in_clinic(patients.clinic_id)
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.patients
                    WHERE patients.id = medical_records.patient_id
                      AND is_user_in_clinic(patients.clinic_id)
                )
            );
        END IF;

        -- Delete Policy
        CREATE POLICY "medical_records_delete_policy" ON public.medical_records
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.patients
                WHERE patients.id = medical_records.patient_id
                  AND is_user_in_clinic(patients.clinic_id)
            )
        );
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
