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


-- =====================================================
-- SEGUNDA PARTE: AUTOMATIZACI�N DE PERFILES
-- =====================================================


-- =====================================================
-- AUTOMATIZACIÓN DE CREACIÓN DE PERFILES
-- Fecha: 2025-08-17
-- 
-- Este script crea un sistema automático de triggers que garantiza
-- que cada usuario en auth.users tenga su correspondiente perfil
-- en public.profiles, eliminando la necesidad de scripts manuales.
-- =====================================================

-- =====================================================
-- PASO 1: PREPARACIÓN Y LIMPIEZA
-- Eliminar triggers anteriores si existen para evitar duplicados
-- =====================================================

-- Eliminar triggers existentes relacionados con la creación de perfiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Eliminar funciones anteriores si existen
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_created() CASCADE;

-- =====================================================
-- PASO 2: CREAR FUNCIÓN PARA MANEJAR NUEVOS USUARIOS
-- Esta función se ejecutará automáticamente cuando se cree un usuario
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    user_clinic_id UUID;
    full_name TEXT;
BEGIN
    -- Extraer información del metadata del usuario si está disponible
    user_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        'patient' -- Rol por defecto si no se especifica
    );
    
    -- Extraer clinic_id si viene en el metadata
    user_clinic_id := (NEW.raw_user_meta_data->>'clinic_id')::UUID;
    
    -- Construir nombre completo desde metadata o usar email como fallback
    full_name := COALESCE(
        NULLIF(TRIM(CONCAT(
            NEW.raw_user_meta_data->>'first_name',
            ' ',
            NEW.raw_user_meta_data->>'last_name'
        )), ''),
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1) -- Usar parte del email si no hay nombre
    );

    -- Insertar el perfil con toda la información disponible
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        clinic_id,
        phone,
        specialization,
        professional_license,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        full_name,
        user_role,
        user_clinic_id,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'specialization',
        NEW.raw_user_meta_data->>'professional_license',
        NOW(),
        NOW()
    );

    -- Si el usuario es parte de una clínica y no es paciente, crear relación
    IF user_clinic_id IS NOT NULL AND user_role != 'patient' THEN
        -- Verificar que la tabla clinic_user_relationships existe
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'clinic_user_relationships'
        ) THEN
            -- Insertar relación usuario-clínica
            INSERT INTO public.clinic_user_relationships (
                user_id,
                clinic_id,
                role_in_clinic,
                status,
                is_active,
                created_at
            ) VALUES (
                NEW.id,
                user_clinic_id,
                CASE 
                    WHEN user_role = 'admin_staff' THEN 'admin_staff'
                    WHEN user_role = 'doctor' THEN 'doctor'
                    ELSE 'doctor' -- Por defecto para otros roles profesionales
                END,
                'pending', -- Requiere aprobación del admin
                true,
                NOW()
            ) ON CONFLICT (user_id, clinic_id) DO NOTHING;
        END IF;
    END IF;

    -- Log de actividad si la tabla existe
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
    ) THEN
        INSERT INTO public.activity_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            clinic_id,
            created_at
        ) VALUES (
            NEW.id,
            'user_registered',
            'profile',
            NEW.id,
            jsonb_build_object(
                'email', NEW.email,
                'role', user_role,
                'clinic_id', user_clinic_id,
                'auto_created', true
            ),
            user_clinic_id,
            NOW()
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Si el perfil ya existe, actualizarlo en lugar de fallar
        UPDATE public.profiles
        SET 
            email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Registrar el error pero no fallar la creación del usuario
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- =====================================================
-- PASO 3: CREAR TRIGGER PARA NUEVOS USUARIOS
-- Se ejecutará después de cada INSERT en auth.users
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 4: FUNCIÓN PARA ACTUALIZAR PERFILES
-- Mantiene sincronizados los cambios en auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Actualizar email si cambió
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE public.profiles
        SET 
            email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    -- Actualizar metadata si cambió
    IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data THEN
        UPDATE public.profiles
        SET 
            full_name = COALESCE(
                NULLIF(TRIM(CONCAT(
                    NEW.raw_user_meta_data->>'first_name',
                    ' ',
                    NEW.raw_user_meta_data->>'last_name'
                )), ''),
                NEW.raw_user_meta_data->>'full_name',
                full_name
            ),
            phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
            specialization = COALESCE(NEW.raw_user_meta_data->>'specialization', specialization),
            professional_license = COALESCE(NEW.raw_user_meta_data->>'professional_license', professional_license),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Crear trigger para actualizaciones
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_updated();

-- =====================================================
-- PASO 5: FUNCIÓN PARA MANEJAR ELIMINACIÓN DE USUARIOS
-- Limpieza en cascada cuando se elimina un usuario
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- El perfil debería eliminarse automáticamente por CASCADE
    -- pero registramos la actividad si es posible
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
    ) THEN
        INSERT INTO public.activity_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            created_at
        ) VALUES (
            OLD.id,
            'user_deleted',
            'profile',
            OLD.id,
            jsonb_build_object(
                'email', OLD.email,
                'deleted_at', NOW()
            ),
            NOW()
        );
    END IF;

    RETURN OLD;
END;
$$;

-- Crear trigger para eliminaciones
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_deleted();

-- =====================================================
-- PASO 6: MIGRACIÓN DE USUARIOS EXISTENTES
-- Crear perfiles para usuarios que no los tengan
-- =====================================================

-- Insertar perfiles faltantes para usuarios existentes
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    clinic_id,
    phone,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        NULLIF(TRIM(CONCAT(
            au.raw_user_meta_data->>'first_name',
            ' ',
            au.raw_user_meta_data->>'last_name'
        )), ''),
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(au.raw_user_meta_data->>'role', 'patient') as role,
    (au.raw_user_meta_data->>'clinic_id')::UUID as clinic_id,
    au.raw_user_meta_data->>'phone' as phone,
    COALESCE(au.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- =====================================================
-- PASO 7: VALIDACIÓN Y POLÍTICAS RLS
-- Asegurar que la tabla profiles tenga las políticas correctas
-- =====================================================

-- Habilitar RLS en profiles si no está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Política para que los usuarios vean su propio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
);

-- Política para que los usuarios de la misma clínica se vean entre sí
CREATE POLICY "profiles_select_same_clinic"
ON public.profiles FOR SELECT
USING (
    -- Ver perfiles de la misma clínica
    clinic_id IS NOT NULL 
    AND clinic_id IN (
        SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT clinic_id FROM public.clinic_user_relationships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Política para que los usuarios actualicen su propio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Los perfiles no se pueden eliminar directamente (solo a través de auth.users)
-- No crear política DELETE

-- =====================================================
-- PASO 8: ÍNDICES PARA OPTIMIZACIÓN
-- Mejorar el rendimiento de las consultas
-- =====================================================

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- PASO 9: VERIFICACIÓN FINAL
-- Comprobar que todo está configurado correctamente
-- =====================================================

DO $$
DECLARE
    missing_profiles INTEGER;
BEGIN
    -- Contar usuarios sin perfil
    SELECT COUNT(*)
    INTO missing_profiles
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL;

    IF missing_profiles > 0 THEN
        RAISE WARNING 'Aún hay % usuarios sin perfil. Revisa los logs de error.', missing_profiles;
    ELSE
        RAISE NOTICE 'Todos los usuarios tienen perfil creado correctamente.';
    END IF;

    -- Verificar que los triggers existen
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE WARNING 'El trigger on_auth_user_created no se creó correctamente.';
    END IF;

    RAISE NOTICE 'Sistema de sincronización automática de perfiles configurado exitosamente.';
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE AUTOMATIZACIÓN
-- =====================================================

-- Comentario final: A partir de ahora, cada usuario nuevo tendrá
-- su perfil creado automáticamente. No se requieren scripts manuales
-- de sincronización.
