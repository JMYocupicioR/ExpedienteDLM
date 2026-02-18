-- =====================================================
-- MIGRATION: Create Patient Tasks Table
-- Date: 2026-02-11
-- Description: Stores pending tasks, questionnaires, scales and exercises for patients.
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_task_type') THEN
    CREATE TYPE public.patient_task_type AS ENUM ('scale', 'questionnaire', 'exercise', 'document', 'other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_task_status') THEN
    CREATE TYPE public.patient_task_status AS ENUM ('pending', 'in_progress', 'completed', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NULL REFERENCES public.clinics(id) ON DELETE SET NULL,
  task_type public.patient_task_type NOT NULL DEFAULT 'other',
  status public.patient_task_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT NULL,
  instructions TEXT NULL,
  related_entity_id UUID NULL,
  due_date TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_tasks_patient_due ON public.patient_tasks(patient_id, due_date);
CREATE INDEX IF NOT EXISTS idx_patient_tasks_status ON public.patient_tasks(status);
CREATE INDEX IF NOT EXISTS idx_patient_tasks_doctor ON public.patient_tasks(doctor_id);

ALTER TABLE public.patient_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_tasks_select_patient_self" ON public.patient_tasks;
CREATE POLICY "patient_tasks_select_patient_self"
ON public.patient_tasks
FOR SELECT
USING (
  public.is_patient_owner(patient_id)
);

DROP POLICY IF EXISTS "patient_tasks_update_patient_self" ON public.patient_tasks;
CREATE POLICY "patient_tasks_update_patient_self"
ON public.patient_tasks
FOR UPDATE
USING (
  public.is_patient_owner(patient_id)
)
WITH CHECK (
  public.is_patient_owner(patient_id)
);

DROP POLICY IF EXISTS "patient_tasks_insert_medical_staff" ON public.patient_tasks;
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
);

CREATE OR REPLACE FUNCTION public.update_patient_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_patient_tasks_updated_at ON public.patient_tasks;
CREATE TRIGGER trigger_update_patient_tasks_updated_at
BEFORE UPDATE ON public.patient_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_patient_tasks_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.patient_tasks TO authenticated;

