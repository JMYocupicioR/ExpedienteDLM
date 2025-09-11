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

  -- IMPORTANTE: Primero eliminar todas las políticas que dependen de las funciones
  -- Políticas de patients
  DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
  DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
  DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
  DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
  DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

  -- Políticas de medical_records (si existen)
  DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
  DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
  DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
  DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;

  -- Políticas de appointments (si existen)
  DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
  DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
  DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
  DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;

  -- Políticas de prescriptions (si existen)
  DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
  DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
  DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
  DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;

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
  AS $$
    SELECT EXISTS (
      SELECT 1 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
        AND clinic_id = target_clinic_id 
        AND status = 'approved'
        AND is_active = true
    );
  $$;

  -- =====================================================
  -- FUNCIÓN: get_user_clinic_id
  -- Descripción: Obtiene el ID de la clínica principal del usuario actual
  -- =====================================================

  -- Eliminar la función si existe
  DROP FUNCTION IF EXISTS public.get_user_clinic_id();

  -- Crear la función
  CREATE FUNCTION public.get_user_clinic_id()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT clinic_id 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
      AND status = 'approved'
      AND is_active = true
    LIMIT 1;
  $$;

  -- =====================================================
  -- FUNCIÓN: check_patient_exists_by_social_security (actualizada desde CURP)
  -- Descripción: Verifica si existe un paciente con el número de seguridad social
  -- en una clínica específica, respetando RLS
  -- =====================================================

  -- Eliminar funciones anteriores si existen
  DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);
  DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text);

  -- Crear la función actualizada
  CREATE FUNCTION public.check_patient_exists_by_social_security(
    p_clinic_id uuid,
    p_social_security_number text
  )
  RETURNS json
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
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
  $$;

  -- =====================================================
  -- REFORZAR POLÍTICAS RLS PARA PATIENTS
  -- =====================================================

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

  -- =====================================================
  -- REFORZAR POLÍTICAS RLS PARA MEDICAL_RECORDS
  -- =====================================================

  -- Habilitar RLS en medical_records si no está habilitado
  ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;

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

  -- =====================================================
  -- REFORZAR POLÍTICAS RLS PARA APPOINTMENTS
  -- =====================================================

  -- Habilitar RLS en appointments si no está habilitado
  ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

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

  -- =====================================================
  -- REFORZAR POLÍTICAS RLS PARA PRESCRIPTIONS
  -- =====================================================

  -- Habilitar RLS en prescriptions si no está habilitado
  ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;

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

  -- =====================================================
  -- ACTUALIZAR RESTRICCIÓN UNIQUE PARA SOCIAL_SECURITY_NUMBER
  -- =====================================================

-- Eliminar la restricción antigua de CURP
ALTER TABLE IF EXISTS public.patients DROP CONSTRAINT IF EXISTS unique_clinic_curp;

-- Crear nueva restricción para social_security_number SOLO si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_clinic_social_security' 
    AND table_name = 'patients'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.patients
    ADD CONSTRAINT unique_clinic_social_security
    UNIQUE (clinic_id, social_security_number);
  END IF;
END $$;

  -- =====================================================
  -- COMENTARIOS DE SEGURIDAD
  -- =====================================================

  COMMENT ON FUNCTION public.is_user_in_clinic(uuid) IS 
  'Función de seguridad RLS: Verifica si el usuario autenticado pertenece a la clínica especificada con estado activo y aprobado.';

  COMMENT ON FUNCTION public.get_user_clinic_id() IS 
  'Función de seguridad RLS: Obtiene el ID de la clínica principal del usuario autenticado.';

  COMMENT ON FUNCTION public.check_patient_exists_by_social_security(uuid, text) IS 
  'Función de seguridad: Verifica la existencia de un paciente por número de seguridad social en una clínica específica.';

  -- =====================================================
  -- FIN DEL PARCHE DE SEGURIDAD CRÍTICO
  -- =====================================================
