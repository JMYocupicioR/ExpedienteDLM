-- Migration: Multi-Clinic System
-- Description: Refactors the system to allow users to belong to multiple clinics

-- Step 1: Create the clinics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Step 2: Create the clinic_members table (replacement for clinic_user_relationships)
CREATE TABLE IF NOT EXISTS public.clinic_members (
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'staff', 'pending_approval')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    PRIMARY KEY (clinic_id, user_id)
);

-- Step 3: Add clinic_id to patients table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'patients' 
                  AND column_name = 'clinic_id') THEN
        ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Step 5: Enable RLS on tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for clinics table
-- Users can see clinics they are members of
CREATE POLICY "Users can view clinics they belong to" ON public.clinics
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.clinic_members WHERE clinic_id = id
        )
    );

-- Users can update clinics where they are admin
CREATE POLICY "Admins can update their clinics" ON public.clinics
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.clinic_members 
            WHERE clinic_id = id AND role = 'admin'
        )
    );

-- Users can delete clinics where they are admin
CREATE POLICY "Admins can delete their clinics" ON public.clinics
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.clinic_members 
            WHERE clinic_id = id AND role = 'admin'
        )
    );

-- Authenticated users can create clinics
CREATE POLICY "Authenticated users can create clinics" ON public.clinics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 7: Create RLS policies for clinic_members table
-- Users can see their own memberships
CREATE POLICY "Users can view their own memberships" ON public.clinic_members
    FOR SELECT USING (auth.uid() = user_id);

-- Users can see other members of their clinics
CREATE POLICY "Users can view members of their clinics" ON public.clinic_members
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

-- Admins can insert new members
CREATE POLICY "Admins can add members to their clinics" ON public.clinic_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_members
            WHERE clinic_id = clinic_members.clinic_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Admins can update member roles
CREATE POLICY "Admins can update member roles" ON public.clinic_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members cm
            WHERE cm.clinic_id = clinic_members.clinic_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- Admins can remove members (or users can remove themselves)
CREATE POLICY "Admins can remove members or users can leave" ON public.clinic_members
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.clinic_members cm
            WHERE cm.clinic_id = clinic_members.clinic_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- Step 8: Update RLS policies for patients table to consider clinic context
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete patients" ON public.patients;

-- Create new clinic-aware policies
CREATE POLICY "Users can view patients in their clinics" ON public.patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create patients in their clinics" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update patients in their clinics" ON public.patients
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors and admins can delete patients" ON public.patients
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'doctor')
        )
    );

-- Step 9: Create function to create clinic with initial admin member
CREATE OR REPLACE FUNCTION public.create_clinic_with_member(
    clinic_name TEXT,
    clinic_address TEXT DEFAULT NULL,
    user_role TEXT DEFAULT 'admin'
)
RETURNS public.clinics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_clinic public.clinics;
BEGIN
    -- Create the clinic
    INSERT INTO public.clinics (name, address)
    VALUES (clinic_name, clinic_address)
    RETURNING * INTO new_clinic;
    
    -- Add the user as a member
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (new_clinic.id, auth.uid(), user_role);
    
    RETURN new_clinic;
END;
$$;

-- Step 10: Create function to safely join a clinic
CREATE OR REPLACE FUNCTION public.request_join_clinic(
    target_clinic_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM public.clinic_members 
        WHERE clinic_id = target_clinic_id AND user_id = auth.uid()
    ) THEN
        RETURN FALSE; -- Already a member
    END IF;
    
    -- Add user as pending member
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (target_clinic_id, auth.uid(), 'pending_approval');
    
    RETURN TRUE;
END;
$$;

-- Step 11: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinic_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_with_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_join_clinic TO authenticated;
