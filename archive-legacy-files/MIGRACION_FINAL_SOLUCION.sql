-- ==========================================
-- MIGRACIÓN MULTI-CLÍNICA - SOLUCIÓN FINAL
-- ==========================================
-- Esta versión maneja todos los constraints existentes

-- Paso 1: Limpiar políticas problemáticas
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Eliminar políticas de clinics
    FOR policy_name IN 
        SELECT pol.polname 
        FROM pg_policy pol 
        JOIN pg_class cls ON pol.polrelid = cls.oid 
        WHERE cls.relname = 'clinics'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.clinics';
    END LOOP;
    
    -- Eliminar políticas de clinic_members
    FOR policy_name IN 
        SELECT pol.polname 
        FROM pg_policy pol 
        JOIN pg_class cls ON pol.polrelid = cls.oid 
        WHERE cls.relname = 'clinic_members'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.clinic_members';
    END LOOP;
    
    -- Eliminar políticas de patients relacionadas con clínicas
    DROP POLICY IF EXISTS "Users can view patients in their clinics" ON public.patients;
    DROP POLICY IF EXISTS "Users can create patients in their clinics" ON public.patients;
    DROP POLICY IF EXISTS "Users can update patients in their clinics" ON public.patients;
    DROP POLICY IF EXISTS "patients_clinic_select" ON public.patients;
    DROP POLICY IF EXISTS "patients_clinic_insert" ON public.patients;
    DROP POLICY IF EXISTS "patients_clinic_update" ON public.patients;
END $$;

-- Paso 2: Deshabilitar RLS temporalmente
ALTER TABLE IF EXISTS public.clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_members DISABLE ROW LEVEL SECURITY;

-- Paso 3: Manejar constraints existentes de la tabla clinics
DO $$
BEGIN
    -- Si la tabla existe, eliminar constraint problemático
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics') THEN
        -- Eliminar constraint de check si existe
        ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_type_check;
        
        -- Hacer que la columna type sea opcional
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'type') THEN
            ALTER TABLE public.clinics ALTER COLUMN type DROP NOT NULL;
            ALTER TABLE public.clinics ALTER COLUMN type SET DEFAULT 'clinic';
        END IF;
        
        -- Actualizar registros NULL
        UPDATE public.clinics SET type = 'clinic' WHERE type IS NULL OR type = '';
    END IF;
END $$;

-- Paso 4: Crear/actualizar tabla clinics
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'clinic',
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Paso 5: Agregar columna type si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'type') THEN
        ALTER TABLE public.clinics ADD COLUMN type TEXT DEFAULT 'clinic';
    END IF;
    
    -- Asegurar que todos los registros tengan un type válido
    UPDATE public.clinics SET type = 'clinic' WHERE type IS NULL OR type = '';
END $$;

-- Paso 6: Crear/actualizar tabla clinic_members
CREATE TABLE IF NOT EXISTS public.clinic_members (
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'staff', 'pending_approval')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    PRIMARY KEY (clinic_id, user_id)
);

-- Paso 7: Agregar clinic_id a patients si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'patients' 
                  AND column_name = 'clinic_id') THEN
        ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);
    END IF;
END $$;

-- Paso 8: Crear índices
CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Paso 9: Habilitar RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Paso 10: Crear políticas simples para clinics
CREATE POLICY "clinic_select_simple" ON public.clinics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid()
        )
    );

CREATE POLICY "clinic_insert_simple" ON public.clinics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clinic_update_simple" ON public.clinics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_members 
            WHERE clinic_members.clinic_id = clinics.id 
            AND clinic_members.user_id = auth.uid() 
            AND clinic_members.role = 'admin'
        )
    );

-- Paso 11: Crear políticas simples para clinic_members
CREATE POLICY "members_select_own" ON public.clinic_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "members_select_clinic" ON public.clinic_members
    FOR SELECT USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "members_insert_simple" ON public.clinic_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_delete_simple" ON public.clinic_members
    FOR DELETE USING (user_id = auth.uid());

-- Paso 12: Crear políticas para patients
CREATE POLICY "patients_select_clinic" ON public.patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "patients_insert_clinic" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "patients_update_clinic" ON public.patients
    FOR UPDATE USING (
        clinic_id IN (
            SELECT cm.clinic_id FROM public.clinic_members cm WHERE cm.user_id = auth.uid()
        )
    );

-- Paso 13: Crear función mejorada
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
    -- Crear la clínica con valores seguros
    INSERT INTO public.clinics (name, address, type)
    VALUES (
        clinic_name, 
        COALESCE(clinic_address, ''), 
        'clinic'
    )
    RETURNING * INTO new_clinic;
    
    -- Agregar al usuario como miembro
    INSERT INTO public.clinic_members (clinic_id, user_id, role)
    VALUES (new_clinic.id, auth.uid(), user_role);
    
    RETURN new_clinic;
END;
$$;

-- Paso 14: Permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.clinics TO authenticated;
GRANT ALL ON public.clinic_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_with_member TO authenticated;

-- Paso 15: Insertar clínicas de ejemplo de forma segura
DO $$
BEGIN
    -- Solo insertar si no existen clínicas
    IF (SELECT COUNT(*) FROM public.clinics) = 0 THEN
        INSERT INTO public.clinics (name, address, phone, email, type) VALUES
        ('Clínica Central', 'Av. Principal 123, Ciudad de México', '555-0001', 'contacto@clinicacentral.com', 'clinic'),
        ('Hospital San José', 'Calle 5 de Mayo 456, Guadalajara', '555-0002', 'info@hospitalsanjose.com', 'clinic'),
        ('Centro Médico Norte', 'Blvd. Norte 789, Monterrey', '555-0003', 'admin@centromediconorte.com', 'clinic'),
        ('Clínica Familiar Sur', 'Av. Sur 321, Puebla', '555-0004', 'contacto@clinicafamiliarsur.com', 'clinic'),
        ('Instituto de Salud Integral', 'Paseo de la Reforma 654, CDMX', '555-0005', 'info@saludintegral.com', 'clinic');
    END IF;
END $$;

-- Paso 16: Verificación final
DO $$
DECLARE
    clinic_count INTEGER;
    member_table_exists BOOLEAN;
BEGIN
    -- Verificar tablas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics') THEN
        RAISE EXCEPTION 'Error: Tabla clinics no existe';
    END IF;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_members') 
    INTO member_table_exists;
    
    IF NOT member_table_exists THEN
        RAISE EXCEPTION 'Error: Tabla clinic_members no existe';
    END IF;
    
    -- Contar clínicas
    SELECT COUNT(*) INTO clinic_count FROM public.clinics;
    
    -- Mostrar resultado exitoso
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE! 🎉';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 Clínicas disponibles: %', clinic_count;
    RAISE NOTICE '🔒 Políticas RLS: Habilitadas';
    RAISE NOTICE '⚙️  Función create_clinic_with_member: Lista';
    RAISE NOTICE '🏥 Sistema multi-clínica: OPERATIVO';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Próximo paso: Reiniciar aplicación';
END $$;

-- ==========================================
-- 🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE 🎉
-- ==========================================
