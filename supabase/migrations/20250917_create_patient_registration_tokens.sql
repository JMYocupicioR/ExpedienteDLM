-- Create patient_registration_tokens table if missing
-- Includes defaults and indexes required by the app

begin;

create extension if not exists pgcrypto;

create table if not exists public.patient_registration_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  selected_scale_ids text[] null,
  allowed_sections text[] not null default array['personal','pathological','non_pathological','hereditary'],
  assigned_patient_id uuid null references public.patients(id) on delete set null,
  expires_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_prt_expires_at on public.patient_registration_tokens(expires_at);
create index if not exists idx_prt_assigned_patient on public.patient_registration_tokens(assigned_patient_id);

commit;


