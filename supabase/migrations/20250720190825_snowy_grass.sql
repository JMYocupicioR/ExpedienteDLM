/*
  MIGRACIÓN 2: ELIMINAR FUNCIONES HELPER OBSOLETAS Y PELIGROSAS

  - Problema: Las funciones `is_admin()`, `is_doctor()`, etc., causaban recursión
    infinita en las políticas RLS y ya no se utilizan.
  - Solución: Se eliminan por completo de la base de datos para prevenir su
    uso accidental en el futuro.
*/

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_doctor();
DROP FUNCTION IF EXISTS public.is_nurse();

DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN 2 COMPLETADA: Funciones de ayuda RLS obsoletas eliminadas.';
END $$;