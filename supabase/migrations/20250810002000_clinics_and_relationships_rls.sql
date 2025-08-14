-- =====================================================
-- RLS para clinics y clinic_user_relationships
-- Fecha: 2025-08-10
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;

-- =====================================
-- Policies para clinics
-- =====================================

-- SELECT: permitir a autenticados listar clínicas (para flujo de unión a clínica)
CREATE POLICY clinics_select_all
  ON public.clinics
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: permitir a autenticados crear clínicas (necesario en registro)
CREATE POLICY clinics_insert_authenticated
  ON public.clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: solo admin_staff de esa clínica o super_admin
CREATE POLICY clinics_update_admin
  ON public.clinics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.role_in_clinic = 'admin_staff'
        AND r.clinic_id = clinics.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.role_in_clinic = 'admin_staff'
        AND r.clinic_id = clinics.id
    )
  );

-- DELETE: mismos criterios que UPDATE
CREATE POLICY clinics_delete_admin
  ON public.clinics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.role_in_clinic = 'admin_staff'
        AND r.clinic_id = clinics.id
    )
  );

-- =====================================
-- Policies para clinic_user_relationships
-- =====================================

-- Super admin acceso total
CREATE POLICY cur_super_admin_all
  ON public.clinic_user_relationships
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- SELECT: el usuario puede ver sus propias relaciones; admin_staff puede ver todas las de su clínica
CREATE POLICY cur_select_self_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r2
      WHERE r2.user_id = auth.uid()
        AND r2.is_active = true
        AND r2.role_in_clinic = 'admin_staff'
        AND r2.clinic_id = clinic_user_relationships.clinic_id
    )
  );

-- INSERT: admin_staff puede crear relaciones en su clínica
CREATE POLICY cur_insert_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r2
      WHERE r2.user_id = auth.uid()
        AND r2.is_active = true
        AND r2.role_in_clinic = 'admin_staff'
        AND r2.clinic_id = clinic_user_relationships.clinic_id
    )
  );

-- UPDATE: admin_staff puede actualizar relaciones de su clínica
CREATE POLICY cur_update_admin
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r2
      WHERE r2.user_id = auth.uid()
        AND r2.is_active = true
        AND r2.role_in_clinic = 'admin_staff'
        AND r2.clinic_id = clinic_user_relationships.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r2
      WHERE r2.user_id = auth.uid()
        AND r2.is_active = true
        AND r2.role_in_clinic = 'admin_staff'
        AND r2.clinic_id = clinic_user_relationships.clinic_id
    )
  );

-- DELETE: admin_staff puede eliminar relaciones de su clínica
CREATE POLICY cur_delete_admin
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r2
      WHERE r2.user_id = auth.uid()
        AND r2.is_active = true
        AND r2.role_in_clinic = 'admin_staff'
        AND r2.clinic_id = clinic_user_relationships.clinic_id
    )
  );


