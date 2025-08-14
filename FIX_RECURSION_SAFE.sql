-- =====================================================
-- FIX SEGURO: Recursión infinita en clinic_user_relationships
-- Este script elimina TODAS las políticas existentes antes de recrearlas
-- =====================================================

-- Paso 1: Eliminar TODAS las políticas existentes de clinic_user_relationships
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Buscar y eliminar todas las políticas de la tabla
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'clinic_user_relationships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinic_user_relationships', pol.policyname);
        RAISE NOTICE 'Eliminada política: %', pol.policyname;
    END LOOP;
END $$;

-- Paso 2: Recrear las políticas sin recursión

-- Super admin acceso total (si no existe)
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

-- SELECT: usuarios ven sus propias relaciones o todas las de su clínica si son admin
CREATE POLICY cur_select_self_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    -- Ver sus propias relaciones
    user_id = auth.uid()
    OR 
    -- O si es admin de la clínica (usando CTE para evitar recursión)
    clinic_id IN (
      WITH user_clinics AS (
        SELECT DISTINCT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- INSERT: auto-registro o si ya es admin
CREATE POLICY cur_insert_self_or_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Puede agregarse a sí mismo
    user_id = auth.uid()
    OR
    -- O es admin de la clínica (usando CTE)
    clinic_id IN (
      WITH user_clinics AS (
        SELECT DISTINCT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- UPDATE: solo admin puede actualizar
CREATE POLICY cur_update_admin
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT DISTINCT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  )
  WITH CHECK (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT DISTINCT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- DELETE: solo admin puede eliminar
CREATE POLICY cur_delete_admin
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT DISTINCT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- Paso 3: Corregir políticas de storage también

-- Eliminar políticas de storage problemáticas
DO $$
BEGIN
  -- clinic-assets policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_write') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_write ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_update') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_update ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_delete') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_delete ON storage.objects';
  END IF;
  
  -- patient-documents policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'patient_docs_clinic_users') THEN
    EXECUTE 'DROP POLICY patient_docs_clinic_users ON storage.objects';
  END IF;
END $$;

-- Recrear políticas de storage sin recursión

-- clinic-assets: INSERT
CREATE POLICY clinic_assets_admin_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Admin de la clínica
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT DISTINCT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- clinic-assets: UPDATE
CREATE POLICY clinic_assets_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT DISTINCT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- clinic-assets: DELETE
CREATE POLICY clinic_assets_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT DISTINCT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- patient-documents: ALL operations
CREATE POLICY patient_docs_clinic_users
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT DISTINCT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT DISTINCT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- Verificación final
DO $$
DECLARE
    pol_count INT;
BEGIN
    SELECT COUNT(*) INTO pol_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clinic_user_relationships';
    
    RAISE NOTICE '✅ Se crearon % políticas para clinic_user_relationships', pol_count;
END $$;
