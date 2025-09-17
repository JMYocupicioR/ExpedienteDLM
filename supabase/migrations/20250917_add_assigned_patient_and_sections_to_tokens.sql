-- Add assigned patient and allowed sections to patient_registration_tokens
-- Also make expiry configurable at insert time (handled in app), but we add helpful indexes

begin;

alter table if exists public.patient_registration_tokens
  add column if not exists assigned_patient_id uuid references public.patients(id) on delete set null;

alter table if exists public.patient_registration_tokens
  add column if not exists allowed_sections text[] not null default array['personal','pathological','non_pathological','hereditary'];

-- Helpful indexes for validations/lookups
create index if not exists idx_patient_registration_tokens_expires_at on public.patient_registration_tokens(expires_at);
create index if not exists idx_patient_registration_tokens_assigned_patient on public.patient_registration_tokens(assigned_patient_id);

commit;


