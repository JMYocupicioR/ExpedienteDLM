-- =====================================================
-- MIGRATION: Fix Appointments RLS v2
-- Date: 2026-02-19
-- Description: Role-aware INSERT/UPDATE/DELETE policies,
--   auth check in manual_insert_appointment,
--   add teleconsultation to enum, remove valid_date constraint
-- =====================================================

-- 0. Ensure enum types exist (in case base migration wasn't applied)
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'scheduled', 'confirmed', 'confirmed_by_patient', 'in_progress',
    'completed', 'cancelled_by_clinic', 'cancelled_by_patient', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM (
    'consultation', 'follow_up', 'check_up', 'procedure', 'emergency', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Add teleconsultation to appointment_type enum (only if type exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'appointment_type' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'appointment_type' AND e.enumlabel = 'teleconsultation'
    ) THEN
      ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'teleconsultation' AFTER 'consultation';
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Value already exists
  WHEN undefined_object THEN NULL; -- Type doesn't exist, skip
END
$$;

-- 2. Remove valid_date constraint (blocks historical data and timezone edge cases)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS valid_date;

-- 3. Drop existing staff/clinic policies (keep patient_own policies)
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

-- 4. SELECT Policy (doctor, clinic members, patients have their own policy)
CREATE POLICY "appointments_select_policy" ON public.appointments
FOR SELECT USING (
  doctor_id = auth.uid()
  OR (
    clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND clinic_id = appointments.clinic_id
        AND is_active = true
        AND status = 'approved'
    )
  )
);

-- 5. INSERT Policy (role-aware: doctor only self, assistant/admin can create for clinic doctors)
CREATE POLICY "appointments_insert_policy" ON public.appointments
FOR INSERT WITH CHECK (
  -- Doctor creates for themselves only
  (doctor_id = auth.uid() AND (
    clinic_id IS NULL OR public.is_active_member(clinic_id)
  ))
  OR
  -- Assistant or clinic admin creates for any doctor in their clinic
  (
    clinic_id IS NOT NULL
    AND public.is_active_member(clinic_id)
    AND EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = appointments.doctor_id
        AND cur.clinic_id = appointments.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
        AND cur.role_in_clinic <> 'administrative_assistant'
    )
    AND (
      public.is_clinic_admin(clinic_id)
      OR public.is_administrative_assistant(clinic_id)
    )
  )
);

-- 6. UPDATE Policy (doctor can update own, clinic members can update clinic appointments)
CREATE POLICY "appointments_update_policy" ON public.appointments
FOR UPDATE
USING (
  doctor_id = auth.uid()
  OR (
    clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND clinic_id = appointments.clinic_id
        AND is_active = true
        AND status = 'approved'
    )
  )
);

-- 7. DELETE Policy (doctor, admin, assistant can cancel)
CREATE POLICY "appointments_delete_policy" ON public.appointments
FOR DELETE USING (
  doctor_id = auth.uid()
  OR public.is_clinic_admin(clinic_id)
  OR (clinic_id IS NOT NULL AND public.is_administrative_assistant(clinic_id))
);

-- 8. Update manual_insert_appointment with authorization check
CREATE OR REPLACE FUNCTION public.manual_insert_appointment(
  p_id UUID,
  p_doctor_id UUID,
  p_patient_id UUID,
  p_clinic_id UUID,
  p_title TEXT,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_description TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 30,
  p_status appointment_status DEFAULT 'scheduled',
  p_type appointment_type DEFAULT 'consultation',
  p_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: caller must be doctor (creating for self), clinic admin, or assistant
  IF NOT (
    p_doctor_id = auth.uid()
    OR (p_clinic_id IS NOT NULL AND public.is_clinic_admin(p_clinic_id))
    OR (p_clinic_id IS NOT NULL AND public.is_administrative_assistant(p_clinic_id))
  ) THEN
    RAISE EXCEPTION 'Access denied: cannot create appointment for this doctor';
  END IF;

  -- If creating for another doctor, verify they are in the same clinic
  IF p_doctor_id <> auth.uid() AND p_clinic_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clinic_user_relationships
      WHERE user_id = p_doctor_id
        AND clinic_id = p_clinic_id
        AND status = 'approved'
        AND is_active = true
        AND role_in_clinic <> 'administrative_assistant'
    ) THEN
      RAISE EXCEPTION 'Access denied: doctor must be in the same clinic';
    END IF;
  END IF;

  INSERT INTO public.appointments (
    id,
    doctor_id,
    patient_id,
    clinic_id,
    title,
    appointment_date,
    appointment_time,
    description,
    duration,
    status,
    type,
    location,
    notes
  ) VALUES (
    p_id,
    p_doctor_id,
    p_patient_id,
    p_clinic_id,
    p_title,
    p_appointment_date,
    p_appointment_time,
    p_description,
    p_duration,
    p_status,
    p_type,
    p_location,
    p_notes
  );
END;
$$;
