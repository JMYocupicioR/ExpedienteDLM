-- =====================================================
-- FIX: Trigger de sincronización de nombres de pacientes
-- Fecha: 2025-11-22
-- Descripción: Corrige el trigger para que funcione correctamente
-- cuando se inserta solo con full_name sin first_name/last_name
-- =====================================================

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_sync_patient_names ON public.patients;

-- Actualizar función de trigger para manejar correctamente la inserción con solo full_name
-- Esta versión primero inicializa todos los campos con valores predeterminados
-- y luego procesa full_name si existe
CREATE OR REPLACE FUNCTION public.sync_patient_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inicializar campos con valores predeterminados si son NULL
  NEW.first_name := COALESCE(NEW.first_name, '');
  NEW.last_name := COALESCE(NEW.last_name, '');
  NEW.full_name := COALESCE(NEW.full_name, '');

  -- Si full_name tiene valor, úsalo para generar first_name y last_name
  IF NEW.full_name != '' THEN
    -- Dividir full_name en primera palabra y resto
    IF POSITION(' ' IN TRIM(NEW.full_name)) > 0 THEN
      NEW.first_name := SPLIT_PART(TRIM(NEW.full_name), ' ', 1);
      NEW.last_name := TRIM(SUBSTRING(TRIM(NEW.full_name) FROM POSITION(' ' IN TRIM(NEW.full_name)) + 1));
    ELSE
      -- Sin espacio, todo va a first_name
      NEW.first_name := TRIM(NEW.full_name);
      NEW.last_name := '';
    END IF;
  ELSIF NEW.first_name != '' OR NEW.last_name != '' THEN
    -- Si no hay full_name pero sí hay first_name o last_name, construir full_name
    NEW.full_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  ELSE
    -- Sin ningún nombre, usar valor por defecto
    NEW.first_name := 'Sin Nombre';
    NEW.last_name := '';
    NEW.full_name := 'Sin Nombre';
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger
CREATE TRIGGER trigger_sync_patient_names
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patient_names();

COMMENT ON FUNCTION public.sync_patient_names() IS
'Trigger que sincroniza full_name con first_name y last_name. Maneja correctamente inserts con solo full_name.';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
