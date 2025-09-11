-- =====================================================
-- DEBUG: Diagnóstico de Creación de Pacientes
-- Descripción: Verificar por qué falla la creación de pacientes
-- =====================================================

-- PASO 1: Verificar estructura de la tabla patients
SELECT 'ESTRUCTURA DE LA TABLA PATIENTS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASO 2: Verificar restricciones en la tabla patients
SELECT 'RESTRICCIONES DE LA TABLA PATIENTS:' as info;
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'patients' 
AND table_schema = 'public';

-- PASO 3: Verificar políticas RLS activas en patients
SELECT 'POLÍTICAS RLS EN PATIENTS:' as info;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'patients' 
AND schemaname = 'public';

-- PASO 4: Verificar si RLS está habilitado
SELECT 'ESTADO RLS:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'patients' 
AND schemaname = 'public';

-- PASO 5: Probar inserción manual para identificar el problema
DO $$
DECLARE
    test_user_id uuid;
    test_clinic_id uuid;
BEGIN
    -- Obtener usuario de prueba
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'jmyocupicior@gmail.com' LIMIT 1;  -- CAMBIA EMAIL
    
    -- Obtener clínica del usuario
    SELECT clinic_id INTO test_clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = test_user_id 
    AND status = 'approved' 
    AND is_active = true 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'Usuario no encontrado';
        RETURN;
    END IF;
    
    IF test_clinic_id IS NULL THEN
        RAISE NOTICE 'Usuario no tiene clínica asociada';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Usuario: %, Clínica: %', test_user_id, test_clinic_id;
    
    -- Intentar inserción de prueba
    BEGIN
        INSERT INTO public.patients (
            full_name,
            social_security_number,
            email,
            phone,
            birth_date,
            gender,
            clinic_id,
            primary_doctor_id
        ) VALUES (
            'Paciente de Prueba',
            'TEST123456789',
            'test@ejemplo.com',
            '+52 55 1234 5678',
            '1990-01-01',
            'M',
            test_clinic_id,
            test_user_id
        );
        
        RAISE NOTICE 'ÉXITO: Paciente de prueba creado correctamente';
        
        -- Eliminar el paciente de prueba
        DELETE FROM public.patients WHERE social_security_number = 'TEST123456789';
        RAISE NOTICE 'Paciente de prueba eliminado';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR al crear paciente: % - %', SQLSTATE, SQLERRM;
    END;
    
END $$;

-- PASO 6: Verificar datos de ejemplo en la tabla
SELECT 'PACIENTES EXISTENTES:' as info;
SELECT 
    id,
    full_name,
    social_security_number,
    clinic_id,
    created_at
FROM public.patients 
ORDER BY created_at DESC 
LIMIT 5;
