-- =====================================================
-- FIX SIMPLE: Solo para profile-photos
-- Políticas simples sin referencias a clinic_user_relationships
-- =====================================================

-- Eliminar TODAS las políticas existentes de profile-photos
DO $$
DECLARE
    pol RECORD;
BEGIN
  -- Buscar y eliminar TODAS las políticas relacionadas con profile-photos
  FOR pol IN 
    SELECT DISTINCT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (
      policyname LIKE 'profile_photos_%' 
      OR policyname LIKE 'profile-photos_%'
      OR policyname LIKE '%profile%photo%'
      OR (bucket_id = 'profile-photos' AND pol::text LIKE '%profile-photos%')
    )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
      RAISE NOTICE 'Eliminada política: %', pol.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo eliminar: %', pol.policyname;
    END;
  END LOOP;
  
  -- Lista específica de políticas conocidas que podrían existir
  EXECUTE 'DROP POLICY IF EXISTS profile_photos_public_read ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS profile_photos_owner_read ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS profile_photos_owner_write ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS profile_photos_owner_update ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS profile_photos_owner_delete ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Public profile photos access" ON storage.objects';
END $$;

-- Crear políticas SIMPLES para profile-photos (sin referencias a otras tablas)

-- Lectura: público
CREATE POLICY profile_photos_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

-- Escritura: solo el dueño en su carpeta
CREATE POLICY profile_photos_owner_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Actualización: solo el dueño
CREATE POLICY profile_photos_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Eliminación: solo el dueño
CREATE POLICY profile_photos_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Verificación
DO $$
DECLARE
    pol_count INT;
BEGIN
    SELECT COUNT(*) INTO pol_count
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE 'profile_photos_%';
    
    RAISE NOTICE '✅ Creadas % políticas simples para profile-photos', pol_count;
END $$;
