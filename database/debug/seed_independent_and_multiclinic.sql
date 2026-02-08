-- Seed mínimo para pruebas locales: médicos independientes y multi-clínica
-- Ejecutar en Supabase local (npx supabase start) desde psql o el editor SQL.

-- Médico independiente con pacientes propios (clinic_id NULL)
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'independent@dlm.test')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, role, clinic_id)
values ('00000000-0000-0000-0000-000000000001', 'Médico Independiente', 'doctor', null)
on conflict (id) do nothing;

insert into public.patients (id, full_name, clinic_id, primary_doctor_id, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'Paciente Independiente 1', null, '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000002', 'Paciente Independiente 2', null, '00000000-0000-0000-0000-000000000001', true)
on conflict (id) do nothing;

-- Clínicas de ejemplo
insert into public.clinics (id, name, address, is_active)
values
  ('c1111111-1111-1111-1111-111111111111', 'Clínica Norte', 'Av. Norte 123', true),
  ('c2222222-2222-2222-2222-222222222222', 'Clínica Sur', 'Av. Sur 456', true)
on conflict (id) do nothing;

-- Médico multi-clínica
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'multi@dlm.test')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, role, clinic_id)
values ('00000000-0000-0000-0000-000000000002', 'Médico Multi', 'doctor', 'c1111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.clinic_user_relationships (clinic_id, user_id, role_in_clinic, status, is_active)
values
  ('c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'doctor', 'approved', true),
  ('c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'doctor', 'approved', true)
on conflict do nothing;

insert into public.patients (id, full_name, clinic_id, primary_doctor_id, is_active)
values
  ('20000000-0000-0000-0000-000000000001', 'Paciente Clínica Norte', 'c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', true),
  ('20000000-0000-0000-0000-000000000002', 'Paciente Clínica Sur', 'c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', true)
on conflict (id) do nothing;
