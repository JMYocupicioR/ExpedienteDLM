-- =====================================================
-- MIGRACIÓN: Corrección de Permisos para Administradores de Clínica
-- Fecha: 2025-11-25 (Actualizado)
-- Descripción: Esta migración añade una función security definer segura
-- y actualiza políticas RLS para evitar recursión infinita.
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 0: Crear función segura para verificar permisos
-- =====================================================

-- Esta función rompe la recursión infinita al usar SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_clinic_admin_access(target_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM clinic_user_relationships
    WHERE clinic_id = target_clinic_id
      AND user_id = auth.uid()
      AND role_in_clinic IN ('admin_staff', 'director', 'owner', 'super_admin')
      AND status = 'approved'
      AND is_active = true
  );
END;
$$;

-- =====================================================
-- PASO 1: Eliminar políticas anteriores (Idempotencia)
-- =====================================================

DROP POLICY IF EXISTS "clinic_relationships_select_admin" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_update_admin" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_delete_admin" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_insert_request" ON public.clinic_user_relationships;


-- =====================================================
-- PASO 2: Crear nuevas políticas usando la función segura
-- =====================================================

-- POLÍTICA SELECT: Administradores pueden ver todos los miembros de su clínica
CREATE POLICY "clinic_relationships_select_admin" ON public.clinic_user_relationships
FOR SELECT
TO public
USING (
  check_clinic_admin_access(clinic_id)
);

-- POLÍTICA UPDATE: Administradores pueden actualizar miembros (aprobar, desactivar)
CREATE POLICY "clinic_relationships_update_admin" ON public.clinic_user_relationships
FOR UPDATE
TO public
USING (
  check_clinic_admin_access(clinic_id)
)
WITH CHECK (
  check_clinic_admin_access(clinic_id)
);

-- POLÍTICA DELETE: Administradores pueden eliminar miembros
CREATE POLICY "clinic_relationships_delete_admin" ON public.clinic_user_relationships
FOR DELETE
TO public
USING (
  check_clinic_admin_access(clinic_id)
);

-- =====================================================
-- PASO 3: Políticas para Usuarios (Solicitar Unirse)
-- =====================================================

-- POLÍTICA INSERT: Usuarios pueden crear una solicitud para unirse a una clínica
CREATE POLICY "clinic_relationships_insert_request" ON public.clinic_user_relationships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- =====================================================
-- PASO 4: Comentarios
-- =====================================================

COMMENT ON POLICY "clinic_relationships_select_admin" ON public.clinic_user_relationships IS
'Permite a los administradores de la clínica ver todos los registros de personal de su clínica sin recursión';

COMMENT ON POLICY "clinic_relationships_update_admin" ON public.clinic_user_relationships IS
'Permite a los administradores gestionar el estado y roles del personal de su clínica';

COMMENT ON POLICY "clinic_relationships_insert_request" ON public.clinic_user_relationships IS
'Permite a los usuarios solicitar unirse a una clínica';
