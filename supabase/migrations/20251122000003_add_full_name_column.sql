-- =====================================================
-- ADD: Columna full_name y hacer first_name/last_name opcionales
-- Fecha: 2025-11-22
-- Descripción: Agrega columna full_name y hace first_name/last_name
-- opcionales para soportar médicos independientes
-- =====================================================

-- Usar bloque DO para hacer las operaciones de forma segura
DO $$
BEGIN
  -- Agregar columna full_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN full_name TEXT;
  END IF;

  -- Hacer first_name opcional si existe y es NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'first_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.patients ALTER COLUMN first_name DROP NOT NULL;
  END IF;

  -- Hacer last_name opcional si existe y es NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'last_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.patients ALTER COLUMN last_name DROP NOT NULL;
  END IF;
END $$;

-- Crear índice para búsqueda por full_name
CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm
ON public.patients USING gin (full_name gin_trgm_ops);

COMMENT ON COLUMN public.patients.full_name IS
'Nombre completo del paciente. Se sincroniza automáticamente con first_name y last_name mediante trigger.';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
