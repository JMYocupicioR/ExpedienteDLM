/*
  # Sistema de Gestión de Pacientes

  1. Nuevas Tablas
    - `patients`: Información básica de pacientes
      - `id` (uuid, clave primaria)
      - `full_name` (texto)
      - `birth_date` (fecha)
      - `gender` (texto)
      - `email` (texto)
      - `phone` (texto)
      - `address` (texto)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `medical_records`: Expedientes médicos
      - `id` (uuid, clave primaria)
      - `patient_id` (uuid, referencia a patients)
      - `medical_history` (texto)
      - `allergies` (texto[])
      - `medications` (texto[])
      - `notes` (texto)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `attachments`: Archivos adjuntos
      - `id` (uuid, clave primaria)
      - `medical_record_id` (uuid, referencia a medical_records)
      - `file_name` (texto)
      - `file_type` (texto)
      - `file_url` (texto)
      - `created_at` (timestamp)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para médicos y administradores
*/

-- Crear tabla de pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT CHECK (gender IN ('masculino', 'femenino', 'otro')),
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de expedientes médicos
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_history TEXT,
  allergies TEXT[],
  medications TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de archivos adjuntos
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "El personal médico puede ver pacientes"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    is_doctor() OR
    is_nurse()
  );

CREATE POLICY "El personal médico puede gestionar pacientes"
  ON public.patients
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    is_doctor()
  );

CREATE POLICY "El personal médico puede ver expedientes"
  ON public.medical_records
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    is_doctor() OR
    is_nurse()
  );

CREATE POLICY "El personal médico puede gestionar expedientes"
  ON public.medical_records
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    is_doctor()
  );

CREATE POLICY "El personal médico puede ver archivos"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    is_doctor() OR
    is_nurse()
  );

CREATE POLICY "El personal médico puede gestionar archivos"
  ON public.attachments
  FOR ALL
  TO authenticated
  USING (
    is_admin() OR
    is_doctor()
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_medical_records
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();