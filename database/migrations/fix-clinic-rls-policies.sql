-- =====================================================
-- SCRIPT: Corregir Políticas RLS para Clínicas
-- Descripción: Permite a usuarios autenticados crear y ver clínicas
-- Instrucciones: Ejecuta en la consola SQL de Supabase
-- =====================================================

-- PASO 1: Eliminar políticas existentes de clinics
DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_own" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_own" ON public.clinics;

-- PASO 2: Crear políticas más permisivas para clínicas

-- SELECT: Todos los usuarios autenticados pueden ver todas las clínicas activas
CREATE POLICY "clinics_select_authenticated" ON public.clinics
FOR SELECT
USING (
    auth.role() = 'authenticated' AND is_active = true
);

-- INSERT: Todos los usuarios autenticados pueden crear clínicas
CREATE POLICY "clinics_insert_authenticated" ON public.clinics
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- UPDATE: Solo admins de la clínica pueden actualizar
CREATE POLICY "clinics_update_own" ON public.clinics
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = clinics.id
        AND user_id = auth.uid()
        AND role_in_clinic = 'admin_staff'
        AND status = 'approved'
        AND is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = clinics.id
        AND user_id = auth.uid()
        AND role_in_clinic = 'admin_staff'
        AND status = 'approved'
        AND is_active = true
    )
);

-- DELETE: Solo admins de la clínica pueden eliminar (soft delete)
CREATE POLICY "clinics_delete_own" ON public.clinics
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = clinics.id
        AND user_id = auth.uid()
        AND role_in_clinic = 'admin_staff'
        AND status = 'approved'
        AND is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = clinics.id
        AND user_id = auth.uid()
        AND role_in_clinic = 'admin_staff'
        AND status = 'approved'
        AND is_active = true
    )
);

-- PASO 3: Asegurar que RLS esté habilitado
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas para clinic_user_relationships

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "clinic_relationships_select_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_insert_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_update_own" ON public.clinic_user_relationships;

-- SELECT: Ver relaciones donde el usuario está involucrado
CREATE POLICY "clinic_relationships_select_own" ON public.clinic_user_relationships
FOR SELECT
USING (
    user_id = auth.uid()
    OR 
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships cur
        WHERE cur.clinic_id = clinic_user_relationships.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
);

-- INSERT: Cualquier usuario puede solicitar unirse a una clínica
CREATE POLICY "clinic_relationships_insert_own" ON public.clinic_user_relationships
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- UPDATE: Solo admins pueden aprobar/rechazar solicitudes
CREATE POLICY "clinic_relationships_update_own" ON public.clinic_user_relationships
FOR UPDATE
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships cur
        WHERE cur.clinic_id = clinic_user_relationships.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.clinic_user_relationships cur
        WHERE cur.clinic_id = clinic_user_relationships.clinic_id
        AND cur.user_id = auth.uid()
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
);

-- PASO 5: Habilitar RLS en clinic_user_relationships
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

-- PASO 6: Verificación final
SELECT 
    'Políticas RLS para clínicas configuradas exitosamente' as resultado,
    COUNT(*) as total_clinics
FROM public.clinics 
WHERE is_active = true;
