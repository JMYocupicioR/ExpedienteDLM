-- =====================================================
-- SCRIPT COMPLETO: Eliminar TODAS las dependencias RLS
-- Descripción: Elimina todas las políticas que dependen de funciones RLS
-- y luego recrea un sistema RLS simple que funcione
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas RLS que dependen de is_user_in_clinic

-- Políticas de PATIENTS
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_own_clinic" ON public.patients;

-- Políticas de MEDICAL_RECORDS
DROP POLICY IF EXISTS "medical_records_select_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update_own_clinic" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_delete_own_clinic" ON public.medical_records;

-- Políticas de APPOINTMENTS
DROP POLICY IF EXISTS "appointments_select_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_own_clinic" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_own_clinic" ON public.appointments;

-- Políticas de PRESCRIPTIONS
DROP POLICY IF EXISTS "prescriptions_select_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_insert_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_own_clinic" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_own_clinic" ON public.prescriptions;

-- Políticas de CONSULTATIONS (si existen)
DROP POLICY IF EXISTS "consultations_select_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_delete_own_clinic" ON public.consultations;

-- Políticas de ACTIVITY_LOGS (si existen)
DROP POLICY IF EXISTS "activity_logs_select_own_clinic" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own_clinic" ON public.activity_logs;

-- Políticas de CLINIC_USER_RELATIONSHIPS
DROP POLICY IF EXISTS "clinic_relationships_select_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_insert_own" ON public.clinic_user_relationships;
DROP POLICY IF EXISTS "clinic_relationships_update_own" ON public.clinic_user_relationships;

-- Políticas de CLINICS
DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_authenticated" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_own" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_own" ON public.clinics;

-- PASO 2: Ahora podemos eliminar las funciones problemáticas
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_clinic_id() CASCADE;
DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text) CASCADE;

-- PASO 3: DESHABILITAR RLS temporalmente para evitar errores
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics DISABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas RLS SIMPLES que no usen funciones complejas

-- CLINICS: Permitir acceso completo a usuarios autenticados
CREATE POLICY "clinics_authenticated_access" ON public.clinics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CLINIC_USER_RELATIONSHIPS: Usuarios pueden gestionar sus propias relaciones
CREATE POLICY "clinic_relationships_user_access" ON public.clinic_user_relationships
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Permitir a otros usuarios ver relaciones para solicitudes de acceso
CREATE POLICY "clinic_relationships_public_read" ON public.clinic_user_relationships
FOR SELECT
TO authenticated
USING (true);

-- PATIENTS: Acceso basado en membresía directa (sin función)
CREATE POLICY "patients_clinic_access" ON public.patients
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

-- PASO 5: Políticas para otras tablas (si existen)

-- MEDICAL_RECORDS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records' AND table_schema = 'public') THEN
    CREATE POLICY "medical_records_patient_clinic_access" ON public.medical_records
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.clinic_user_relationships cur ON p.clinic_id = cur.clinic_id
        WHERE p.id = medical_records.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.clinic_user_relationships cur ON p.clinic_id = cur.clinic_id
        WHERE p.id = medical_records.patient_id
        AND cur.user_id = auth.uid()
        AND cur.status = 'approved'
        AND cur.is_active = true
      )
    );
  END IF;
END $$;

-- APPOINTMENTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments' AND table_schema = 'public') THEN
    CREATE POLICY "appointments_clinic_access" ON public.appointments
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
  END IF;
END $$;

-- PRESCRIPTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions' AND table_schema = 'public') THEN
    CREATE POLICY "prescriptions_patient_clinic_access" ON public.prescriptions
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
  END IF;
END $$;

-- CONSULTATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations' AND table_schema = 'public') THEN
    CREATE POLICY "consultations_clinic_access" ON public.consultations
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = consultations.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = consultations.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    );
  END IF;
END $$;

-- ACTIVITY_LOGS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public') THEN
    CREATE POLICY "activity_logs_clinic_access" ON public.activity_logs
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = activity_logs.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.clinic_user_relationships
        WHERE clinic_id = activity_logs.clinic_id
        AND user_id = auth.uid()
        AND status = 'approved'
        AND is_active = true
      )
    );
  END IF;
END $$;

-- PASO 6: Rehabilitar RLS con políticas simples
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records' AND table_schema = 'public') THEN
    ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments' AND table_schema = 'public') THEN
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions' AND table_schema = 'public') THEN
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations' AND table_schema = 'public') THEN
    ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public') THEN
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- PASO 7: Verificación final
SELECT 'RLS CASCADE FIX COMPLETED - All policies recreated with simple logic' as resultado;

-- Mostrar políticas activas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('clinics', 'clinic_user_relationships', 'patients', 'medical_records', 'appointments', 'prescriptions', 'consultations', 'activity_logs')
ORDER BY tablename, policyname;
