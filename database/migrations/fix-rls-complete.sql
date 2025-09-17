-- =====================================================
-- SCRIPT COMPLETO: Corregir Funciones RLS y Políticas
-- Instrucciones: Ejecuta este script directamente en la consola SQL de Supabase
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas RLS que dependen de las funciones
-- Esto debe hacerse ANTES de eliminar las funciones

-- Políticas de patients
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

-- Políticas de medical_records
DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;

-- Políticas de appointments
DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;

-- Políticas de prescriptions
DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;

-- PASO 2: Ahora podemos eliminar las funciones sin problemas
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid);
DROP FUNCTION IF EXISTS public.is_user_in_clinic(check_clinic_id uuid);
DROP FUNCTION IF EXISTS public.is_user_in_clinic(target_clinic_id uuid);
DROP FUNCTION IF EXISTS public.get_user_clinic_id();
DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);
DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text);

-- PASO 3: Recrear las funciones con los nombres correctos
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

-- PASO 4: Recrear las políticas RLS para PATIENTS
CREATE POLICY "patients_select_own_clinic" ON public.patients
FOR SELECT
USING (
  is_user_in_clinic(clinic_id)
);

CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  -- Opción 1: El usuario pertenece a la clínica
  is_user_in_clinic(clinic_id)
  OR
  -- Opción 2: El usuario es el médico primario
  (primary_doctor_id = auth.uid())
);

CREATE POLICY "patients_update_own_clinic" ON public.patients
FOR UPDATE
USING (
  is_user_in_clinic(clinic_id)
)
WITH CHECK (
  is_user_in_clinic(clinic_id)
);

CREATE POLICY "patients_delete_own_clinic" ON public.patients
FOR DELETE
USING (
  is_user_in_clinic(clinic_id)
);

-- PASO 5: Recrear políticas RLS para MEDICAL_RECORDS (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_records') THEN
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

-- PASO 6: Recrear políticas RLS para APPOINTMENTS (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
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

-- PASO 7: Recrear políticas RLS para PRESCRIPTIONS (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prescriptions') THEN
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

-- PASO 8: Asegurar que RLS esté habilitado en todas las tablas
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medical_records') THEN
    ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prescriptions') THEN
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- PASO 9: Agregar comentarios de documentación
COMMENT ON FUNCTION public.is_user_in_clinic(uuid) IS 
'Función de seguridad RLS: Verifica si el usuario autenticado pertenece a la clínica especificada con estado activo y aprobado.';

COMMENT ON FUNCTION public.get_user_clinic_id() IS 
'Función de seguridad RLS: Obtiene el ID de la clínica principal del usuario autenticado.';

COMMENT ON FUNCTION public.check_patient_exists_by_social_security(uuid, text) IS 
'Función de seguridad: Verifica la existencia de un paciente por número de seguridad social en una clínica específica.';

-- PASO 10: Actualizar restricción UNIQUE para social_security_number
-- Eliminar la restricción antigua de CURP si existe
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

-- PASO 11: Verificación final
SELECT 'RLS Functions y Políticas recreadas exitosamente' as resultado;

-- Mostrar las funciones creadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_user_in_clinic', 'get_user_clinic_id', 'check_patient_exists_by_social_security')
ORDER BY routine_name;
