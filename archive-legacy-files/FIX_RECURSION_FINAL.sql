-- =====================================================
-- FIX DEFINITIVO: Recursión infinita en clinic_user_relationships
-- Solución usando una función helper para evitar recursión
-- =====================================================

-- Paso 1: Crear función helper que no causa recursión
CREATE OR REPLACE FUNCTION public.user_is_clinic_admin(check_clinic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = check_clinic_id
      AND is_active = true
      AND role_in_clinic = 'admin_staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para obtener las clínicas del usuario
CREATE OR REPLACE FUNCTION public.get_user_clinic_ids()
RETURNS TABLE(clinic_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cur.clinic_id
  FROM public.clinic_user_relationships cur
  WHERE cur.user_id = auth.uid()
    AND cur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Paso 2: Eliminar TODAS las políticas existentes
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Eliminar políticas de clinic_user_relationships
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'clinic_user_relationships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinic_user_relationships', pol.policyname);
        RAISE NOTICE 'Eliminada política: %', pol.policyname;
    END LOOP;
    
    -- Eliminar políticas de storage problemáticas
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname IN (
            'clinic_assets_admin_write',
            'clinic_assets_admin_update', 
            'clinic_assets_admin_delete',
            'patient_docs_clinic_users'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Eliminada política storage: %', pol.policyname;
    END LOOP;
END $$;

-- Paso 3: Recrear políticas de clinic_user_relationships SIN recursión

-- Super admin tiene acceso total
CREATE POLICY cur_super_admin_all
  ON public.clinic_user_relationships
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role = 'super_admin'
    )
  );

-- SELECT: ver propias relaciones o todas si es admin
CREATE POLICY cur_select_own_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR 
    public.user_is_clinic_admin(clinic_id)
  );

-- INSERT: auto-registro o admin de clínica
CREATE POLICY cur_insert_own_or_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR 
    public.user_is_clinic_admin(clinic_id)
  );

-- UPDATE: solo admin
CREATE POLICY cur_update_admin_only
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (public.user_is_clinic_admin(clinic_id))
  WITH CHECK (public.user_is_clinic_admin(clinic_id));

-- DELETE: solo admin
CREATE POLICY cur_delete_admin_only
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (public.user_is_clinic_admin(clinic_id));

-- Paso 4: Recrear políticas de storage usando las funciones

-- profile-photos: verificar que existan primero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'profile_photos_owner_write'
  ) THEN
    -- Solo el propietario puede escribir
    CREATE POLICY profile_photos_owner_write
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile-photos' 
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'profile_photos_owner_update'
  ) THEN
    CREATE POLICY profile_photos_owner_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'profile-photos' 
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'profile_photos_owner_delete'
  ) THEN
    CREATE POLICY profile_photos_owner_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'profile-photos' 
        AND (string_to_array(name, '/'))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- clinic-assets: usando función helper
CREATE POLICY clinic_assets_admin_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
      OR
      public.user_is_clinic_admin((string_to_array(name, '/'))[1]::uuid)
    )
  );

CREATE POLICY clinic_assets_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
      OR
      public.user_is_clinic_admin((string_to_array(name, '/'))[1]::uuid)
    )
  );

CREATE POLICY clinic_assets_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
      OR
      public.user_is_clinic_admin((string_to_array(name, '/'))[1]::uuid)
    )
  );

-- patient-documents: usando función helper
CREATE POLICY patient_docs_clinic_users
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
      OR
      (string_to_array(name, '/'))[1]::uuid IN (SELECT clinic_id FROM public.get_user_clinic_ids())
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
      OR
      (string_to_array(name, '/'))[1]::uuid IN (SELECT clinic_id FROM public.get_user_clinic_ids())
    )
  );

-- Paso 5: Verificación
DO $$
DECLARE
    pol_count INT;
    func_count INT;
BEGIN
    -- Contar políticas
    SELECT COUNT(*) INTO pol_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clinic_user_relationships';
    
    -- Contar funciones helper
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('user_is_clinic_admin', 'get_user_clinic_ids');
    
    RAISE NOTICE '✅ Creadas % políticas para clinic_user_relationships', pol_count;
    RAISE NOTICE '✅ Creadas % funciones helper', func_count;
    RAISE NOTICE '✅ Sistema de políticas actualizado sin recursión';
END $$;
