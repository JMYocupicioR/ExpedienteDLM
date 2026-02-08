-- =====================================================
-- AUTO-CREATE PERSONAL CLINIC ON DOCTOR REGISTRATION
-- Fecha: 2026-02-08
-- Descripción: Garantiza que cada médico tenga su propia
-- clínica desde el momento del registro
-- =====================================================

-- =====================================================
-- PASO 1: Actualizar Trigger de Creación de Usuario
-- =====================================================

-- Eliminar trigger y función existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- FUNCIÓN MEJORADA: Crear perfil Y clínica personal automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_clinic_id UUID;
  v_clinic_name TEXT;
BEGIN
  -- Obtener nombre completo del usuario
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Generar nombre de clínica personal
  v_clinic_name := 'Consultorio de ' || v_full_name;
  
  -- 1. Crear clínica personal
  INSERT INTO public.clinics (name, type, is_active, created_at, updated_at)
  VALUES (v_clinic_name, 'consultorio_personal', true, NOW(), NOW())
  RETURNING id INTO v_clinic_id;
  
  -- 2. Crear perfil con clinic_id asignado
  INSERT INTO public.profiles (id, email, full_name, role, clinic_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    'doctor',
    v_clinic_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    clinic_id = v_clinic_id,
    updated_at = NOW();
  
  -- 3. Crear relación clinic-user como owner
  INSERT INTO public.clinic_user_relationships (
    clinic_id,
    user_id,
    role_in_clinic,
    status,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_clinic_id,
    NEW.id,
    'owner',
    'approved',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (clinic_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Crea automáticamente una clínica personal y perfil completo para cada nuevo usuario registrado.';

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 2: Migrar Médicos Existentes Sin Clínica
-- =====================================================

DO $$
DECLARE
  v_profile RECORD;
  v_clinic_id UUID;
  v_clinic_name TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Iterar sobre médicos sin clínica
  FOR v_profile IN 
    SELECT id, full_name, email 
    FROM public.profiles 
    WHERE clinic_id IS NULL AND role = 'doctor'
  LOOP
    -- Generar nombre de clínica personal
    v_clinic_name := 'Consultorio de ' || COALESCE(v_profile.full_name, split_part(v_profile.email, '@', 1));
    
    -- Crear clínica personal
    INSERT INTO public.clinics (name, type, is_active, created_at, updated_at)
    VALUES (v_clinic_name, 'consultorio_personal', true, NOW(), NOW())
    RETURNING id INTO v_clinic_id;
    
    -- Actualizar perfil con clinic_id
    UPDATE public.profiles
    SET clinic_id = v_clinic_id,
        updated_at = NOW()
    WHERE id = v_profile.id;
    
    -- Crear relación como owner
    INSERT INTO public.clinic_user_relationships (
      clinic_id,
      user_id,
      role_in_clinic,
      status,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      v_clinic_id,
      v_profile.id,
      'owner',
      'approved',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (clinic_id, user_id) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Log de migración
  RAISE NOTICE 'Clínicas personales creadas para % médicos', v_count;
END $$;

-- =====================================================
-- PASO 3: Hacer clinic_id NOT NULL en profiles
-- =====================================================

-- Solo aplicar después de migrar todos los registros
-- Verificar primero que no hay médicos sin clínica
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.profiles
  WHERE clinic_id IS NULL AND role = 'doctor';
  
  IF v_null_count = 0 THEN
    -- Seguro hacer NOT NULL
    ALTER TABLE public.profiles
    ALTER COLUMN clinic_id SET NOT NULL;
    
    RAISE NOTICE 'Constraint NOT NULL aplicado exitosamente a profiles.clinic_id';
  ELSE
    RAISE WARNING 'Todavía hay % médicos sin clinic_id, no se aplicó constraint NOT NULL', v_null_count;
  END IF;
END $$;

-- =====================================================
-- PASO 4: Simplificar Políticas RLS de Patients
-- =====================================================

-- Ahora que clinic_id siempre existe, simplificamos las políticas
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;

CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  -- Opción 1: Usuario pertenece a la clínica del paciente
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Opción 2: Médico crea paciente en su propia clínica
  (primary_doctor_id = auth.uid() AND 
   clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);

COMMENT ON POLICY "patients_insert_policy" ON public.patients IS
'Permite crear pacientes en clínicas autorizadas o en la clínica propia del médico.';

-- Actualizar política SELECT para incluir pacientes de la clínica propia
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;

CREATE POLICY "patients_select_policy" ON public.patients
FOR SELECT
USING (
  -- Ver pacientes de clínicas donde el usuario está registrado
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  -- Ver pacientes de la clínica propia
  (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  OR
  -- Ver pacientes donde es el médico primario
  (primary_doctor_id = auth.uid())
);

COMMENT ON POLICY "patients_select_policy" ON public.patients IS
'Permite ver pacientes de clínicas autorizadas, clínica propia, o donde el usuario es el médico primario.';

-- Actualizar política UPDATE
DROP POLICY IF EXISTS "patients_update_policy" ON public.patients;

CREATE POLICY "patients_update_policy" ON public.patients
FOR UPDATE
USING (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  OR
  (primary_doctor_id = auth.uid())
)
WITH CHECK (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  OR
  (primary_doctor_id = auth.uid())
);

COMMENT ON POLICY "patients_update_policy" ON public.patients IS
'Permite actualizar pacientes de clínicas autorizadas, clínica propia, o propios.';

-- Actualizar política DELETE
DROP POLICY IF EXISTS "patients_delete_policy" ON public.patients;

CREATE POLICY "patients_delete_policy" ON public.patients
FOR DELETE
USING (
  (clinic_id IS NOT NULL AND is_user_in_clinic(clinic_id))
  OR
  (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  OR
  (primary_doctor_id = auth.uid())
);

COMMENT ON POLICY "patients_delete_policy" ON public.patients IS
'Permite eliminar pacientes de clínicas autorizadas, clínica propia, o propios.';

-- =====================================================
-- PASO 5: Actualizar Comentarios de Documentación
-- =====================================================

COMMENT ON COLUMN public.profiles.clinic_id IS
'ID de la clínica a la que pertenece el usuario. Cada médico tiene su propia clínica automáticamente creada al registrarse.';

COMMENT ON COLUMN public.clinics.type IS
'Tipo de clínica. Valores: clinic (clínica multi-doctor), consultorio_personal (consultorio individual del médico), hospital, other.';

-- =====================================================
-- PASO 6: Queries de Verificación
-- =====================================================

-- Verificar que no hay médicos sin clínica
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.profiles
  WHERE clinic_id IS NULL AND role = 'doctor';
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ Verificación exitosa: Todos los médicos tienen clínica asignada';
  ELSE
    RAISE WARNING '⚠️ Advertencia: % médicos sin clínica encontrados', v_count;
  END IF;
END $$;

-- Mostrar estadísticas de clínicas personales
DO $$
DECLARE
  v_total_personal INTEGER;
  v_total_doctors INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_personal
  FROM public.clinics
  WHERE type = 'consultorio_personal';
  
  SELECT COUNT(*) INTO v_total_doctors
  FROM public.profiles
  WHERE role = 'doctor';
  
  RAISE NOTICE 'Clínicas personales creadas: %', v_total_personal;
  RAISE NOTICE 'Total de médicos: %', v_total_doctors;
END $$;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
