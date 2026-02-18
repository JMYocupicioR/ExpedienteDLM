-- =====================================================
-- MIGRATION: Create Messages Table
-- Date: 2026-02-11
-- Description: Direct patient-doctor messages for the patient portal.
-- =====================================================

-- Ensure helper exists even if migrations are executed out-of-order.
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

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NULL REFERENCES public.clinics(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If messages already existed with an older schema, add missing columns safely.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_patient_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_doctor_id_fkey
      FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_recipient_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_recipient_id_fkey
      FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_clinic_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_patient_date ON public.messages(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_doctor_date ON public.messages(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON public.messages(recipient_id, is_read);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants"
ON public.messages
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
  OR doctor_id = auth.uid()
  OR sender_id = auth.uid()
  OR recipient_id = auth.uid()
);

DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
CREATE POLICY "messages_insert_participants"
ON public.messages
FOR INSERT
WITH CHECK (
  public.is_patient_owner(patient_id)
  OR doctor_id = auth.uid()
  OR sender_id = auth.uid()
);

DROP POLICY IF EXISTS "messages_update_participants" ON public.messages;
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
);

CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON public.messages;
CREATE TRIGGER trigger_update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_messages_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

