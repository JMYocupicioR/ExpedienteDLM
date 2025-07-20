/*
  # Fix handle_new_user Error Propagation

  ## Problema
  La función `handle_new_user` actual, que se ejecuta con un trigger después de
  que un usuario se registra, captura cualquier error que ocurra durante la
  creación del perfil y simplemente lo registra. Esto significa que si la
  inserción en la tabla `profiles` falla, el usuario de `auth.users` se crea
  de todos modos, pero sin un perfil correspondiente. El frontend nunca se
  entera del error, lo que lleva a un estado inconsistente y a una mala
  experiencia para el usuario.

  ## Solución
  Esta migración modifica la función `handle_new_user` para eliminar el
  bloque `EXCEPTION WHEN OTHERS`. Al eliminarlo, cualquier error que ocurra
  durante la inserción del perfil hará que la transacción falle por completo.
  El error se propagará hasta la llamada de `supabase.auth.signUp` en el
  frontend, permitiendo que se maneje adecuadamente y se le muestre un
  mensaje de error claro al usuario.
*/

-- Recrear la función sin el bloque de excepción que oculta errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_full_name text;
BEGIN
  -- Obtener email y full_name de forma segura
  user_email := COALESCE(NEW.email, '');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

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
    user_email,
    'doctor', -- Rol por defecto, se actualizará en el cuestionario
    user_full_name,
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

-- Log de finalización de la migración
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: La función handle_new_user ahora propaga errores correctamente.';
END $$;