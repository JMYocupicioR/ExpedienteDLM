-- =====================================================
-- PATIENT ROLE FIX: handle_new_user respeta metadata
-- Fecha: 2026-03-07
-- Descripción: Actualiza el trigger para leer el rol
-- de los metadatos de auth.users y asignar 'patient'
-- cuando corresponda. Pacientes se activan automáticamente.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- Obtener nombre completo del usuario
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Leer rol de los metadatos; default 'doctor' si no existe
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'doctor');
  
  -- Validar que el rol sea uno permitido
  IF v_role NOT IN ('doctor', 'patient', 'administrator', 'super_admin') THEN
    v_role := 'doctor';
  END IF;
  
  -- Pacientes se activan automáticamente; doctores requieren aprobación
  v_is_active := (v_role = 'patient');
  
  -- Crear perfil
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
    v_is_active,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Crea un perfil para cada nuevo usuario. Lee el rol de los metadatos (patient/doctor). Pacientes se activan automáticamente; doctores requieren aprobación del super admin.';
