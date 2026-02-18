-- Ensure patient-first signup behavior for Pacientes app.
-- - Users created from source_app='pacientes' become role='patient'
-- - Patients do not auto-create personal clinic
-- - Open signup is allowed by relaxing nullable constraints for patient ownership

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'clinic_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN clinic_id DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patients'
      AND column_name = 'primary_doctor_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.patients
      ALTER COLUMN primary_doctor_id DROP NOT NULL;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_requested_role TEXT;
  v_source_app TEXT;
  v_effective_role TEXT;
  v_clinic_id UUID;
  v_clinic_name TEXT;
  v_role_in_clinic TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  v_source_app := LOWER(COALESCE(NEW.raw_user_meta_data->>'source_app', ''));

  IF v_requested_role IN ('patient', 'doctor', 'health_staff', 'admin_staff') THEN
    v_effective_role := v_requested_role;
  ELSIF v_source_app = 'pacientes' THEN
    v_effective_role := 'patient';
  ELSE
    v_effective_role := 'doctor';
  END IF;

  IF v_effective_role = 'patient' THEN
    INSERT INTO public.profiles (id, email, full_name, role, clinic_id, created_at, updated_at)
    VALUES (NEW.id, NEW.email, v_full_name, 'patient', NULL, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
      SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
          role = 'patient',
          updated_at = NOW();

    INSERT INTO public.patients (
      full_name,
      email,
      clinic_id,
      primary_doctor_id,
      patient_user_id,
      insurance_info,
      emergency_contact,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      v_full_name,
      NEW.email,
      NULL,
      NULL,
      NEW.id,
      '{}'::jsonb,
      '{}'::jsonb,
      TRUE,
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.patient_user_id = NEW.id
    );

    RETURN NEW;
  END IF;

  -- Preserve legacy non-patient behavior (doctor/staff side).
  v_clinic_name := 'Consultorio de ' || v_full_name;
  INSERT INTO public.clinics (name, type, is_active, created_at, updated_at)
  VALUES (v_clinic_name, 'consultorio_personal', TRUE, NOW(), NOW())
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.profiles (id, email, full_name, role, clinic_id, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_full_name, v_effective_role, v_clinic_id, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET clinic_id = COALESCE(public.profiles.clinic_id, EXCLUDED.clinic_id),
        role = COALESCE(public.profiles.role, EXCLUDED.role),
        updated_at = NOW();

  v_role_in_clinic := CASE
    WHEN v_effective_role = 'admin_staff' THEN 'admin_staff'
    WHEN v_effective_role = 'doctor' THEN 'owner'
    ELSE 'doctor'
  END;

  INSERT INTO public.clinic_user_relationships (
    clinic_id,
    user_id,
    role_in_clinic,
    status,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_clinic_id,
    NEW.id,
    v_role_in_clinic,
    'approved',
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
