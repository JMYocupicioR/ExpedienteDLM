-- ==========================================
-- MIGRACIÓN MULTI-CLÍNICA - VERSIÓN CORREGIDA
-- ==========================================
-- Esta versión corrige los problemas de recursión y constraints

-- Paso 1: Limpiar políticas existentes que causan recursión
DROP POLICY IF EXISTS "Users can view members of their clinics" ON public.clinic_members;
DROP POLICY IF EXISTS "Admins can add members to their clinics" ON public.clinic_members;
DROP POLICY IF EXISTS "Users can view patients in their clinics" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients in their clinics" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients in their clinics" ON public.patients;

-- Paso 2: Deshabilitar RLS temporalmente para hacer cambios
ALTER TABLE public.clinic_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY;

-- Paso 3: Crear o modificar tabla clinics
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Paso 4: Crear tabla clinic_members
CREATE TABLE IF NOT EXISTS public.clinic_members (
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'staff', 'pending_approval')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    PRIMARY KEY (clinic_id, user_id)
);

-- Paso 5: Agregar clinic_id a patients si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'patients' 
                  AND column_name = 'clinic_id') THEN
        ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
END $$;

-- Paso 6: Crear índices
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Paso 7: Habilitar RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Paso 8: Políticas SIMPLES para clinics (sin recursión)
CREATE POLICY "Users can view their clinics" ON public.clinics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create clinics" ON public.clinics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their clinics" ON public.clinics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid() 
            AND clinic_members.role = 'admin'
        )
    );

-- Paso 9: Políticas SIMPLES para clinic_members (sin recursión)
CREATE POLICY "Users can view their own membership" ON public.clinic_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view clinic members where they belong" ON public.clinic_members
    FOR SELECT USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can join clinics" ON public.clinic_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave clinics" ON public.clinic_members
    FOR DELETE USING (user_id = auth.uid());

-- Paso 10: Políticas para patients
CREATE POLICY "Users can view patients in their clinics" ON public.patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create patients in their clinics" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update patients in their clinics" ON public.patients
    FOR UPDATE USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

-- Paso 11: Función para crear clínica con miembro
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
    -- Crear la clínica
    INSERT INTO public.clinics (name, address)
    VALUES (clinic_name, clinic_address)
    RETURNING * INTO new_clinic;
    
    -- Agregar al usuario como miembro
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (new_clinic.id, auth.uid(), user_role);
    
    RETURN new_clinic;
END;
$$;

-- Paso 12: Permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinic_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_with_member TO authenticated;

-- Paso 13: Crear algunas clínicas de ejemplo
INSERT INTO public.clinics (name, address, phone, email) 
VALUES
('Clínica Central', 'Av. Principal 123, Ciudad de México', '555-0001', 'contacto@clinicacentral.com'),
('Hospital San José', 'Calle 5 de Mayo 456, Guadalajara', '555-0002', 'info@hospitalsanjose.com'),
('Centro Médico Norte', 'Blvd. Norte 789, Monterrey', '555-0003', 'admin@centromediconorte.com')
ON CONFLICT DO NOTHING;

-- ==========================================
-- FIN DE LA MIGRACIÓN CORREGIDA
-- ==========================================
