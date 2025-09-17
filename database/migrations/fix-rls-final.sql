-- =====================================================
-- SCRIPT FINAL: RLS Fix con Verificación de Columnas
-- Descripción: Elimina todas las dependencias y crea políticas
-- solo para tablas que realmente existen y tienen las columnas correctas
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas RLS existentes
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;

DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;

DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;

DROP POLICY IF EXISTS "consultations_select_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_delete_own_clinic" ON public.consultations;

DROP POLICY IF EXISTS "activity_logs_select_own_clinic" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own_clinic" ON public.activity_logs;

DROP POLICY IF EXISTS "clinic_relationships_select_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_insert_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_update_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_user_access" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_public_read" ON public.clinic_user_relationships;

DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_own" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_own" ON public.clinics;
DROP POLICY IF EXISTS "clinics_authenticated_access" ON public.clinics;

-- PASO 2: Eliminar funciones problemáticas con CASCADE
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_clinic_id() CASCADE;
DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text) CASCADE;

-- PASO 3: DESHABILITAR RLS en todas las tablas
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar estructura de tablas
SELECT 'VERIFICANDO ESTRUCTURA DE TABLAS:' as info;

-- Mostrar columnas de tablas principales
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('consultations', 'appointments', 'prescriptions', 'medical_records', 'activity_logs')
AND column_name LIKE '%clinic%'
ORDER BY table_name, column_name;

-- PASO 5: Crear políticas MUY SIMPLES solo para tablas críticas

-- CLINICS: Acceso completo para usuarios autenticados
CREATE POLICY "clinics_full_access" ON public.clinics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CLINIC_USER_RELATIONSHIPS: Usuarios ven sus propias relaciones + acceso público de lectura
CREATE POLICY "relationships_own_access" ON public.clinic_user_relationships
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "relationships_read_access" ON public.clinic_user_relationships
FOR SELECT
TO authenticated
USING (true);

-- PATIENTS: Solo para usuarios con relación aprobada en la clínica
CREATE POLICY "patients_simple_access" ON public.patients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clinic_user_relationships
    WHERE clinic_id = patients.clinic_id
    AND user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinic_user_relationships
    WHERE clinic_id = patients.clinic_id
    AND user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true
  )
);

-- PASO 6: Habilitar RLS solo en tablas críticas
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- PASO 7: Para otras tablas, crear políticas solo si tienen clinic_id

-- APPOINTMENTS (verificar si tiene clinic_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND table_schema = 'public' 
    AND column_name = 'clinic_id'
  ) THEN
    CREATE POLICY "appointments_simple_access" ON public.appointments
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = appointments.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = appointments.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    );
    
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Appointments RLS enabled';
  ELSE
    RAISE NOTICE 'Appointments table does not have clinic_id column';
  END IF;
END $$;

-- PRESCRIPTIONS (verificar estructura)
DO $$
BEGIN
  -- Verificar si prescriptions tiene clinic_id o patient_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' 
    AND table_schema = 'public' 
    AND column_name = 'clinic_id'
  ) THEN
    -- Usar clinic_id directamente
    CREATE POLICY "prescriptions_clinic_access" ON public.prescriptions
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = prescriptions.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = prescriptions.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    );
    
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Prescriptions RLS enabled with clinic_id';
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' 
    AND table_schema = 'public' 
    AND column_name = 'patient_id'
  ) THEN
    -- Usar patient_id para acceder via patients.clinic_id
    CREATE POLICY "prescriptions_patient_access" ON public.prescriptions
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.clinic_user_relationships cur ON p.clinic_id = cur.clinic_id
        WHERE p.id = prescriptions.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.clinic_user_relationships cur ON p.clinic_id = cur.clinic_id
        WHERE p.id = prescriptions.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
      )
    );
    
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Prescriptions RLS enabled with patient_id';
  ELSE
    RAISE NOTICE 'Prescriptions table structure unknown - skipping RLS';
  END IF;
END $$;

-- PASO 8: Verificación final
SELECT 'RLS CASCADE FIX COMPLETED SUCCESSFULLY' as resultado;

-- Mostrar solo las políticas que se crearon exitosamente
SELECT 
    'Políticas RLS activas:' as info,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
