-- Unify prescription system: consolidate templates, layouts, and settings
-- This migration creates a unified system for prescription templates and layouts

begin;

-- Create unified prescription layouts table (replaces fragmented system)
create table if not exists public.prescription_layouts_unified (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Template info
  name text not null,
  description text,
  category text default 'general',
  
  -- Layout configuration
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  page_size text not null default 'A4' check (page_size in ('A4', 'Letter', 'Legal')),
  
  -- Visual elements and settings
  template_elements jsonb not null default '[]'::jsonb,
  canvas_settings jsonb not null default '{
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "canvasSize": {"width": 794, "height": 1123},
    "pageSize": "A4",
    "margin": "20mm",
    "showGrid": false,
    "zoom": 1
  }'::jsonb,
  
  -- Print settings
  print_settings jsonb not null default '{
    "pageMargins": {"top": "20mm", "right": "15mm", "bottom": "20mm", "left": "15mm"},
    "printQuality": "high",
    "colorMode": "color",
    "scaleFactor": 1.0,
    "autoFitContent": true,
    "includeQrCode": true,
    "includeDigitalSignature": true,
    "watermarkText": null
  }'::jsonb,
  
  -- Metadata
  is_horizontal boolean generated always as (orientation = 'landscape') stored,
  is_default boolean default false,
  is_public boolean default false,
  is_predefined boolean default false,
  usage_count integer default 0,
  last_used_at timestamptz default now(),
  
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  unique(doctor_id, name),
  constraint valid_canvas_size check (
    (canvas_settings->>'canvasSize' is not null) and
    ((canvas_settings->'canvasSize'->>'width')::int > 200) and
    ((canvas_settings->'canvasSize'->>'height')::int > 200)
  )
);

-- Create prescription history table for patient records
create table if not exists public.patient_prescription_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  layout_id uuid references public.prescription_layouts_unified(id) on delete set null,
  
  -- Snapshot data for historical accuracy
  layout_snapshot jsonb, -- Full layout used at time of creation
  medications_snapshot jsonb not null, -- Medications as prescribed
  visual_preview_url text, -- Generated preview image URL
  
  -- Metadata
  prescribed_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'expired')),
  
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(prescription_id) -- One history record per prescription
);

-- Create layout versions table for template versioning
create table if not exists public.prescription_layout_versions (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.prescription_layouts_unified(id) on delete cascade,
  version_number integer not null,
  changes_summary text,
  template_elements jsonb not null,
  canvas_settings jsonb not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  
  unique(layout_id, version_number)
);

-- Indexes for performance
create index if not exists idx_prescription_layouts_orientation on public.prescription_layouts_unified(orientation);
create index if not exists idx_prescription_layouts_horizontal on public.prescription_layouts_unified(is_horizontal);
create index if not exists idx_prescription_layouts_doctor on public.prescription_layouts_unified(doctor_id);
create index if not exists idx_prescription_layouts_public on public.prescription_layouts_unified(is_public) where is_public = true;
create index if not exists idx_prescription_history_patient on public.patient_prescription_history(patient_id);
create index if not exists idx_prescription_history_prescribed_at on public.patient_prescription_history(prescribed_at);

-- Enable RLS
alter table public.prescription_layouts_unified enable row level security;
alter table public.patient_prescription_history enable row level security;
alter table public.prescription_layout_versions enable row level security;

-- RLS Policies for prescription_layouts_unified
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'prescription_layouts_unified' 
    and policyname = 'Users can view their own layouts and public ones'
  ) then
    create policy "Users can view their own layouts and public ones"
      on public.prescription_layouts_unified
      for select
      using (doctor_id = auth.uid() or is_public = true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'prescription_layouts_unified' 
    and policyname = 'Users can create their own layouts'
  ) then
    create policy "Users can create their own layouts"
      on public.prescription_layouts_unified
      for insert
      with check (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'prescription_layouts_unified' 
    and policyname = 'Users can update their own layouts'
  ) then
    create policy "Users can update their own layouts"
      on public.prescription_layouts_unified
      for update
      using (doctor_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'prescription_layouts_unified' 
    and policyname = 'Users can delete their own layouts'
  ) then
    create policy "Users can delete their own layouts"
      on public.prescription_layouts_unified
      for delete
      using (doctor_id = auth.uid());
  end if;
end $$;

-- RLS Policies for patient_prescription_history
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'patient_prescription_history' 
    and policyname = 'Doctors can view prescriptions for their patients'
  ) then
    create policy "Doctors can view prescriptions for their patients"
      on public.patient_prescription_history
      for select
      using (
        exists (
          select 1 from public.prescriptions p
          where p.id = prescription_id
          and p.doctor_id = auth.uid()
        )
      );
  end if;
end $$;

-- RLS Policies for layout versions
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'prescription_layout_versions' 
    and policyname = 'Users can view versions of their layouts'
  ) then
    create policy "Users can view versions of their layouts"
      on public.prescription_layout_versions
      for select
      using (
        exists (
          select 1 from public.prescription_layouts_unified l
          where l.id = layout_id
          and l.doctor_id = auth.uid()
        )
      );
  end if;
end $$;

-- Insert predefined horizontal templates (using first available doctor or null for system templates)
do $$
declare
  system_doctor_id uuid;
begin
  -- Try to get first doctor from profiles, or use null for system templates
  select id into system_doctor_id 
  from public.profiles 
  where role = 'doctor' 
  limit 1;
  
  -- If no doctor found, we'll create templates without doctor_id constraint
  if system_doctor_id is null then
    -- Temporarily disable the foreign key constraint for system templates
    alter table public.prescription_layouts_unified 
    alter column doctor_id drop not null;
  end if;

insert into public.prescription_layouts_unified (
  doctor_id, name, description, orientation, page_size, 
  template_elements, canvas_settings, print_settings,
  is_predefined, is_public, category
) values 
-- Horizontal Classic Template
(
  system_doctor_id, -- Use real doctor or null
  'Clásica Horizontal',
  'Plantilla horizontal tradicional con diseño de dos columnas',
  'landscape',
  'A4',
  '[
    {"id":"header","type":"text","position":{"x":50,"y":30},"size":{"width":1000,"height":80},"content":"{{clinicName}}\n{{doctorName}} - Cédula: {{doctorLicense}}","style":{"fontSize":16,"fontWeight":"bold","textAlign":"center"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"patient_info","type":"box","position":{"x":50,"y":130},"size":{"width":500,"height":200},"content":"","style":{},"zIndex":1,"isVisible":true,"isLocked":false,"borderColor":"#333","backgroundColor":"#f9f9f9"},
    {"id":"patient_data","type":"text","position":{"x":70,"y":150},"size":{"width":460,"height":160},"content":"Paciente: {{patientName}}\nEdad: {{patientAge}}\nFecha: {{date}}\nDiagnóstico: {{diagnosis}}","style":{"fontSize":12,"lineHeight":1.5},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"medications_box","type":"box","position":{"x":570,"y":130},"size":{"width":500,"height":400},"content":"","style":{},"zIndex":1,"isVisible":true,"isLocked":false,"borderColor":"#333","backgroundColor":"#ffffff"},
    {"id":"medications_title","type":"text","position":{"x":590,"y":150},"size":{"width":460,"height":30},"content":"MEDICAMENTOS PRESCRITOS","style":{"fontSize":14,"fontWeight":"bold","textAlign":"center"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"medications_list","type":"text","position":{"x":590,"y":190},"size":{"width":460,"height":320},"content":"{{medications}}","style":{"fontSize":11,"lineHeight":1.4},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"notes_area","type":"text","position":{"x":70,"y":350},"size":{"width":480,"height":180},"content":"Indicaciones adicionales:\n{{notes}}","style":{"fontSize":10,"lineHeight":1.3},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"signature_area","type":"signature","position":{"x":590,"y":550},"size":{"width":200,"height":60},"content":"{{doctorName}}","style":{"fontSize":10,"textAlign":"center"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"qr_code","type":"qr","position":{"x":50,"y":550},"size":{"width":80,"height":80},"content":"{{prescriptionId}}","style":{},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"footer","type":"text","position":{"x":50,"y":650},"size":{"width":1000,"height":40},"content":"Receta médica válida por 30 días - Para dudas contacte al médico","style":{"fontSize":8,"textAlign":"center","color":"#666"},"zIndex":1,"isVisible":true,"isLocked":false}
  ]'::jsonb,
  '{
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "canvasSize": {"width": 1123, "height": 794},
    "pageSize": "A4",
    "margin": "15mm",
    "showGrid": false,
    "zoom": 1
  }'::jsonb,
  '{
    "pageMargins": {"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"},
    "printQuality": "high",
    "colorMode": "color",
    "scaleFactor": 1.0,
    "autoFitContent": true,
    "includeQrCode": true,
    "includeDigitalSignature": true,
    "watermarkText": null
  }'::jsonb,
  true, -- is_predefined
  true, -- is_public
  'horizontal'
),
-- Horizontal Compact Template
(
  system_doctor_id,
  'Compacta Horizontal',
  'Plantilla horizontal compacta para consultorios con espacio limitado',
  'landscape',
  'Letter',
  '[
    {"id":"compact_header","type":"text","position":{"x":30,"y":20},"size":{"width":1000,"height":50},"content":"{{clinicName}} | {{doctorName}} | Tel: {{clinicPhone}}","style":{"fontSize":12,"fontWeight":"bold","textAlign":"center"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"patient_compact","type":"text","position":{"x":30,"y":80},"size":{"width":350,"height":80},"content":"Paciente: {{patientName}}\nEdad: {{patientAge}} | Fecha: {{date}}","style":{"fontSize":10},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"diagnosis_compact","type":"text","position":{"x":400,"y":80},"size":{"width":350,"height":80},"content":"Diagnóstico:\n{{diagnosis}}","style":{"fontSize":10},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"medications_compact","type":"text","position":{"x":30,"y":180},"size":{"width":720,"height":300},"content":"MEDICAMENTOS:\n{{medications}}","style":{"fontSize":11,"lineHeight":1.3},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"footer_compact","type":"text","position":{"x":30,"y":500},"size":{"width":500,"height":40},"content":"{{doctorName}} - Cédula: {{doctorLicense}}","style":{"fontSize":9},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"qr_compact","type":"qr","position":{"x":670,"y":490},"size":{"width":60,"height":60},"content":"{{prescriptionId}}","style":{},"zIndex":1,"isVisible":true,"isLocked":false}
  ]'::jsonb,
  '{
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "canvasSize": {"width": 1056, "height": 816},
    "pageSize": "Letter",
    "margin": "10mm",
    "showGrid": false,
    "zoom": 1
  }'::jsonb,
  '{
    "pageMargins": {"top": "10mm", "right": "10mm", "bottom": "10mm", "left": "10mm"},
    "printQuality": "high",
    "colorMode": "color",
    "scaleFactor": 1.0,
    "autoFitContent": true,
    "includeQrCode": true,
    "includeDigitalSignature": true,
    "watermarkText": null
  }'::jsonb,
  true, -- is_predefined
  true, -- is_public
  'horizontal'
),
-- Modern Horizontal Template
(
  system_doctor_id,
  'Moderna Horizontal',
  'Plantilla horizontal moderna con elementos visuales mejorados',
  'landscape',
  'A4',
  '[
    {"id":"modern_header","type":"box","position":{"x":0,"y":0},"size":{"width":1123,"height":100},"content":"","style":{},"zIndex":1,"isVisible":true,"isLocked":false,"borderColor":"#2563eb","backgroundColor":"#eff6ff"},
    {"id":"clinic_logo","type":"icon","position":{"x":30,"y":20},"size":{"width":60,"height":60},"content":"","style":{"color":"#2563eb"},"zIndex":2,"isVisible":true,"isLocked":false,"iconType":"stethoscope"},
    {"id":"clinic_info","type":"text","position":{"x":110,"y":25},"size":{"width":800,"height":50},"content":"{{clinicName}}\n{{doctorName}} - Cédula Profesional: {{doctorLicense}}","style":{"fontSize":14,"fontWeight":"bold","color":"#1e40af"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"date_modern","type":"text","position":{"x":930,"y":25},"size":{"width":170,"height":50},"content":"{{date}}\n{{time}}","style":{"fontSize":10,"textAlign":"right","color":"#374151"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"patient_section","type":"box","position":{"x":30,"y":120},"size":{"width":350,"height":200},"content":"","style":{},"zIndex":1,"isVisible":true,"isLocked":false,"borderColor":"#10b981","backgroundColor":"#f0fdf4"},
    {"id":"patient_icon","type":"icon","position":{"x":50,"y":140},"size":{"width":30,"height":30},"content":"","style":{"color":"#10b981"},"zIndex":2,"isVisible":true,"isLocked":false,"iconType":"user"},
    {"id":"patient_details","type":"text","position":{"x":90,"y":140},"size":{"width":270,"height":160},"content":"DATOS DEL PACIENTE\n\nNombre: {{patientName}}\nEdad: {{patientAge}}\nPeso: {{patientWeight}}\n\nDiagnóstico:\n{{diagnosis}}","style":{"fontSize":11,"lineHeight":1.4,"color":"#065f46"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"medications_section","type":"box","position":{"x":400,"y":120},"size":{"width":690,"height":400},"content":"","style":{},"zIndex":1,"isVisible":true,"isLocked":false,"borderColor":"#dc2626","backgroundColor":"#fef2f2"},
    {"id":"rx_icon","type":"icon","position":{"x":420,"y":140},"size":{"width":30,"height":30},"content":"","style":{"color":"#dc2626"},"zIndex":2,"isVisible":true,"isLocked":false,"iconType":"pill"},
    {"id":"medications_title","type":"text","position":{"x":460,"y":140},"size":{"width":600,"height":30},"content":"MEDICAMENTOS PRESCRITOS","style":{"fontSize":14,"fontWeight":"bold","color":"#991b1b"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"medications_content","type":"text","position":{"x":420,"y":180},"size":{"width":650,"height":320},"content":"{{medications}}","style":{"fontSize":11,"lineHeight":1.5,"color":"#7f1d1d"},"zIndex":2,"isVisible":true,"isLocked":false},
    {"id":"notes_section","type":"text","position":{"x":30,"y":340},"size":{"width":350,"height":180},"content":"INDICACIONES ESPECIALES:\n\n{{notes}}","style":{"fontSize":10,"lineHeight":1.4,"color":"#374151"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"signature_modern","type":"signature","position":{"x":420,"y":540},"size":{"width":250,"height":80},"content":"{{doctorName}}\nFirma del Médico","style":{"fontSize":10,"textAlign":"center","color":"#374151"},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"qr_modern","type":"qr","position":{"x":30,"y":540},"size":{"width":80,"height":80},"content":"{{prescriptionId}}","style":{},"zIndex":1,"isVisible":true,"isLocked":false},
    {"id":"validity_info","type":"text","position":{"x":700,"y":540},"size":{"width":390,"height":80},"content":"Receta válida por 30 días\nPara dudas: {{clinicPhone}}\n{{clinicEmail}}","style":{"fontSize":8,"textAlign":"right","color":"#6b7280"},"zIndex":1,"isVisible":true,"isLocked":false}
  ]'::jsonb,
  '{
    "backgroundColor": "#ffffff",
    "backgroundImage": null,
    "canvasSize": {"width": 1123, "height": 794},
    "pageSize": "A4",
    "margin": "15mm",
    "showGrid": false,
    "zoom": 1
  }'::jsonb,
  '{
    "pageMargins": {"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"},
    "printQuality": "high",
    "colorMode": "color",
    "scaleFactor": 1.0,
    "autoFitContent": true,
    "includeQrCode": true,
    "includeDigitalSignature": true,
    "watermarkText": null
  }'::jsonb,
  true, -- is_predefined
  true, -- is_public
  'horizontal'
)
on conflict (doctor_id, name) do nothing;

end $$;

-- Create trigger to auto-update updated_at
create or replace function update_prescription_layout_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prescription_layouts_updated_at
  before update on public.prescription_layouts_unified
  for each row execute function update_prescription_layout_updated_at();

-- Create function to increment usage count
create or replace function increment_layout_usage(layout_id uuid)
returns void as $$
begin
  update public.prescription_layouts_unified
  set usage_count = usage_count + 1,
      last_used_at = now()
  where id = layout_id;
end;
$$ language plpgsql;

commit;
