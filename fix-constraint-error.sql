-- =====================================================
-- SCRIPT SIMPLE: Corregir Error de Restricción Duplicada
-- Ejecuta este script si solo tienes el error de unique_clinic_social_security
-- =====================================================

-- Verificar si la restricción ya existe y mostrar información
SELECT 
  'Verificando restricciones existentes...' as status,
  constraint_name,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'patients' 
  AND table_schema = 'public'
  AND constraint_type = 'UNIQUE';

-- Solo crear la restricción si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_clinic_social_security' 
    AND table_name = 'patients'
    AND table_schema = 'public'
  ) THEN
    -- Eliminar la restricción antigua de CURP si existe
    ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS unique_clinic_curp;
    
    -- Crear nueva restricción para social_security_number
    ALTER TABLE public.patients
    ADD CONSTRAINT unique_clinic_social_security
    UNIQUE (clinic_id, social_security_number);
    
    RAISE NOTICE 'Restricción unique_clinic_social_security creada exitosamente';
  ELSE
    RAISE NOTICE 'La restricción unique_clinic_social_security ya existe - no se requiere acción';
  END IF;
END $$;

-- Verificar el resultado final
SELECT 
  'Restricciones finales:' as status,
  constraint_name,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'patients' 
  AND table_schema = 'public'
  AND constraint_type = 'UNIQUE'
ORDER BY constraint_name;
