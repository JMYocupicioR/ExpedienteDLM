-- DROP functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.is_clinic_admin(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_active_member(uuid);

-- =====================================================
-- SYSTEM: CLINIC ADMINISTRATION SECURITY PROTOCOL
-- Date: 2026-02-08
-- Description: Implements robust Role-Based Access Control (RBAC)
-- using RLS policies and secure helper functions.
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTIONS (Security Definer)
-- =====================================================

-- Function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
END;
$$;

-- Function to check if current user is Clinic Admin
-- (Owner, Director, Admin Staff) for a specific clinic
CREATE OR REPLACE FUNCTION public.is_clinic_admin(target_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND role_in_clinic IN ('owner', 'director', 'admin_staff')
      AND status = 'approved'
      AND is_active = true
  );
END;
$$;

-- Function to check if current user is an Active Member
-- (Any role) for a specific clinic
CREATE OR REPLACE FUNCTION public.is_active_member(target_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
  );
END;
$$;

-- =====================================================
-- 2. PROFILES TABLE POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- SELECT Policy
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  -- 1. User sees themselves
  id = auth.uid()
  OR
  -- 2. Super Admin sees everyone
  is_super_admin()
  OR
  -- 3. Clinic Admins see members of their clinics
  EXISTS (
    SELECT 1 FROM clinic_user_relationships cur_admin
    JOIN clinic_user_relationships cur_member ON cur_admin.clinic_id = cur_member.clinic_id
    WHERE cur_admin.user_id = auth.uid()
      AND cur_member.user_id = public.profiles.id -- Targeted profile is in the same clinic
      AND cur_admin.role_in_clinic IN ('owner', 'director', 'admin_staff')
      AND cur_admin.status = 'approved' AND cur_admin.is_active = true
  )
);

-- UPDATE Policy
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (
  -- 1. User updates themselves
  id = auth.uid()
  OR
  -- 2. Super Admin updates anyone
  is_super_admin()
) WITH CHECK (
  -- Same conditions
  id = auth.uid()
  OR
  is_super_admin()
);

-- =====================================================
-- 3. CLINICS TABLE POLICIES
-- =====================================================

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_policy" ON public.clinics;

-- SELECT: Public clinics available for listing, or user is member
CREATE POLICY "clinics_select_policy" ON public.clinics
FOR SELECT USING (
  -- 1. Super Admin sees all
  is_super_admin()
  OR
  -- 2. Active members see their own clinics
  is_active_member(id)
  OR
  -- 3. For listing available clinics (e.g. searching to join)
  -- Allow seeing clinics that are active (simplified for now, might need more restriction later)
  is_active = true
);

-- INSERT: Super Admin or System
CREATE POLICY "clinics_insert_policy" ON public.clinics
FOR INSERT WITH CHECK (
  is_super_admin()
  -- Note: Auto-creation is handled by system functions (bypass RLS)
);

-- UPDATE: Super Admin or Clinic Admin
CREATE POLICY "clinics_update_policy" ON public.clinics
FOR UPDATE USING (
  is_super_admin()
  OR
  is_clinic_admin(id)
);

-- =====================================================
-- 4. CLINIC USER RELATIONSHIPS POLICIES
-- =====================================================

ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cur_select_policy" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "cur_insert_policy" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "cur_update_policy" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "cur_delete_policy" ON public.clinic_user_relationships;

-- SELECT
CREATE POLICY "cur_select_policy" ON public.clinic_user_relationships
FOR SELECT USING (
  -- 1. Super Admin sees all
  is_super_admin()
  OR
  -- 2. User sees their own relationships
  user_id = auth.uid()
  OR
  -- 3. Clinic Admin sees all relationships in their clinic
  is_clinic_admin(clinic_id)
);

-- INSERT
CREATE POLICY "cur_insert_policy" ON public.clinic_user_relationships
FOR INSERT WITH CHECK (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Clinic Admin inviting someone
  is_clinic_admin(clinic_id)
  OR
  -- 3. User requesting to join (status must be pending)
  (user_id = auth.uid() AND status = 'pending')
);

-- UPDATE
CREATE POLICY "cur_update_policy" ON public.clinic_user_relationships
FOR UPDATE USING (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Clinic Admin managing staff
  is_clinic_admin(clinic_id)
  OR
  -- 3. User accepting/rejecting invitation (can update own status)
  user_id = auth.uid()
);

-- DELETE
CREATE POLICY "cur_delete_policy" ON public.clinic_user_relationships
FOR DELETE USING (
  is_super_admin()
  OR
  is_clinic_admin(clinic_id)
  OR
  -- User can leave a clinic (delete own pending request or leave)
  user_id = auth.uid()
);

-- =====================================================
-- 5. PATIENTS TABLE POLICIES (Updated)
-- =====================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to replace with strict RBAC
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

-- SELECT
CREATE POLICY "patients_select_policy" ON public.patients
FOR SELECT USING (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Primary Doctor (Private Patients)
  primary_doctor_id = auth.uid()
  OR
  -- 3. Clinic Member (Clinic Patients)
  (clinic_id IS NOT NULL AND is_active_member(clinic_id))
);

-- INSERT
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT WITH CHECK (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Primary Doctor creating own patient (clinic_id NULL or active member)
  (
    primary_doctor_id = auth.uid()
    AND
    (
      clinic_id IS NULL -- Independent
      OR
      is_active_member(clinic_id) -- In a clinic
    )
  )
);

-- UPDATE
CREATE POLICY "patients_update_policy" ON public.patients
FOR UPDATE USING (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Primary Doctor
  primary_doctor_id = auth.uid()
  OR
  -- 3. Clinic Admin (Manage clinic patients)
  (clinic_id IS NOT NULL AND is_clinic_admin(clinic_id))
  OR
  -- 4. Clinic Members (Standard update access)
  -- Note: You might want to restrict this depending on business rules (e.g. only doctor can edit medical info)
  (clinic_id IS NOT NULL AND is_active_member(clinic_id))
);

-- DELETE
CREATE POLICY "patients_delete_policy" ON public.patients
FOR DELETE USING (
  -- 1. Super Admin
  is_super_admin()
  OR
  -- 2. Primary Doctor
  primary_doctor_id = auth.uid()
  OR
  -- 3. Clinic Admin
  (clinic_id IS NOT NULL AND is_clinic_admin(clinic_id))
);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
