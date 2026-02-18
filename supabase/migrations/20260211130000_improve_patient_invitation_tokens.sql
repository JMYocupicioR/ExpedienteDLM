-- Improve patient invitation flows with richer token metadata
-- and allow patient-side scale assessment inserts.

ALTER TABLE IF EXISTS public.patient_registration_tokens
  ADD COLUMN IF NOT EXISTS assigned_task_ids TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS create_conversation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_template TEXT,
  ADD COLUMN IF NOT EXISTS required_scale_ids TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS selected_exercise_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS custom_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS invitation_template TEXT;

CREATE INDEX IF NOT EXISTS idx_patient_registration_tokens_required_scales
  ON public.patient_registration_tokens USING GIN (required_scale_ids);

ALTER TABLE IF EXISTS public.scale_assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'scale_assessments'
  ) THEN
    DROP POLICY IF EXISTS "scale_assessments_patient_insert_own" ON public.scale_assessments;
    CREATE POLICY "scale_assessments_patient_insert_own"
      ON public.scale_assessments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        patient_id IN (
          SELECT p.id
          FROM public.patients p
          WHERE p.patient_user_id = auth.uid()
        )
      );
  END IF;
END
$$;
