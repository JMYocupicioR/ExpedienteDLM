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
