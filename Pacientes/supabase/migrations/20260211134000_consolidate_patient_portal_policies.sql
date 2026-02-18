-- =====================================================
-- MIGRATION: Consolidate Patient Portal Policies
-- Date: 2026-02-11
-- Description: Removes duplicate legacy policies and keeps a single canonical policy set
--              for messages and patient_tasks.
-- =====================================================

-- Ensure helper exists (safe for out-of-order execution).
CREATE OR REPLACE FUNCTION public.is_patient_owner(p_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = p_patient_id
      AND p.patient_user_id = auth.uid()
  );
$$;

DO $$
BEGIN
  -- =========================
  -- messages
  -- =========================
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';

    -- Remove legacy duplicates
    EXECUTE 'DROP POLICY IF EXISTS "messages_doctor_insert" ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS "messages_patient_insert" ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS "messages_participants_select" ON public.messages';

    -- Recreate canonical set
    EXECUTE 'DROP POLICY IF EXISTS "messages_select_participants" ON public.messages';
    EXECUTE $sql$
      CREATE POLICY "messages_select_participants"
      ON public.messages
      FOR SELECT
      USING (
        public.is_patient_owner(patient_id)
        OR doctor_id = auth.uid()
        OR sender_id = auth.uid()
        OR recipient_id = auth.uid()
      )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages';
    EXECUTE $sql$
      CREATE POLICY "messages_insert_participants"
      ON public.messages
      FOR INSERT
      WITH CHECK (
        public.is_patient_owner(patient_id)
        OR doctor_id = auth.uid()
        OR sender_id = auth.uid()
      )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "messages_update_participants" ON public.messages';
    EXECUTE $sql$
      CREATE POLICY "messages_update_participants"
      ON public.messages
      FOR UPDATE
      USING (
        public.is_patient_owner(patient_id)
        OR doctor_id = auth.uid()
        OR recipient_id = auth.uid()
      )
      WITH CHECK (
        public.is_patient_owner(patient_id)
        OR doctor_id = auth.uid()
        OR recipient_id = auth.uid()
      )
    $sql$;
  END IF;

  -- =========================
  -- patient_tasks
  -- =========================
  IF to_regclass('public.patient_tasks') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.patient_tasks ENABLE ROW LEVEL SECURITY';

    -- Remove legacy duplicates
    EXECUTE 'DROP POLICY IF EXISTS "patient_tasks_select_own" ON public.patient_tasks';
    EXECUTE 'DROP POLICY IF EXISTS "patient_tasks_update_own" ON public.patient_tasks';

    -- Recreate canonical patient policies
    EXECUTE 'DROP POLICY IF EXISTS "patient_tasks_select_patient_self" ON public.patient_tasks';
    EXECUTE $sql$
      CREATE POLICY "patient_tasks_select_patient_self"
      ON public.patient_tasks
      FOR SELECT
      USING (
        public.is_patient_owner(patient_id)
      )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "patient_tasks_update_patient_self" ON public.patient_tasks';
    EXECUTE $sql$
      CREATE POLICY "patient_tasks_update_patient_self"
      ON public.patient_tasks
      FOR UPDATE
      USING (
        public.is_patient_owner(patient_id)
      )
      WITH CHECK (
        public.is_patient_owner(patient_id)
      )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "patient_tasks_insert_medical_staff" ON public.patient_tasks';
    EXECUTE $sql$
      CREATE POLICY "patient_tasks_insert_medical_staff"
      ON public.patient_tasks
      FOR INSERT
      WITH CHECK (
        doctor_id = auth.uid()
        OR (
          clinic_id IS NOT NULL
          AND clinic_id IN (
            SELECT clinic_id
            FROM public.clinic_user_relationships
            WHERE user_id = auth.uid()
              AND is_active = true
              AND status = 'approved'
          )
        )
      )
    $sql$;
  END IF;
END
$$;

