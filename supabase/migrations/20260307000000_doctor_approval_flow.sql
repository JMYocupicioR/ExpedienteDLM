-- =====================================================
-- DOCTOR APPROVAL FLOW & MANUAL CLINIC GENERATION
-- Fecha: 2026-03-07
-- Descripción: Evita la creación automática de clínicas
-- y requiere aprobación manual por parte del super admin
-- =====================================================

-- =====================================================
-- PASO 1: Asegurar que clinic_id es opcional
-- =====================================================
-- En caso de que se haya aplicado NOT NULL previamente
ALTER TABLE public.profiles ALTER COLUMN clinic_id DROP NOT NULL;

-- =====================================================
-- PASO 2: Actualizar Trigger de Creación de Usuario
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT := 'doctor';
BEGIN
  -- Obtener nombre completo del usuario
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Si el usuario fue creado por el sistema como paciente, el trigger a veces no maneja roles personalizados, 
  -- pero en este caso asumimos que el rol predeterminado es doctor si viene del registro normal
  
  -- Crear perfil SIN clinic_id asignado y con is_active = false (pendiente de aprobacion)
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    clinic_id, 
    is_active,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    NULL,
    false, -- Requiere aprobación
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  
  -- Ya no creamos la clinica ni la relacion aqui
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Crea un perfil para cada nuevo usuario registrado. Los doctores inician inactivos y sin clínica, requiriendo aprobación del super admin.';


-- =====================================================
-- PASO 3: RPC para solicitar acceso (Doctor)
-- =====================================================

CREATE OR REPLACE FUNCTION public.request_doctor_access()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo usuarios autenticados
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  UPDATE public.profiles
  SET 
    additional_info = COALESCE(additional_info, '{}'::jsonb) || '{"access_requested": true}'::jsonb,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_doctor_access() TO authenticated;

COMMENT ON FUNCTION public.request_doctor_access() IS
'Permite a un doctor sin clínica solicitar acceso a la plataforma (marca access_requested en true).';


-- =====================================================
-- PASO 4: RPC para aprobar doctor (Super Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION public.approve_doctor_account(p_doctor_id UUID)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_doctor_record RECORD;
  v_clinic_id UUID;
  v_clinic_name TEXT;
BEGIN
  -- Verificar permisos (debe ser super_admin)
  SELECT (role = 'super_admin') INTO v_is_super_admin 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios de super administrador';
  END IF;

  -- Obtener información del doctor
  SELECT * INTO v_doctor_record
  FROM public.profiles
  WHERE id = p_doctor_id AND role = 'doctor';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctor no encontrado o no tiene el rol correcto.';
  END IF;

  IF v_doctor_record.clinic_id IS NOT NULL THEN
    RAISE EXCEPTION 'El doctor ya tiene una clínica asignada.';
  END IF;

  -- 1. Generar clínica personal
  v_clinic_name := 'Consultorio de ' || COALESCE(v_doctor_record.full_name, split_part(v_doctor_record.email, '@', 1));
  
  INSERT INTO public.clinics (name, type, is_active, created_at, updated_at)
  VALUES (v_clinic_name, 'consultorio_personal', true, NOW(), NOW())
  RETURNING id INTO v_clinic_id;

  -- 2. Actualizar perfil del doctor (Activo y con clinic_id)
  UPDATE public.profiles
  SET 
    is_active = true,
    clinic_id = v_clinic_id,
    additional_info = additional_info - 'access_requested', -- Remover la bandera
    updated_at = NOW()
  WHERE id = p_doctor_id;

  -- 3. Crear relación clinic-user como owner
  INSERT INTO public.clinic_user_relationships (
    clinic_id,
    user_id,
    role_in_clinic,
    status,
    is_active,
    approved_by,
    approved_at,
    created_at,
    updated_at
  )
  VALUES (
    v_clinic_id,
    p_doctor_id,
    'owner',
    'approved',
    true,
    auth.uid(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_doctor_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.approve_doctor_account(UUID) IS
'Permite a un super administrador aprobar a un doctor, activando su cuenta y creando su clínica personal.';
