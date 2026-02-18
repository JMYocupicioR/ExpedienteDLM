-- Fix RLS policies for appointments table
-- Replace non-existent table 'clinic_members' with 'clinic_user_relationships'

-- Enable RLS just in case
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might use the wrong table
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

-- 1. SELECT Policy
CREATE POLICY "appointments_select_policy" ON public.appointments
FOR SELECT USING (
  -- Doctor can see their own appointments
  doctor_id = auth.uid()
  OR
  -- Users in the same clinic should see appointments
  clinic_id IN (
    SELECT clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND status = 'approved'
  )
  -- patient_id IN (
  --     SELECT id FROM public.patients WHERE primary_doctor_id = auth.uid()
  -- )
);

-- 2. INSERT Policy
CREATE POLICY "appointments_insert_policy" ON public.appointments
FOR INSERT WITH CHECK (
  -- Doctor can create for themselves
  doctor_id = auth.uid()
  OR
  -- Clinic staff can create
  clinic_id IN (
    SELECT clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND status = 'approved'
  )
);

-- 3. UPDATE Policy
CREATE POLICY "appointments_update_policy" ON public.appointments
FOR UPDATE USING (
  doctor_id = auth.uid()
  OR
  clinic_id IN (
    SELECT clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND status = 'approved'
  )
);

-- 4. DELETE Policy
CREATE POLICY "appointments_delete_policy" ON public.appointments
FOR DELETE USING (
  doctor_id = auth.uid()
  OR
  (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
      -- Allow delete for members too, consistent with previous logic, though typically restricted to admin
      -- But original policy was "clinic_id IN ... clinic,members ..."
    )
  )
);
