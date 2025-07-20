/*
  # Migración para Sincronizar Permisos de Prescripción en Perfiles de Doctores

  1. Problema identificado:
    - La columna `can_prescribe_controlled` en la tabla `profiles` no se actualizaba
      automáticamente cuando se cambiaba la `specialty_code` de un doctor.
    - Esto podía causar una desincronización entre los permisos definidos por la
      especialidad y los permisos reales del doctor.

  2. Correcciones:
    - Se crea la función `sync_profile_permissions_from_specialty` que se encarga de
      actualizar el campo `can_prescribe_controlled` en `profiles` basándose en la
      especialidad asignada.
    - Se crea un trigger (`update_profile_permissions_trigger`) que se dispara
      después de insertar o actualizar un perfil, asegurando que los permisos
      estén siempre sincronizados.
*/

-- ===== FUNCIÓN DEL TRIGGER PARA SINCRONIZAR PERMISOS =====

CREATE OR REPLACE FUNCTION public.sync_profile_permissions_from_specialty()
RETURNS TRIGGER AS $$
DECLARE
  specialty_can_prescribe BOOLEAN;
BEGIN
  -- Solo ejecutar la lógica si el rol es 'doctor' y la columna specialty_code ha cambiado,
  -- o si es una nueva inserción de un doctor.
  IF (TG_OP = 'UPDATE' AND NEW.specialty_code IS DISTINCT FROM OLD.specialty_code) OR (TG_OP = 'INSERT') THEN
    IF NEW.role = 'doctor' AND NEW.specialty_code IS NOT NULL THEN
      -- Obtener el permiso de la tabla de especialidades
      SELECT can_prescribe_controlled
      INTO specialty_can_prescribe
      FROM public.medical_specialties
      WHERE code = NEW.specialty_code;

      -- Si se encuentra la especialidad, actualizar el campo en el perfil del doctor
      IF FOUND THEN
        NEW.can_prescribe_controlled := specialty_can_prescribe;
      ELSE
        -- Si la especialidad no existe, por seguridad, se deniega el permiso.
        NEW.can_prescribe_controlled := FALSE;
      END IF;
    ELSE
      -- Si no es un doctor o no tiene especialidad, el permiso es falso.
      NEW.can_prescribe_controlled := FALSE;
    END IF;
  END IF;

  -- Devolver el nuevo registro modificado para que se inserte o actualice
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CREACIÓN DEL TRIGGER EN LA TABLA PROFILES =====

-- Eliminar el trigger si ya existe para asegurar que la nueva versión se aplique
DROP TRIGGER IF EXISTS update_profile_permissions_trigger ON public.profiles;

-- Crear el trigger que se ejecuta ANTES de un INSERT o UPDATE
CREATE TRIGGER update_profile_permissions_trigger
  BEFORE INSERT OR UPDATE OF specialty_code, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_permissions_from_specialty();

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON FUNCTION public.sync_profile_permissions_from_specialty() IS 'Trigger function to automatically update the can_prescribe_controlled flag in a doctor''s profile based on their assigned medical specialty.';
COMMENT ON TRIGGER update_profile_permissions_trigger ON public.profiles IS 'Ensures that the permissions of a doctor are always in sync with their specialty.';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Se ha creado el trigger para sincronizar automáticamente los permisos de prescripción en los perfiles de los doctores.';
END $$; 