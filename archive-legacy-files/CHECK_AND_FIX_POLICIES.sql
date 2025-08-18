-- =====================================================
-- DIAGNOSTICO Y FIX: Políticas de Storage
-- =====================================================

-- PASO 1: Ver todas las políticas actuales de storage
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
    policyname LIKE '%profile%' 
    OR qual::text LIKE '%profile-photos%'
    OR with_check::text LIKE '%profile-photos%'
)
ORDER BY policyname;

-- PASO 2: Eliminar TODAS las políticas relacionadas con profile-photos
DO $$
DECLARE
    pol RECORD;
    count_deleted INT := 0;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Iniciando limpieza de políticas...';
    RAISE NOTICE '====================================';
    
    -- Primero, obtener todas las políticas que mencionan profile-photos
    FOR pol IN 
        SELECT DISTINCT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%profile%' 
            OR COALESCE(qual::text, '') LIKE '%profile-photos%'
            OR COALESCE(with_check::text, '') LIKE '%profile-photos%'
        )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
            count_deleted := count_deleted + 1;
            RAISE NOTICE '✅ Eliminada: %', pol.policyname;
        EXCEPTION 
            WHEN undefined_object THEN
                RAISE NOTICE '⚠️  Ya no existe: %', pol.policyname;
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error al eliminar %: %', pol.policyname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total políticas eliminadas: %', count_deleted;
    RAISE NOTICE '====================================';
END $$;

-- PASO 3: Verificar que no queden políticas
DO $$
DECLARE
    remaining_count INT;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (
        policyname LIKE '%profile%' 
        OR qual::text LIKE '%profile-photos%'
        OR with_check::text LIKE '%profile-photos%'
    );
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Aún quedan % políticas relacionadas con profile-photos', remaining_count;
    ELSE
        RAISE NOTICE '✅ Todas las políticas de profile-photos han sido eliminadas';
    END IF;
END $$;

-- PASO 4: Crear políticas nuevas y simples
-- Solo si no existen
DO $$
BEGIN
    -- Read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'profile_photos_simple_read'
    ) THEN
        CREATE POLICY profile_photos_simple_read
            ON storage.objects
            FOR SELECT
            TO public
            USING (bucket_id = 'profile-photos');
        RAISE NOTICE '✅ Creada política: profile_photos_simple_read';
    END IF;

    -- Write policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'profile_photos_simple_write'
    ) THEN
        CREATE POLICY profile_photos_simple_write
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'profile-photos' 
                AND auth.uid()::text = (string_to_array(name, '/'))[1]
            );
        RAISE NOTICE '✅ Creada política: profile_photos_simple_write';
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'profile_photos_simple_update'
    ) THEN
        CREATE POLICY profile_photos_simple_update
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
        RAISE NOTICE '✅ Creada política: profile_photos_simple_update';
    END IF;

    -- Delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'profile_photos_simple_delete'
    ) THEN
        CREATE POLICY profile_photos_simple_delete
            ON storage.objects
            FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'profile-photos' 
                AND auth.uid()::text = (string_to_array(name, '/'))[1]
            );
        RAISE NOTICE '✅ Creada política: profile_photos_simple_delete';
    END IF;
END $$;

-- PASO 5: Verificación final
SELECT 
    '✅ Políticas actuales para profile-photos:' as status,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE 'profile_photos_simple_%'
ORDER BY policyname;

-- PASO 6: Test de bucket
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'profile-photos'
    ) THEN
        RAISE NOTICE '✅ Bucket profile-photos existe y está configurado';
    ELSE
        RAISE WARNING '❌ Bucket profile-photos NO existe - créalo primero';
    END IF;
END $$;
