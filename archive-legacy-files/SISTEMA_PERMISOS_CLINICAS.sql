-- ==========================================
-- SISTEMA DE PERMISOS PARA CLÍNICAS
-- ==========================================

-- Paso 1: Crear tipos de permisos
DO $$
BEGIN
    CREATE TYPE clinic_permission AS ENUM (
        'clinic.view',           -- Ver información de la clínica
        'clinic.edit',           -- Editar configuración de la clínica
        'clinic.delete',         -- Eliminar la clínica
        'patients.view',         -- Ver pacientes
        'patients.create',       -- Crear pacientes
        'patients.edit',         -- Editar pacientes
        'patients.delete',       -- Eliminar pacientes
        'appointments.view',     -- Ver citas
        'appointments.create',   -- Crear citas
        'appointments.edit',     -- Editar citas
        'appointments.delete',   -- Eliminar citas
        'staff.view',           -- Ver personal
        'staff.invite',         -- Invitar personal
        'staff.edit',           -- Editar roles de personal
        'staff.remove',         -- Remover personal
        'billing.view',         -- Ver facturación
        'billing.create',       -- Crear facturas
        'billing.edit',         -- Editar facturas
        'reports.view',         -- Ver reportes
        'reports.create'        -- Crear reportes
    );
EXCEPTION
    WHEN duplicate_object THEN
        -- El tipo ya existe
        NULL;
END $$;

-- Paso 2: Crear tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permissions clinic_permission[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(clinic_id, role)
);

-- Paso 3: Crear función para verificar permisos
CREATE OR REPLACE FUNCTION public.has_clinic_permission(
    p_user_id UUID,
    p_clinic_id UUID,
    p_permission clinic_permission
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_permissions clinic_permission[];
BEGIN
    -- Obtener rol del usuario en la clínica
    SELECT role INTO v_role
    FROM public.clinic_members
    WHERE user_id = p_user_id AND clinic_id = p_clinic_id;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admin siempre tiene todos los permisos
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar permisos del rol
    SELECT permissions INTO v_permissions
    FROM public.role_permissions
    WHERE clinic_id = p_clinic_id AND role = v_role;
    
    -- Si no hay permisos definidos, usar permisos por defecto
    IF v_permissions IS NULL THEN
        v_permissions := get_default_permissions(v_role);
    END IF;
    
    RETURN p_permission = ANY(v_permissions);
END;
$$;

-- Paso 4: Función para obtener permisos por defecto
CREATE OR REPLACE FUNCTION public.get_default_permissions(p_role TEXT)
RETURNS clinic_permission[]
LANGUAGE plpgsql
AS $$
BEGIN
    CASE p_role
        WHEN 'admin' THEN
            -- Admin tiene todos los permisos
            RETURN ENUM_RANGE(NULL::clinic_permission);
            
        WHEN 'doctor' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'patients.create'::clinic_permission,
                'patients.edit'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'appointments.edit'::clinic_permission,
                'staff.view'::clinic_permission,
                'reports.view'::clinic_permission,
                'reports.create'::clinic_permission
            ];
            
        WHEN 'nurse' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'patients.create'::clinic_permission,
                'patients.edit'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'appointments.edit'::clinic_permission,
                'staff.view'::clinic_permission
            ];
            
        WHEN 'staff' THEN
            RETURN ARRAY[
                'clinic.view'::clinic_permission,
                'patients.view'::clinic_permission,
                'appointments.view'::clinic_permission,
                'appointments.create'::clinic_permission,
                'billing.view'::clinic_permission,
                'billing.create'::clinic_permission
            ];
            
        ELSE
            RETURN ARRAY['clinic.view'::clinic_permission];
    END CASE;
END;
$$;

-- Paso 5: Crear políticas RLS mejoradas basadas en permisos
DROP POLICY IF EXISTS "clinic_select_active" ON public.clinics;
CREATE POLICY "clinic_select_permission" ON public.clinics
    FOR SELECT USING (
        is_active = true AND
        has_clinic_permission(auth.uid(), id, 'clinic.view'::clinic_permission)
    );

DROP POLICY IF EXISTS "clinic_update_admin" ON public.clinics;
CREATE POLICY "clinic_update_permission" ON public.clinics
    FOR UPDATE USING (
        has_clinic_permission(auth.uid(), id, 'clinic.edit'::clinic_permission)
    );

-- Políticas para pacientes con permisos
DROP POLICY IF EXISTS "patients_select_clinic" ON public.patients;
CREATE POLICY "patients_select_permission" ON public.patients
    FOR SELECT USING (
        clinic_id IS NOT NULL AND
        has_clinic_permission(auth.uid(), clinic_id, 'patients.view'::clinic_permission)
    );

DROP POLICY IF EXISTS "patients_insert_clinic" ON public.patients;
CREATE POLICY "patients_insert_permission" ON public.patients
    FOR INSERT WITH CHECK (
        clinic_id IS NOT NULL AND
        has_clinic_permission(auth.uid(), clinic_id, 'patients.create'::clinic_permission)
    );

DROP POLICY IF EXISTS "patients_update_clinic" ON public.patients;
CREATE POLICY "patients_update_permission" ON public.patients
    FOR UPDATE USING (
        clinic_id IS NOT NULL AND
        has_clinic_permission(auth.uid(), clinic_id, 'patients.edit'::clinic_permission)
    );

-- Paso 6: Crear función para gestionar permisos personalizados
CREATE OR REPLACE FUNCTION public.update_role_permissions(
    p_clinic_id UUID,
    p_role TEXT,
    p_permissions clinic_permission[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT has_clinic_permission(auth.uid(), p_clinic_id, 'clinic.edit'::clinic_permission) THEN
        RAISE EXCEPTION 'No tienes permisos para modificar roles';
    END IF;
    
    -- Insertar o actualizar permisos
    INSERT INTO public.role_permissions (clinic_id, role, permissions)
    VALUES (p_clinic_id, p_role, p_permissions)
    ON CONFLICT (clinic_id, role)
    DO UPDATE SET 
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
END;
$$;

-- Paso 7: Crear vista para ver permisos del usuario actual
CREATE OR REPLACE VIEW public.my_clinic_permissions AS
SELECT 
    cm.clinic_id,
    c.name as clinic_name,
    cm.role,
    COALESCE(
        rp.permissions,
        get_default_permissions(cm.role)
    ) as permissions
FROM public.clinic_members cm
JOIN public.clinics c ON cm.clinic_id = c.id
LEFT JOIN public.role_permissions rp ON rp.clinic_id = cm.clinic_id AND rp.role = cm.role
WHERE cm.user_id = auth.uid();

-- Permisos para la vista
GRANT SELECT ON public.my_clinic_permissions TO authenticated;

-- Paso 8: Crear funciones helper para el frontend
CREATE OR REPLACE FUNCTION public.check_multiple_permissions(
    p_clinic_id UUID,
    p_permissions clinic_permission[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB := '{}';
    v_permission clinic_permission;
BEGIN
    FOREACH v_permission IN ARRAY p_permissions
    LOOP
        v_result := v_result || 
            jsonb_build_object(
                v_permission::text, 
                has_clinic_permission(auth.uid(), p_clinic_id, v_permission)
            );
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ SISTEMA DE PERMISOS IMPLEMENTADO';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🔐 Permisos granulares por rol';
    RAISE NOTICE '🛡️  Políticas RLS actualizadas';
    RAISE NOTICE '⚙️  Funciones helper creadas';
    RAISE NOTICE '👁️  Vista de permisos disponible';
    RAISE NOTICE '===========================================';
END $$;
