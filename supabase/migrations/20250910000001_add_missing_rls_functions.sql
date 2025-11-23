-- =====================================================
-- CRITICAL SECURITY FIX: Add Missing RLS Functions
-- Fecha: 2025-09-10
-- Descripción: Las políticas RLS referencian funciones que no existen,
-- lo cual puede causar fallos de seguridad. Este script crea las
-- funciones necesarias para el control de acceso por clínica.
-- =====================================================

-- =====================================================
-- FUNCIÓN: is_user_in_clinic
-- Descripción: Verifica si el usuario actual pertenece a una clínica específica
-- =====================================================

DO $$
BEGIN
    -- IMPORTANTE: Primero eliminar todas las políticas que dependen de las funciones
    -- Solo si las tablas existen
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
        DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'medical_records') THEN
        DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
        DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prescriptions') THEN
        DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;
    END IF;
END $$;

-- Solo crear funciones si las tablas necesarias existen
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clinic_user_relationships') THEN
        -- Ahora sí podemos eliminar las funciones
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid);
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(check_clinic_id uuid);
        DROP FUNCTION IF EXISTS public.is_user_in_clinic(target_clinic_id uuid);

        -- Ahora crear la función con el nombre correcto
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

        -- Eliminar la función get_user_clinic_id si existe
        DROP FUNCTION IF EXISTS public.get_user_clinic_id();

        -- Crear la función get_user_clinic_id
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

    -- Crear función check_patient_exists_by_social_security solo si patients existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        -- Eliminar funciones anteriores si existen
        DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);
        DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text);

        -- Crear la función actualizada (usando curp en lugar de social_security_number)
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
                AND curp = UPPER(TRIM(p_social_security_number))
                AND curp IS NOT NULL
                AND curp != ''
            ) THEN
              json_build_object(
                'exists', true,
                'patient_id', (
                  SELECT id
                  FROM public.patients
                  WHERE clinic_id = p_clinic_id
                    AND curp = UPPER(TRIM(p_social_security_number))
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
-- REFORZAR POLÍTICAS RLS PARA PATIENTS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        -- Eliminar políticas existentes para recrearlas de forma segura
        DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
        DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

        -- Política SELECT: Solo ver pacientes de clínicas a las que pertenece el usuario
        CREATE POLICY "patients_select_own_clinic" ON public.patients
        FOR SELECT
        USING (
          is_user_in_clinic(clinic_id)
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
-- REFORZAR POLÍTICAS RLS PARA MEDICAL_RECORDS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'medical_records') THEN
        -- Habilitar RLS en medical_records si no está habilitado
        ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
        DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;

        -- Solo permitir acceso a registros médicos de pacientes de clínicas del usuario
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
-- REFORZAR POLÍTICAS RLS PARA APPOINTMENTS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
        -- Habilitar RLS en appointments si no está habilitado
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
        DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;

        -- Solo permitir acceso a citas de clínicas del usuario
        CREATE POLICY "appointments_select_own_clinic" ON public.appointments
        FOR SELECT
        USING (
          is_user_in_clinic(clinic_id)
        );

        CREATE POLICY "appointments_insert_own_clinic" ON public.appointments
        FOR INSERT
        WITH CHECK (
          is_user_in_clinic(clinic_id)
        );

        CREATE POLICY "appointments_update_own_clinic" ON public.appointments
        FOR UPDATE
        USING (
          is_user_in_clinic(clinic_id)
        )
        WITH CHECK (
          is_user_in_clinic(clinic_id)
        );

        CREATE POLICY "appointments_delete_own_clinic" ON public.appointments
        FOR DELETE
        USING (
          is_user_in_clinic(clinic_id)
        );
    END IF;
END $$;

-- =====================================================
-- REFORZAR POLÍTICAS RLS PARA PRESCRIPTIONS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prescriptions') THEN
        -- Habilitar RLS en prescriptions si no está habilitado
        ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
        DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;

        -- Solo permitir acceso a recetas de pacientes de clínicas del usuario
        CREATE POLICY "prescriptions_select_own_clinic" ON public.prescriptions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = prescriptions.patient_id
              AND is_user_in_clinic(patients.clinic_id)
          )
        );

        CREATE POLICY "prescriptions_insert_own_clinic" ON public.prescriptions
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = prescriptions.patient_id
              AND is_user_in_clinic(patients.clinic_id)
          )
        );

        CREATE POLICY "prescriptions_update_own_clinic" ON public.prescriptions
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = prescriptions.patient_id
              AND is_user_in_clinic(patients.clinic_id)
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = prescriptions.patient_id
              AND is_user_in_clinic(patients.clinic_id)
          )
        );

        CREATE POLICY "prescriptions_delete_own_clinic" ON public.prescriptions
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = prescriptions.patient_id
              AND is_user_in_clinic(patients.clinic_id)
          )
        );
    END IF;
END $$;

-- =====================================================
-- ACTUALIZAR RESTRICCIÓN UNIQUE PARA SOCIAL_SECURITY_NUMBER
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'patients') THEN
        -- Eliminar la restricción antigua de CURP
        ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS unique_clinic_curp;

        -- Crear nueva restricción para curp SOLO si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'unique_clinic_curp'
          AND table_name = 'patients'
          AND table_schema = 'public'
        ) THEN
          ALTER TABLE public.patients
          ADD CONSTRAINT unique_clinic_curp
          UNIQUE (clinic_id, curp);
        END IF;
    END IF;
END $$;

-- =====================================================
-- COMENTARIOS DE SEGURIDAD
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
-- FIN DEL PARCHE DE SEGURIDAD CRÍTICO
-- =====================================================
