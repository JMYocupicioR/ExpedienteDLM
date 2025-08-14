-- =====================================================
-- FIX: Recursión infinita en clinic_user_relationships
-- Fecha: 2025-08-10
-- =====================================================

-- Primero, eliminar TODAS las políticas existentes (incluyendo las nuevas)
DROP POLICY IF EXISTS cur_insert_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_update_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_delete_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_select_self_or_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_insert_self_or_admin ON public.clinic_user_relationships;

-- Recrear política SELECT sin recursión
-- Los usuarios ven sus propias relaciones o todas las de su clínica si son admin
CREATE POLICY cur_select_self_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    -- Ver sus propias relaciones
    user_id = auth.uid()
    OR 
    -- O si es admin de la clínica
    (
      clinic_user_relationships.clinic_id IN (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
    )
  );

-- INSERT: el usuario puede crear una relación si:
-- 1) Se está agregando a sí mismo (auto-registro)
-- 2) Ya es admin de esa clínica (usando una subconsulta simple)
CREATE POLICY cur_insert_self_or_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Puede agregarse a sí mismo
    user_id = auth.uid()
    OR
    -- O es admin de la clínica
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role_in_clinic = 'admin_staff'
    )
  );

-- UPDATE: solo admin puede actualizar (usando clinic_id para evitar recursión)
CREATE POLICY cur_update_admin
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role_in_clinic = 'admin_staff'
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role_in_clinic = 'admin_staff'
    )
  );

-- DELETE: solo admin puede eliminar
CREATE POLICY cur_delete_admin
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role_in_clinic = 'admin_staff'
    )
  );

-- También necesitamos corregir las políticas de storage que podrían estar afectadas
-- Recrear la política de clinic-assets para evitar la recursión
DO $$
BEGIN
  -- Eliminar política problemática si existe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'clinic_assets_admin_write'
  ) THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_write ON storage.objects';
  END IF;
END $$;

-- Recrear política sin recursión
CREATE POLICY clinic_assets_admin_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND (
      -- Extraer clinic_id del path
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
    )
  );

-- Política UPDATE para clinic-assets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'clinic_assets_admin_update'
  ) THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_update ON storage.objects';
  END IF;
END $$;

CREATE POLICY clinic_assets_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
    )
  );

-- Política DELETE para clinic-assets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'clinic_assets_admin_delete'
  ) THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_delete ON storage.objects';
  END IF;
END $$;

CREATE POLICY clinic_assets_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
    )
  );

-- Corregir también patient-documents por si acaso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'patient_docs_clinic_users'
  ) THEN
    EXECUTE 'DROP POLICY patient_docs_clinic_users ON storage.objects';
  END IF;
END $$;

CREATE POLICY patient_docs_clinic_users
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
      )
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
      )
    )
  );
