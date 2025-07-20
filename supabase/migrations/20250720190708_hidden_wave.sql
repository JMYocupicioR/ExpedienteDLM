/*
  MIGRACIÓN 1: CORREGIR PROPAGACIÓN DE ERRORES DEL TRIGGER

  - Problema: La función `handle_new_user` ocultaba errores de inserción de perfiles,
    llevando a usuarios sin perfil en la base de datos.
  - Solución: Se elimina el bloque de excepción para que cualquier error durante la
    creación del perfil falle la transacción completa y se notifique al frontend.
*/

-- Recrear la función sin el bloque de excepción que oculta errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Usar INSERT ... ON CONFLICT para manejar duplicados potenciales
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    created_at,
    updated_at,
    prescription_style
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'doctor', -- Rol por defecto, se actualizará en el cuestionario
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW(),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW()
  WHERE profiles.full_name = '' OR profiles.full_name IS NULL;

  -- Devolver NEW para que el trigger continúe
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN 1 COMPLETADA: La función handle_new_user ahora propaga errores correctamente.';
END $$;