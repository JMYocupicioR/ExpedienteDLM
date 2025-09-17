-- =====================================================
-- SCRIPT MANUAL: Corregir Funciones RLS
-- Instrucciones: Ejecuta este script directamente en la consola SQL de Supabase
-- =====================================================

-- PASO 1: Eliminar funciones existentes que causan conflicto
DROP FUNCTION IF EXISTS public.is_user_in_clinic(uuid);
DROP FUNCTION IF EXISTS public.is_user_in_clinic(check_clinic_id uuid);
DROP FUNCTION IF EXISTS public.is_user_in_clinic(target_clinic_id uuid);
DROP FUNCTION IF EXISTS public.get_user_clinic_id();
DROP FUNCTION IF EXISTS public.check_patient_exists_by_social_security(uuid, text);
DROP FUNCTION IF EXISTS public.check_patient_exists_by_curp(uuid, text);

-- PASO 2: Crear funciones con nombres correctos
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

-- PASO 3: Recrear políticas RLS básicas
DROP POLICY IF EXISTS "patients_select_own_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;

CREATE POLICY "patients_select_own_clinic" ON public.patients
FOR SELECT
USING (
  is_user_in_clinic(clinic_id)
);

CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  is_user_in_clinic(clinic_id)
  OR
  (primary_doctor_id = auth.uid())
);

-- PASO 4: Habilitar RLS en la tabla patients si no está habilitado
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar que las funciones se crearon correctamente
SELECT 'Funciones RLS creadas exitosamente' as resultado;
