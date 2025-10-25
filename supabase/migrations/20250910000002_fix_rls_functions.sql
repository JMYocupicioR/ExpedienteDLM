-- =====================================================
-- FIX RLS FUNCTIONS: Eliminar y recrear funciones RLS
-- Fecha: 2025-09-10
-- Descripción: Este script elimina las funciones RLS existentes
-- y las recrea con los nombres de parámetros correctos
-- =====================================================

-- =====================================================
-- PASO 1 y 2: Eliminar y recrear funciones si las tablas existen
-- =====================================================

DO $$
BEGIN
    -- Solo si clinic_user_relationships existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clinic_user_relationships') THEN
        -- Eliminar función is_user_in_clinic si existe
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid);
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(check_clinic_id uuid);
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(target_clinic_id uuid);

        -- Eliminar función get_user_clinic_id si existe
        DROP FUNCTION IF EXISTS public.get_user_clinic_id();

        -- FUNCIÓN: is_user_in_clinic
        -- Descripción: Verifica si el usuario actual pertenece a una clínica específica
        CREATE FUNCTION public.is_user_in_clinic(target_clinic_id uuid)
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $func$
          SELECT EXISTS (
            SELECT 1
            FROM public.clinic_user_relationships
            WHERE user_id = auth.uid()
              AND clinic_id = target_clinic_id
              AND status = 'approved'
              AND is_active = true
          );
        $func$;

        -- FUNCIÓN: get_user_clinic_id
        -- Descripción: Obtiene el ID de la clínica principal del usuario actual
        CREATE FUNCTION public.get_user_clinic_id()
        RETURNS uuid
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $func$
          SELECT clinic_id
          FROM public.clinic_user_relationships
          WHERE user_id = auth.uid()
            AND status = 'approved'
            AND is_active = true
          LIMIT 1;
        $func$;
    END IF;

    -- Solo si patients existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        -- Eliminar función check_patient_exists_by_social_security si existe
        DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);
        DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text);

        -- FUNCIÓN: check_patient_exists_by_social_security
        -- Descripción: Verifica si existe un paciente con el número de seguridad social
        -- en una clínica específica, respetando RLS
        CREATE FUNCTION public.check_patient_exists_by_social_security(
          p_clinic_id uuid,
          p_social_security_number text
        )
        RETURNS json
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $func$
          SELECT CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.patients
              WHERE clinic_id = p_clinic_id
                AND social_security_number = UPPER(TRIM(p_social_security_number))
                AND social_security_number IS NOT NULL
                AND social_security_number != ''
            ) THEN
              json_build_object(
                'exists', true,
                'patient_id', (
                  SELECT id
                  FROM public.patients
                  WHERE clinic_id = p_clinic_id
                    AND social_security_number = UPPER(TRIM(p_social_security_number))
                  LIMIT 1
                )
              )
            ELSE
              json_build_object('exists', false)
          END;
        $func$;
    END IF;
END $$;

-- =====================================================
-- PASO 3: Recrear políticas RLS que dependen de estas funciones
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        -- Eliminar políticas existentes para recrearlas
        DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
        DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

        -- Política SELECT: Solo ver pacientes de clínicas a las que pertenece el usuario
        CREATE POLICY "patients_select_own_clinic" ON public.patients
        FOR SELECT
        USING (
          is_user_in_clinic(clinic_id)
        );

        -- Política INSERT: Solo crear pacientes en clínicas a las que pertenece el usuario
        CREATE POLICY "patients_insert_policy" ON public.patients
        FOR INSERT
        WITH CHECK (
          -- Opción 1: El usuario ya pertenece a la clínica del paciente
          is_user_in_clinic(clinic_id)
          OR
          -- Opción 2: El usuario es el médico primario y está creando un paciente
          -- en la clínica que está seleccionando para sí mismo
          (primary_doctor_id = auth.uid() AND clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
        );

        -- Política UPDATE: Solo actualizar pacientes de clínicas a las que pertenece el usuario
        CREATE POLICY "patients_update_own_clinic" ON public.patients
        FOR UPDATE
        USING (
          is_user_in_clinic(clinic_id)
        )
        WITH CHECK (
          is_user_in_clinic(clinic_id)
        );

        -- Política DELETE: Solo eliminar pacientes de clínicas a las que pertenece el usuario
        CREATE POLICY "patients_delete_own_clinic" ON public.patients
        FOR DELETE
        USING (
          is_user_in_clinic(clinic_id)
        );
    END IF;
END $$;

-- =====================================================
-- PASO 4: Aplicar políticas a otras tablas si existen
-- =====================================================

-- Medical Records (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records') THEN
    -- Habilitar RLS
    ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
    
    -- Eliminar políticas existentes
    DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
    DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
    DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
    DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;
    
    -- Crear nuevas políticas
    CREATE POLICY "medical_records_select_own_clinic" ON public.medical_records
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = medical_records.patient_id 
          AND is_user_in_clinic(patients.clinic_id)
      )
    );
    
    CREATE POLICY "medical_records_insert_own_clinic" ON public.medical_records
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = medical_records.patient_id 
          AND is_user_in_clinic(patients.clinic_id)
      )
    );
    
    CREATE POLICY "medical_records_update_own_clinic" ON public.medical_records
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = medical_records.patient_id 
          AND is_user_in_clinic(patients.clinic_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = medical_records.patient_id 
          AND is_user_in_clinic(patients.clinic_id)
      )
    );
    
    CREATE POLICY "medical_records_delete_own_clinic" ON public.medical_records
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = medical_records.patient_id 
          AND is_user_in_clinic(patients.clinic_id)
      )
    );
  END IF;
END $$;

-- =====================================================
-- PASO 5: Comentarios de documentación
-- =====================================================

DO $$
BEGIN
    -- Solo agregar comentarios si las funciones existen
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_in_clinic') THEN
        COMMENT ON FUNCTION public.is_user_in_clinic(uuid) IS
        'Función de seguridad RLS: Verifica si el usuario autenticado pertenece a la clínica especificada con estado activo y aprobado.';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_clinic_id') THEN
        COMMENT ON FUNCTION public.get_user_clinic_id() IS
        'Función de seguridad RLS: Obtiene el ID de la clínica principal del usuario autenticado.';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_patient_exists_by_social_security') THEN
        COMMENT ON FUNCTION public.check_patient_exists_by_social_security(uuid, text) IS
        'Función de seguridad: Verifica la existencia de un paciente por número de seguridad social en una clínica específica.';
    END IF;
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE CORRECCIÓN
-- =====================================================
