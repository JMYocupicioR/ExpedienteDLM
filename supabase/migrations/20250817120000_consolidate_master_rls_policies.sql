-- =====================================================
-- CONSOLIDACIÓN MAESTRA DE POLÍTICAS DE SEGURIDAD (RLS)
-- Fecha: 2025-08-17
-- 
-- Este script unifica TODAS las políticas de seguridad del sistema,
-- eliminando la deuda técnica acumulada por múltiples parches.
-- =====================================================

-- =====================================================
-- PASO 1: LIMPIEZA COMPLETA
-- Eliminar TODAS las políticas existentes para empezar desde cero
-- =====================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Eliminar todas las políticas de la tabla patients
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'patients'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patients', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla clinics
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'clinics'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla clinic_staff
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'clinic_staff'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinic_staff', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla clinic_user_relationships
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'clinic_user_relationships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinic_user_relationships', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla consultations
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'consultations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.consultations', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla prescriptions
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'prescriptions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.prescriptions', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla physical_exams
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'physical_exams'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.physical_exams', policy_record.policyname);
    END LOOP;

    -- Eliminar todas las políticas de la tabla activity_logs
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'activity_logs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_logs', policy_record.policyname);
    END LOOP;
END $$;

-- =====================================================
-- PASO 2: FUNCIONES AUXILIARES
-- Crear o actualizar funciones helper para evitar recursión y mejorar legibilidad
-- =====================================================

-- Función para obtener la clínica activa del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
$$;

-- Función para verificar si un usuario pertenece a una clínica específica
CREATE OR REPLACE FUNCTION public.is_user_in_clinic(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.clinic_id = check_clinic_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.clinic_user_relationships cur
        WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = check_clinic_id
        AND cur.is_active = true
        AND cur.status = 'approved'
    )
$$;

-- Función para obtener el rol del usuario en su clínica
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
$$;

-- Función para verificar si el usuario es admin de una clínica específica
CREATE OR REPLACE FUNCTION public.is_clinic_admin(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.clinic_id = check_clinic_id
        AND (p.role = 'admin_staff' OR p.role = 'super_admin')
    )
    OR EXISTS (
        SELECT 1
        FROM public.clinic_user_relationships cur
        WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = check_clinic_id
        AND cur.is_active = true
        AND cur.status = 'approved'
        AND cur.role_in_clinic = 'admin_staff'
    )
$$;

-- =====================================================
-- PASO 3: POLÍTICAS PARA LA TABLA PATIENTS
-- Controla el acceso a los registros de pacientes
-- =====================================================

-- Habilitar RLS en la tabla patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios solo pueden ver pacientes de su clínica
CREATE POLICY "patients_select_own_clinic"
ON public.patients FOR SELECT
USING (
    is_user_in_clinic(clinic_id)
);

-- INSERT: Los usuarios solo pueden crear pacientes en su clínica activa
CREATE POLICY "patients_insert_own_clinic"
ON public.patients FOR INSERT
WITH CHECK (
    clinic_id = get_user_clinic_id()
);

-- UPDATE: Los usuarios solo pueden actualizar pacientes de su clínica
CREATE POLICY "patients_update_own_clinic"
ON public.patients FOR UPDATE
USING (
    is_user_in_clinic(clinic_id)
)
WITH CHECK (
    is_user_in_clinic(clinic_id)
);

-- DELETE: Solo administradores de la clínica pueden eliminar pacientes
CREATE POLICY "patients_delete_admin_only"
ON public.patients FOR DELETE
USING (
    is_clinic_admin(clinic_id)
);

-- =====================================================
-- PASO 4: POLÍTICAS PARA LA TABLA CLINIC_STAFF
-- Controla quién puede gestionar el personal de cada clínica
-- =====================================================

-- Habilitar RLS en la tabla clinic_staff (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinic_staff'
    ) THEN
        ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;
        
        -- SELECT: Los usuarios pueden ver el personal de su clínica
        CREATE POLICY "clinic_staff_select_own_clinic"
        ON public.clinic_staff FOR SELECT
        USING (
            is_user_in_clinic(clinic_id)
        );

        -- INSERT: Solo administradores pueden añadir personal
        CREATE POLICY "clinic_staff_insert_admin_only"
        ON public.clinic_staff FOR INSERT
        WITH CHECK (
            is_clinic_admin(clinic_id)
        );

        -- UPDATE: Solo administradores pueden actualizar personal
        CREATE POLICY "clinic_staff_update_admin_only"
        ON public.clinic_staff FOR UPDATE
        USING (
            is_clinic_admin(clinic_id)
        )
        WITH CHECK (
            is_clinic_admin(clinic_id)
        );

        -- DELETE: Solo administradores pueden eliminar personal
        CREATE POLICY "clinic_staff_delete_admin_only"
        ON public.clinic_staff FOR DELETE
        USING (
            is_clinic_admin(clinic_id)
        );
    END IF;
END $$;

-- =====================================================
-- PASO 5: POLÍTICAS PARA LA TABLA CLINIC_USER_RELATIONSHIPS
-- Controla las relaciones entre usuarios y clínicas
-- =====================================================

-- Habilitar RLS en la tabla clinic_user_relationships
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden ver relaciones de su clínica o sus propias relaciones
CREATE POLICY "clinic_relationships_select"
ON public.clinic_user_relationships FOR SELECT
USING (
    is_user_in_clinic(clinic_id) OR user_id = auth.uid()
);

-- INSERT: Solo administradores pueden crear relaciones
CREATE POLICY "clinic_relationships_insert_admin"
ON public.clinic_user_relationships FOR INSERT
WITH CHECK (
    is_clinic_admin(clinic_id)
);

-- UPDATE: Solo administradores pueden actualizar relaciones
CREATE POLICY "clinic_relationships_update_admin"
ON public.clinic_user_relationships FOR UPDATE
USING (
    is_clinic_admin(clinic_id)
)
WITH CHECK (
    is_clinic_admin(clinic_id)
);

-- DELETE: Solo administradores pueden eliminar relaciones
CREATE POLICY "clinic_relationships_delete_admin"
ON public.clinic_user_relationships FOR DELETE
USING (
    is_clinic_admin(clinic_id)
);

-- =====================================================
-- PASO 6: POLÍTICAS PARA LA TABLA CONSULTATIONS
-- Controla el acceso a las consultas médicas
-- =====================================================

-- Habilitar RLS en la tabla consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden ver consultas de pacientes de su clínica
CREATE POLICY "consultations_select_own_clinic"
ON public.consultations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = consultations.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- INSERT: Los usuarios pueden crear consultas para pacientes de su clínica
CREATE POLICY "consultations_insert_own_clinic"
ON public.consultations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = consultations.patient_id
        AND p.clinic_id = get_user_clinic_id()
    )
);

-- UPDATE: Los usuarios pueden actualizar consultas de pacientes de su clínica
CREATE POLICY "consultations_update_own_clinic"
ON public.consultations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = consultations.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = consultations.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- DELETE: Solo administradores pueden eliminar consultas
CREATE POLICY "consultations_delete_admin_only"
ON public.consultations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = consultations.patient_id
        AND is_clinic_admin(p.clinic_id)
    )
);

-- =====================================================
-- PASO 7: POLÍTICAS PARA LA TABLA PRESCRIPTIONS
-- Controla el acceso a las prescripciones médicas
-- =====================================================

-- Habilitar RLS en la tabla prescriptions
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden ver prescripciones de pacientes de su clínica
CREATE POLICY "prescriptions_select_own_clinic"
ON public.prescriptions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = prescriptions.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- INSERT: Los usuarios pueden crear prescripciones para pacientes de su clínica
CREATE POLICY "prescriptions_insert_own_clinic"
ON public.prescriptions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = prescriptions.patient_id
        AND p.clinic_id = get_user_clinic_id()
    )
);

-- UPDATE: Los usuarios pueden actualizar prescripciones de pacientes de su clínica
CREATE POLICY "prescriptions_update_own_clinic"
ON public.prescriptions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = prescriptions.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = prescriptions.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- DELETE: Solo administradores pueden eliminar prescripciones
CREATE POLICY "prescriptions_delete_admin_only"
ON public.prescriptions FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = prescriptions.patient_id
        AND is_clinic_admin(p.clinic_id)
    )
);

-- =====================================================
-- PASO 8: POLÍTICAS PARA LA TABLA PHYSICAL_EXAMS
-- Controla el acceso a los exámenes físicos
-- =====================================================

-- Habilitar RLS en la tabla physical_exams
ALTER TABLE public.physical_exams ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden ver exámenes de pacientes de su clínica
CREATE POLICY "physical_exams_select_own_clinic"
ON public.physical_exams FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = physical_exams.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- INSERT: Los usuarios pueden crear exámenes para pacientes de su clínica
CREATE POLICY "physical_exams_insert_own_clinic"
ON public.physical_exams FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = physical_exams.patient_id
        AND p.clinic_id = get_user_clinic_id()
    )
);

-- UPDATE: Los usuarios pueden actualizar exámenes de pacientes de su clínica
CREATE POLICY "physical_exams_update_own_clinic"
ON public.physical_exams FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = physical_exams.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = physical_exams.patient_id
        AND is_user_in_clinic(p.clinic_id)
    )
);

-- DELETE: Solo administradores pueden eliminar exámenes
CREATE POLICY "physical_exams_delete_admin_only"
ON public.physical_exams FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = physical_exams.patient_id
        AND is_clinic_admin(p.clinic_id)
    )
);

-- =====================================================
-- PASO 9: POLÍTICAS PARA LA TABLA ACTIVITY_LOGS
-- Los logs de actividad deben ser inmutables
-- =====================================================

-- Habilitar RLS en la tabla activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden ver logs de su clínica
CREATE POLICY "activity_logs_select_own_clinic"
ON public.activity_logs FOR SELECT
USING (
    is_user_in_clinic(clinic_id)
);

-- INSERT: Los usuarios pueden crear logs (generalmente automático)
CREATE POLICY "activity_logs_insert_authenticated"
ON public.activity_logs FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- NO se permiten UPDATE ni DELETE en activity_logs (tabla inmutable)

-- =====================================================
-- PASO 10: POLÍTICAS PARA LA TABLA CLINICS
-- Controla quién puede ver y gestionar clínicas
-- =====================================================

-- Habilitar RLS en la tabla clinics
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos los usuarios autenticados pueden ver clínicas (para el flujo de registro)
CREATE POLICY "clinics_select_authenticated"
ON public.clinics FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- INSERT: Los usuarios autenticados pueden crear clínicas (durante el registro)
CREATE POLICY "clinics_insert_authenticated"
ON public.clinics FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- UPDATE: Solo administradores de la clínica o super admins
CREATE POLICY "clinics_update_admin_only"
ON public.clinics FOR UPDATE
USING (
    is_clinic_admin(id) OR get_user_role() = 'super_admin'
)
WITH CHECK (
    is_clinic_admin(id) OR get_user_role() = 'super_admin'
);

-- DELETE: Solo super admins pueden eliminar clínicas
CREATE POLICY "clinics_delete_super_admin_only"
ON public.clinics FOR DELETE
USING (
    get_user_role() = 'super_admin'
);

-- =====================================================
-- PASO 11: VERIFICACIÓN FINAL
-- Asegurar que todas las tablas tienen RLS habilitado
-- =====================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Lista de tablas que deben tener RLS habilitado
    FOR table_record IN 
        SELECT unnest(ARRAY[
            'patients', 'clinics', 'clinic_user_relationships',
            'consultations', 'prescriptions', 'physical_exams',
            'activity_logs', 'profiles'
        ]) AS table_name
    LOOP
        -- Verificar si la tabla existe
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_record.table_name
        ) THEN
            -- Habilitar RLS si no está habilitado
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.table_name);
            RAISE NOTICE 'RLS habilitado para tabla: %', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE CONSOLIDACIÓN
-- =====================================================

-- Comentario final: Este script consolida todas las políticas de seguridad
-- en un único lugar, eliminando la necesidad de múltiples scripts de parche.
-- Cualquier cambio futuro en las políticas debe hacerse aquí.
