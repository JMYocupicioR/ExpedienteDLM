-- =====================================================
-- Doctors: independent by default, no auto-clinic.
-- Clinics: is_public for listing in doctor profile dropdown.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. clinics.is_public (clinic opts in to be visible to doctors)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.clinics ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.clinics.is_public IS 'Si true, la clínica aparece en el listado al asociar perfil del médico.';
  END IF;
END $$;

-- =====================================================
-- 2. Ensure profiles.clinic_id is nullable (for independent doctors)
-- =====================================================

ALTER TABLE public.profiles ALTER COLUMN clinic_id DROP NOT NULL;

-- =====================================================
-- 3. handle_new_user: create profile only, no auto-clinic (doctor starts independent)
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Create profile only; clinic_id NULL so doctor is independent by default
  INSERT INTO public.profiles (id, email, full_name, role, clinic_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor'),
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Nuevos usuarios reciben solo perfil; clinic_id NULL (médico independiente por defecto). No se crea clínica automáticamente.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;
