-- =====================================================
-- FIX LIMPIO: Políticas de profile-photos
-- =====================================================

-- PASO 1: Ver políticas actuales (para diagnóstico)
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN qual::text LIKE '%profile-photos%' THEN 'Menciona profile-photos en USING'
        WHEN with_check::text LIKE '%profile-photos%' THEN 'Menciona profile-photos en WITH CHECK'
        ELSE 'Relacionada por nombre'
    END as relacion
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
    policyname LIKE '%profile%' 
    OR qual::text LIKE '%profile-photos%'
    OR with_check::text LIKE '%profile-photos%'
);

-- PASO 2: Eliminar políticas conocidas una por una
DO $$
BEGIN
    -- Lista de políticas comunes que podrían existir
    DECLARE
        policy_names TEXT[] := ARRAY[
            'profile_photos_public_read',
            'profile_photos_owner_read',
            'profile_photos_owner_write',
            'profile_photos_owner_update',
            'profile_photos_owner_delete',
            'profile_photos_simple_read',
            'profile_photos_simple_write',
            'profile_photos_simple_update',
            'profile_photos_simple_delete',
            'Users can upload their own profile photos',
            'Users can update their own profile photos',
            'Users can delete their own profile photos',
            'Public profile photos access',
            'Enable read access for all users',
            'Enable insert for authenticated users only',
            'Enable update for users based on id',
            'Enable delete for users based on id'
        ];
        policy_name TEXT;
    BEGIN
        FOREACH policy_name IN ARRAY policy_names
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
                RAISE NOTICE 'Intentando eliminar: %', policy_name;
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar errores
                NULL;
            END;
        END LOOP;
    END;
END $$;

-- PASO 3: Eliminar cualquier política que contenga 'profile' en el nombre
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname ILIKE '%profile%photo%'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
            RAISE NOTICE '✅ Eliminada: %', pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ No se pudo eliminar: %', pol.policyname;
        END;
    END LOOP;
END $$;

-- PASO 4: Crear políticas nuevas con nombres únicos
BEGIN;

-- Política de lectura pública
CREATE POLICY "pf_read_v1"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'profile-photos');

-- Política de inserción
CREATE POLICY "pf_insert_v1"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'profile-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Política de actualización
CREATE POLICY "pf_update_v1"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'profile-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Política de eliminación
CREATE POLICY "pf_delete_v1"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'profile-photos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

COMMIT;

-- PASO 5: Verificar que las políticas se crearon
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE 'pf_%'
ORDER BY policyname;

-- PASO 6: Verificar el bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'profile-photos';
