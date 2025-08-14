-- =====================================================
-- Configuración completa de Storage con políticas RLS
-- Fecha: 2025-08-10
-- =====================================================

-- ==========================================
-- PARTE 1: CREAR BUCKETS
-- ==========================================

-- 1) Fotos de perfil (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Activos de la clínica (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clinic-assets', 'clinic-assets', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Documentos de pacientes (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-documents', 'patient-documents', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==========================================
-- PARTE 2: POLÍTICAS RLS PARA profile-photos
-- ==========================================

-- Eliminar políticas existentes si las hay
DO $$
BEGIN
  -- Políticas de profile-photos
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_photos_owner_read') THEN
    EXECUTE 'DROP POLICY profile_photos_owner_read ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_photos_owner_write') THEN
    EXECUTE 'DROP POLICY profile_photos_owner_write ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_photos_owner_update') THEN
    EXECUTE 'DROP POLICY profile_photos_owner_update ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'profile_photos_owner_delete') THEN
    EXECUTE 'DROP POLICY profile_photos_owner_delete ON storage.objects';
  END IF;
END $$;

-- Lectura: público (cualquiera puede ver fotos de perfil)
CREATE POLICY profile_photos_owner_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

-- Escritura: solo el propietario en su carpeta
CREATE POLICY profile_photos_owner_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Actualización: solo el propietario
CREATE POLICY profile_photos_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Eliminación: solo el propietario
CREATE POLICY profile_photos_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- ==========================================
-- PARTE 3: POLÍTICAS RLS PARA clinic-assets
-- ==========================================

-- Eliminar políticas existentes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_public_read') THEN
    EXECUTE 'DROP POLICY clinic_assets_public_read ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_write') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_write ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_update') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_update ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'clinic_assets_admin_delete') THEN
    EXECUTE 'DROP POLICY clinic_assets_admin_delete ON storage.objects';
  END IF;
END $$;

-- Lectura: público
CREATE POLICY clinic_assets_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'clinic-assets');

-- Escritura: solo admin de la clínica (evitando recursión)
CREATE POLICY clinic_assets_admin_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND (
      -- Super admin puede todo
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- O es admin de la clínica específica
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- Actualización: mismo criterio
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
          SELECT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- Eliminación: mismo criterio
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
          SELECT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
            AND role_in_clinic = 'admin_staff'
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- ==========================================
-- PARTE 4: POLÍTICAS RLS PARA patient-documents
-- ==========================================

-- Eliminar políticas existentes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'patient_docs_clinic_users') THEN
    EXECUTE 'DROP POLICY patient_docs_clinic_users ON storage.objects';
  END IF;
END $$;

-- Todas las operaciones: solo usuarios de la clínica
CREATE POLICY patient_docs_clinic_users
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- O usuario de la clínica
      (string_to_array(name, '/'))[1] IN (
        WITH user_clinics AS (
          SELECT clinic_id::text
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
          SELECT clinic_id::text
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND is_active = true
        )
        SELECT clinic_id FROM user_clinics
      )
    )
  );

-- ==========================================
-- PARTE 5: VERIFICACIÓN
-- ==========================================

-- Verificar que los buckets existan
DO $$
DECLARE
  bucket_count INT;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE id IN ('profile-photos', 'clinic-assets', 'patient-documents');
  
  IF bucket_count = 3 THEN
    RAISE NOTICE '✅ Los 3 buckets de storage están creados correctamente';
  ELSE
    RAISE WARNING '⚠️ Solo se encontraron % buckets de 3 esperados', bucket_count;
  END IF;
END $$;
