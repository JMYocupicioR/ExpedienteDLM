-- =====================================================
-- EMERGENCIA: Corregir RLS que está causando errores 500
-- Descripción: Las funciones RLS están causando errores internos
-- Vamos a usar políticas más simples sin funciones complejas
-- =====================================================

-- PASO 1: DESHABILITAR temporalmente RLS para diagnosticar
ALTER TABLE public.clinic_user_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

DROP POLICY IF EXISTS "clinic_relationships_select_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_insert_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_update_own" ON public.clinic_user_relationships;

DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_own" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_own" ON public.clinics;

-- PASO 3: Eliminar las funciones problemáticas
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid);
DROP FUNCTION IF EXISTS public.get_user_clinic_id();
DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);

-- PASO 4: Crear políticas RLS SIMPLES sin funciones complejas

-- Para CLINICS: Todos pueden ver y crear clínicas
CREATE POLICY "clinics_allow_all_authenticated" ON public.clinics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Para CLINIC_USER_RELATIONSHIPS: Usuarios pueden ver y gestionar sus propias relaciones
CREATE POLICY "clinic_relationships_own_user" ON public.clinic_user_relationships
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Permitir a admins ver todas las relaciones de su clínica
CREATE POLICY "clinic_relationships_admin_access" ON public.clinic_user_relationships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_user_relationships admin_rel
    WHERE admin_rel.clinic_id = clinic_user_relationships.clinic_id
    AND admin_rel.user_id = auth.uid()
    AND admin_rel.role_in_clinic = 'admin_staff'
    AND admin_rel.status = 'approved'
    AND admin_rel.is_active = true
  )
);

-- Para PATIENTS: Solo pacientes de clínicas donde el usuario es miembro
CREATE POLICY "patients_clinic_members" ON public.patients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_user_relationships
    WHERE clinic_id = patients.clinic_id
    AND user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinic_user_relationships
    WHERE clinic_id = patients.clinic_id
    AND user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true
  )
);

-- PASO 5: Habilitar RLS nuevamente
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- PASO 6: Verificación
SELECT 'RLS Emergency Fix Applied Successfully' as resultado;

-- Verificar que las políticas se crearon
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('clinics', 'clinic_user_relationships', 'patients')
AND schemaname = 'public'
ORDER BY tablename, policyname;
