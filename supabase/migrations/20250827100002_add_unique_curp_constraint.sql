-- =====================================================
-- Fortalecer la Integridad de Datos de Pacientes
-- Fecha: 2025-08-27
-- Descripción: Este script añade una restricción UNIQUE
-- para prevenir la creación de pacientes duplicados con
-- el mismo CURP dentro de la misma clínica.
-- =====================================================

-- PASO 1: Limpiar duplicados existentes (si los hay)
-- Esta es una medida de seguridad. Si ya existen duplicados,
-- la creación de la restricción UNIQUE fallaría.
-- Conservamos el registro más reciente y eliminamos los más antiguos.
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER(PARTITION BY clinic_id, curp ORDER BY created_at DESC) as rn
    FROM
        public.patients
    WHERE
        curp IS NOT NULL AND curp != ''
)
DELETE FROM public.patients
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- PASO 2: Añadir la restricción UNIQUE
-- Esto asegura que la combinación de clinic_id y curp sea única
-- en toda la tabla, previniendo duplicados a nivel de base de datos.
ALTER TABLE public.patients
ADD CONSTRAINT unique_clinic_curp
UNIQUE (clinic_id, curp);

-- Nota: Si un CURP es NULL o una cadena vacía, esta restricción
-- no se aplicará a esa fila, permitiendo múltiples pacientes
-- sin CURP registrado. El control se enfoca en CURPs válidos.
