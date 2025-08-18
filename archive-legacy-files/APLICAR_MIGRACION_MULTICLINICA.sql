-- ====================================
-- MIGRACIÓN: SISTEMA MULTI-CLÍNICA
-- ====================================
-- Esta migración permite que los usuarios pertenezcan a múltiples clínicas
-- Copia y pega todo este contenido en el SQL Editor de Supabase

-- Paso 1: Crear tabla de clínicas
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Paso 2: Crear tabla de miembros de clínica
CREATE TABLE IF NOT EXISTS public.clinic_members (
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'staff', 'pending_approval')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    PRIMARY KEY (clinic_id, user_id)
);

-- Paso 3: Agregar clinic_id a pacientes (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'patients' 
                  AND column_name = 'clinic_id') THEN
        ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
END $$;

-- Paso 4: Crear índices
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Paso 5: Habilitar RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Paso 6: Políticas para tabla clinics
DROP POLICY IF EXISTS "Users can view clinics they belong to" ON public.clinics;
CREATE POLICY "Users can view clinics they belong to" ON public.clinics
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.clinic_members WHERE clinic_id = id
        )
    );

DROP POLICY IF EXISTS "Admins can update their clinics" ON public.clinics;
CREATE POLICY "Admins can update their clinics" ON public.clinics
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.clinic_members 
            WHERE clinic_id = id AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create clinics" ON public.clinics;
CREATE POLICY "Authenticated users can create clinics" ON public.clinics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Paso 7: Políticas para tabla clinic_members
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.clinic_members;
CREATE POLICY "Users can view their own memberships" ON public.clinic_members
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view members of their clinics" ON public.clinic_members;
CREATE POLICY "Users can view members of their clinics" ON public.clinic_members
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can add members to their clinics" ON public.clinic_members;
CREATE POLICY "Admins can add members to their clinics" ON public.clinic_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_members
            WHERE clinic_id = clinic_members.clinic_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can leave clinics" ON public.clinic_members;
CREATE POLICY "Users can leave clinics" ON public.clinic_members
    FOR DELETE USING (auth.uid() = user_id);

-- Paso 8: Actualizar políticas de pacientes
DROP POLICY IF EXISTS "Users can view patients in their clinics" ON public.patients;
CREATE POLICY "Users can view patients in their clinics" ON public.patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create patients in their clinics" ON public.patients;
CREATE POLICY "Users can create patients in their clinics" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update patients in their clinics" ON public.patients;
CREATE POLICY "Users can update patients in their clinics" ON public.patients
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
    );

-- Paso 9: Función para crear clínica con miembro admin
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

-- Paso 10: Permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinic_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_with_member TO authenticated;

-- ====================================
-- FIN DE LA MIGRACIÓN
-- ====================================
-- ¡Listo! Ahora los usuarios pueden pertenecer a múltiples clínicas
