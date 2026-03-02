-- Ensure medical scales schema supports public patient registration flow.
-- Idempotent by design to avoid breaking existing environments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.medical_scales') IS NULL THEN
    CREATE TABLE public.medical_scales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      specialty TEXT NULL,
      category TEXT NULL,
      description TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

ALTER TABLE public.medical_scales
  ADD COLUMN IF NOT EXISTS definition JSONB NULL;

-- Normalized question model used by getScaleDefinitionById().
CREATE TABLE IF NOT EXISTS public.scale_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id UUID NOT NULL REFERENCES public.medical_scales(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'select',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scale_questions_scale_id
  ON public.scale_questions(scale_id, order_index);

CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.scale_questions(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL,
  option_value NUMERIC NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id
  ON public.question_options(question_id, order_index);

CREATE TABLE IF NOT EXISTS public.scale_scoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id UUID NOT NULL UNIQUE REFERENCES public.medical_scales(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'sum',
  average BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scoring_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id UUID NOT NULL REFERENCES public.medical_scales(id) ON DELETE CASCADE,
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  interpretation_label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_ranges_scale_id
  ON public.scoring_ranges(scale_id, order_index);

ALTER TABLE public.medical_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_ranges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'medical_scales'
      AND policyname = 'medical_scales_public_read_active'
  ) THEN
    CREATE POLICY medical_scales_public_read_active
      ON public.medical_scales
      FOR SELECT
      TO anon, authenticated
      USING (is_active = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scale_questions'
      AND policyname = 'scale_questions_public_read'
  ) THEN
    CREATE POLICY scale_questions_public_read
      ON public.scale_questions
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.medical_scales ms
          WHERE ms.id = scale_questions.scale_id
            AND ms.is_active = TRUE
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'question_options'
      AND policyname = 'question_options_public_read'
  ) THEN
    CREATE POLICY question_options_public_read
      ON public.question_options
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.scale_questions sq
          JOIN public.medical_scales ms ON ms.id = sq.scale_id
          WHERE sq.id = question_options.question_id
            AND ms.is_active = TRUE
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scale_scoring'
      AND policyname = 'scale_scoring_public_read'
  ) THEN
    CREATE POLICY scale_scoring_public_read
      ON public.scale_scoring
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.medical_scales ms
          WHERE ms.id = scale_scoring.scale_id
            AND ms.is_active = TRUE
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoring_ranges'
      AND policyname = 'scoring_ranges_public_read'
  ) THEN
    CREATE POLICY scoring_ranges_public_read
      ON public.scoring_ranges
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.medical_scales ms
          WHERE ms.id = scoring_ranges.scale_id
            AND ms.is_active = TRUE
        )
      );
  END IF;
END $$;

