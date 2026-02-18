-- Ensure required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

set search_path = public;

-- ================================
-- Template Categories
-- ================================
create table if not exists template_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  type text not null check (type in ('interrogatorio', 'exploracion', 'prescripcion', 'general')),
  is_predefined boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_template_categories_type on template_categories(type);

create or replace function set_template_categories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_template_categories_updated on template_categories;
create trigger trg_template_categories_updated
before update on template_categories
for each row execute procedure set_template_categories_updated_at();

-- ================================
-- Medical Templates
-- ================================
create table if not exists medical_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  clinic_id uuid references clinics(id) on delete set null,
  category_id uuid references template_categories(id) on delete set null,
  name text not null,
  description text,
  type text not null check (type in ('interrogatorio', 'exploracion', 'prescripcion')),
  specialty text,
  content jsonb not null default jsonb_build_object('sections', '[]'::jsonb),
  tags text[] not null default '{}',
  is_public boolean not null default false,
  is_predefined boolean not null default false,
  is_active boolean not null default true,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_medical_templates_user on medical_templates(user_id);
create index if not exists idx_medical_templates_category on medical_templates(category_id);
create index if not exists idx_medical_templates_public on medical_templates(is_public, is_predefined, is_active);
create index if not exists idx_medical_templates_type on medical_templates(type);

create or replace function set_medical_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_medical_templates_updated on medical_templates;
create trigger trg_medical_templates_updated
before update on medical_templates
for each row execute procedure set_medical_templates_updated_at();

-- ================================
-- Template Favorites
-- ================================
create table if not exists template_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references medical_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, template_id)
);

create index if not exists idx_template_favorites_user on template_favorites(user_id);
create index if not exists idx_template_favorites_template on template_favorites(template_id);

-- ================================
-- Template Usage
-- ================================
create table if not exists template_usage (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references medical_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid,
  consultation_id uuid,
  context jsonb,
  used_at timestamptz not null default now()
);

create index if not exists idx_template_usage_template on template_usage(template_id);
create index if not exists idx_template_usage_user on template_usage(user_id);

-- ================================
-- RLS Policies
-- ================================
alter table template_categories enable row level security;
alter table medical_templates enable row level security;
alter table template_favorites enable row level security;
alter table template_usage enable row level security;

-- Template categories are readable by everyone (public catalogue)
drop policy if exists "Template categories are readable by anyone" on template_categories;
create policy "Template categories are readable by anyone"
  on template_categories
  for select
  using (true);

-- Medical templates readable when public/predefined or owned by user
drop policy if exists "Templates readable if public or owner" on medical_templates;
create policy "Templates readable if public or owner"
  on medical_templates
  for select
  using (
    is_public
    or is_predefined
    or user_id = auth.uid()
  );

-- Owner can insert/update/delete their templates
drop policy if exists "Owners can insert templates" on medical_templates;
create policy "Owners can insert templates"
  on medical_templates
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Owners can update templates" on medical_templates;
create policy "Owners can update templates"
  on medical_templates
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Owners can soft-delete templates" on medical_templates;
create policy "Owners can soft-delete templates"
  on medical_templates
  for delete
  using (user_id = auth.uid());

-- Favorites: user can manage their own favorites
drop policy if exists "Users can read their favorites" on template_favorites;
create policy "Users can read their favorites"
  on template_favorites
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can add favorites" on template_favorites;
create policy "Users can add favorites"
  on template_favorites
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can remove favorites" on template_favorites;
create policy "Users can remove favorites"
  on template_favorites
  for delete
  using (user_id = auth.uid());

-- Usage: users can record and view their own usage rows
drop policy if exists "Users can read their template usage" on template_usage;
create policy "Users can read their template usage"
  on template_usage
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert template usage" on template_usage;
create policy "Users can insert template usage"
  on template_usage
  for insert
  with check (user_id = auth.uid());

-- ================================
-- Default seed categories (idempotent)
-- ================================
insert into template_categories (id, name, description, type, is_predefined)
values
  ('00000000-0000-0000-0000-000000000111', 'Interrogatorio general', 'Preguntas base para historia clínica', 'interrogatorio', true),
  ('00000000-0000-0000-0000-000000000222', 'Exploración física', 'Secciones base de exploración', 'exploracion', true),
  ('00000000-0000-0000-0000-000000000333', 'Prescripciones', 'Plantillas de prescripción y educación', 'prescripcion', true)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    type = excluded.type,
    is_predefined = excluded.is_predefined,
    updated_at = now();
