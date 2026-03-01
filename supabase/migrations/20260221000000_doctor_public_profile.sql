-- =====================================================
-- MIGRATION: Doctor Public Profile System
-- Description: Adds public profile columns to profiles,
--              creates doctor_reviews table, and RLS for
--              anonymous/public access to doctor profiles.
-- Date: 2026-02-21
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD COLUMNS TO profiles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_profile_public') THEN
    ALTER TABLE public.profiles ADD COLUMN is_profile_public BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'public_bio') THEN
    ALTER TABLE public.profiles ADD COLUMN public_bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'consultation_fee') THEN
    ALTER TABLE public.profiles ADD COLUMN consultation_fee DECIMAL(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'public_languages') THEN
    ALTER TABLE public.profiles ADD COLUMN public_languages TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'public_address') THEN
    ALTER TABLE public.profiles ADD COLUMN public_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'public_photo_url') THEN
    ALTER TABLE public.profiles ADD COLUMN public_photo_url TEXT;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE doctor_reviews TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_doctor_patient_review UNIQUE (doctor_id, patient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON public.doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_created_at ON public.doctor_reviews(doctor_id, created_at DESC);

COMMENT ON TABLE public.doctor_reviews IS 'Patient reviews/ratings for doctors with public profiles';
COMMENT ON COLUMN public.doctor_reviews.is_verified IS 'True if the patient had a real appointment with this doctor';

-- =====================================================
-- 3. RLS: profiles - allow public SELECT for public profiles
-- =====================================================

CREATE POLICY "profiles_select_public" ON public.profiles
FOR SELECT
USING (is_profile_public = true);

COMMENT ON POLICY "profiles_select_public" ON public.profiles IS
'Allows anon and authenticated users to read public doctor profiles';

-- =====================================================
-- 4. RLS: doctor_reviews
-- =====================================================

ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can read reviews (for display on public profile)
CREATE POLICY "doctor_reviews_select_all" ON public.doctor_reviews
FOR SELECT
USING (true);

-- INSERT: authenticated users only, must be inserting for themselves (patient_user_id = auth.uid())
CREATE POLICY "doctor_reviews_insert_own" ON public.doctor_reviews
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND patient_user_id = auth.uid()
);

-- UPDATE: users can update their own review
CREATE POLICY "doctor_reviews_update_own" ON public.doctor_reviews
FOR UPDATE
USING (patient_user_id = auth.uid())
WITH CHECK (patient_user_id = auth.uid());

-- DELETE: users can delete their own review
CREATE POLICY "doctor_reviews_delete_own" ON public.doctor_reviews
FOR DELETE
USING (patient_user_id = auth.uid());

-- =====================================================
-- 5. RLS + RPC: medical_practice_settings (only if table exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medical_practice_settings'
  ) THEN
    -- RLS: allow public read for doctors with public profiles
    DROP POLICY IF EXISTS "medical_practice_settings_select_public_doctors" ON public.medical_practice_settings;
    CREATE POLICY "medical_practice_settings_select_public_doctors" ON public.medical_practice_settings
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = medical_practice_settings.user_id
        AND profiles.is_profile_public = true
      )
    );
    COMMENT ON POLICY "medical_practice_settings_select_public_doctors" ON public.medical_practice_settings IS
    'Allows reading practice settings for doctors with public profiles (for availability/slots)';
  END IF;
END $$;

-- =====================================================
-- 6. RPC: get_public_doctor_available_slots (only if medical_practice_settings exists)
-- =====================================================

DO $mig$
DECLARE
  v_has_mps boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medical_practice_settings'
  ) INTO v_has_mps;

  IF v_has_mps THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.get_public_doctor_available_slots(p_doctor_id UUID, p_date DATE)
      RETURNS TABLE (slot_time TIME)
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
      AS $func$
      DECLARE
        v_weekday INT;
        v_base_start TIME;
        v_base_end TIME;
        v_interval INT;
        v_mins INT;
        v_slot_time TIME;
        v_occupied TEXT[];
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_doctor_id AND is_profile_public = true) THEN
          RETURN;
        END IF;
        v_weekday := EXTRACT(DOW FROM p_date)::INT;
        SELECT
          CASE WHEN v_weekday = 0 THEN mps.sunday_start_time WHEN v_weekday = 6 THEN mps.saturday_start_time ELSE mps.weekday_start_time END,
          CASE WHEN v_weekday = 0 THEN mps.sunday_end_time WHEN v_weekday = 6 THEN mps.saturday_end_time ELSE mps.weekday_end_time END,
          mps.default_consultation_duration + COALESCE(mps.buffer_time_between_appointments, 0)
        INTO v_base_start, v_base_end, v_interval
        FROM public.medical_practice_settings mps WHERE mps.user_id = p_doctor_id
        ORDER BY mps.clinic_id NULLS LAST LIMIT 1;
        IF v_base_start IS NULL OR v_base_end IS NULL OR v_interval <= 0 THEN RETURN; END IF;
        IF v_weekday = 0 AND NOT EXISTS (SELECT 1 FROM public.medical_practice_settings WHERE user_id = p_doctor_id AND sunday_enabled = true) THEN
          RETURN;
        END IF;
        SELECT ARRAY_AGG(SUBSTRING(a.appointment_time::TEXT, 1, 5))
        INTO v_occupied FROM public.appointments a
        WHERE a.doctor_id = p_doctor_id AND a.appointment_date = p_date
          AND a.status IN (''scheduled'', ''confirmed'', ''confirmed_by_patient'', ''in_progress'');
        v_occupied := COALESCE(v_occupied, ARRAY[]::TEXT[]);
        v_mins := EXTRACT(EPOCH FROM v_base_start)::INT / 60;
        WHILE v_mins < (EXTRACT(EPOCH FROM v_base_end)::INT / 60) LOOP
          v_slot_time := (''00:00''::TIME + (v_mins || '' minutes'')::INTERVAL);
          IF NOT (TO_CHAR(v_slot_time, ''HH24:MI'') = ANY(v_occupied)) THEN
            slot_time := v_slot_time;
            RETURN NEXT;
          END IF;
          v_mins := v_mins + v_interval;
        END LOOP;
      END;
      $func$';
    EXECUTE 'COMMENT ON FUNCTION public.get_public_doctor_available_slots IS ''Returns available appointment slots for a public doctor on a given date.''';
  ELSE
    -- Create a stub function that returns empty when medical_practice_settings does not exist
    CREATE OR REPLACE FUNCTION public.get_public_doctor_available_slots(
      p_doctor_id UUID,
      p_date DATE
    )
    RETURNS TABLE (slot_time TIME)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $stub$
    BEGIN
      -- Table medical_practice_settings does not exist; run migration 20250919000002 first
      RETURN;
    END;
    $stub$;
    COMMENT ON FUNCTION public.get_public_doctor_available_slots IS
    'Returns available slots. Requires medical_practice_settings table. Run migration 20250919000002_create_medical_practice_settings.sql first for full functionality.';
  END IF;
END $mig$;

COMMIT;
