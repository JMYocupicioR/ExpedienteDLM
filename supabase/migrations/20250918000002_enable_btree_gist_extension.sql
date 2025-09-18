-- Ensure required extensions and indexes for enhanced appointments system
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
  ON public.appointments (doctor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON public.appointments (clinic_id, appointment_date)
  WHERE clinic_id IS NOT NULL;

COMMIT;
