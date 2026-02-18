-- Restore FK and relationship metadata between appointments and patients.
-- This fixes PostgREST PGRST200 when selecting appointments with patient:patients(...)

-- Step 1) Backup orphan appointments that cannot satisfy FK.
CREATE TABLE IF NOT EXISTS public.appointments_orphan_backup (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  reason TEXT NOT NULL DEFAULT 'missing_patient_fk',
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.appointments_orphan_backup (id, payload, reason)
SELECT a.id, to_jsonb(a), 'missing_patient_fk'
FROM public.appointments a
LEFT JOIN public.patients p ON p.id = a.patient_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 2) Remove orphan appointments so FK creation can succeed.
DELETE FROM public.appointments a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.patients p
  WHERE p.id = a.patient_id
);

-- Step 3) Create FK if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'appointments'
      AND constraint_name = 'appointments_patient_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_patient_id_fkey
      FOREIGN KEY (patient_id)
      REFERENCES public.patients(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON public.appointments(patient_id);
