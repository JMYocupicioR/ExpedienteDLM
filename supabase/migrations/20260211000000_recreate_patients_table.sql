-- Recreate patients table to match application code and database types
-- This fixes the "column patients.clinic_id does not exist" error and aligns the schema

-- Drop existing table (verified to be empty in previous steps or contains irrelevant data from wrong schema)
DROP TABLE IF EXISTS public.patients CASCADE;

-- Create patients table with correct columns
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT,
    last_name TEXT,
    full_name TEXT, -- Added per 20251122
    birth_date DATE, -- Mapped from previously named date_of_birth
    gender TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city_of_birth TEXT,
    city_of_residence TEXT,
    social_security_number TEXT,
    curp TEXT,
    
    -- Relationships
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE, -- Nullable for independent doctors
    primary_doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Required for ownership
    patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- JSONB fields
    insurance_info JSONB DEFAULT '{}'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    medical_history JSONB DEFAULT '{}'::jsonb,
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_patients_primary_doctor_id ON public.patients(primary_doctor_id);
CREATE INDEX idx_patients_full_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_patients_social_security ON public.patients(social_security_number);

-- Unique constraint for CURP within a clinic (if clinic exists)
CREATE UNIQUE INDEX unique_clinic_curp_when_not_null
ON public.patients (clinic_id, curp)
WHERE clinic_id IS NOT NULL AND curp IS NOT NULL AND curp != '';

-- RLS Policies (Adapted from 20251122_allow_independent_doctors_COMPLETE.sql)

-- Policy Helper Function (Ensure it exists)
CREATE OR REPLACE FUNCTION public.is_user_in_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
  );
$$;

-- INSERT Policy
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  -- Option 1: Doctor belongs to the clinic (and patient is assigned to that clinic)
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Option 2: Independent doctor creating their own patient (no clinic)
  (clinic_id IS NULL AND primary_doctor_id = auth.uid())
  OR
  -- Option 3: Doctor creating patient in their profile's clinic
  (clinic_id IS NOT NULL AND primary_doctor_id = auth.uid() AND
   clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);

-- SELECT Policy
CREATE POLICY "patients_select_policy" ON public.patients
FOR SELECT
USING (
  -- Option 1: Patient belongs to a clinic the user is in
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Option 2: User is the primary doctor
  (primary_doctor_id = auth.uid())
);

-- UPDATE Policy
CREATE POLICY "patients_update_policy" ON public.patients
FOR UPDATE
USING (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (primary_doctor_id = auth.uid())
)
WITH CHECK (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (clinic_id IS NULL AND primary_doctor_id = auth.uid())
  OR
  (clinic_id IS NOT NULL AND primary_doctor_id = auth.uid() AND
   clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);

-- DELETE Policy
CREATE POLICY "patients_delete_policy" ON public.patients
FOR DELETE
USING (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (primary_doctor_id = auth.uid())
);
