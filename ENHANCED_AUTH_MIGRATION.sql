-- ==========================================
-- MIGRACIÓN MEJORADA DEL SISTEMA DE AUTENTICACIÓN
-- ExpedienteDLM - Sistema Multi-Rol
-- ==========================================

-- 1. CREAR TABLA DE CLÍNICAS/INSTITUCIONES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'private_practice', 'other')),
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  license_number TEXT,
  director_name TEXT,
  director_license TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREAR TABLA MEJORADA DE ROLES Y PERMISOS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar roles predefinidos
INSERT INTO public.user_roles (name, display_name, description, permissions) VALUES
('super_admin', 'Super Administrador', 'Control total del sistema', '{"all": true}'),
('doctor', 'Doctor/Médico', 'Médico certificado con acceso a pacientes', '{"patients": ["read", "write"], "consultations": ["read", "write"], "prescriptions": ["read", "write"]}'),
('patient', 'Paciente', 'Usuario paciente con acceso limitado', '{"own_data": ["read"], "appointments": ["read", "create"]}'),
('health_staff', 'Personal de Salud', 'Enfermería, fisioterapia, dentistas, etc.', '{"patients": ["read"], "consultations": ["read", "write"], "assistance": ["read", "write"]}'),
('admin_staff', 'Personal Administrativo', 'Administradores de clínica', '{"clinic_users": ["read", "write"], "clinic_patients": ["read"], "reports": ["read"], "billing": ["read", "write"]}')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- 3. CREAR TABLA DE ESPECIALIDADES MÉDICAS AMPLIADA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.medical_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medical', 'surgical', 'diagnostic', 'therapy', 'nursing', 'administration')),
  description TEXT,
  requires_license BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar especialidades médicas
INSERT INTO public.medical_specialties (name, category, description, requires_license) VALUES
-- Especialidades Médicas
('Medicina General', 'medical', 'Atención médica general', true),
('Medicina Interna', 'medical', 'Medicina interna de adultos', true),
('Pediatría', 'medical', 'Medicina pediátrica', true),
('Cardiología', 'medical', 'Enfermedades del corazón', true),
('Neurología', 'medical', 'Enfermedades del sistema nervioso', true),
('Endocrinología', 'medical', 'Enfermedades endocrinas', true),
('Gastroenterología', 'medical', 'Enfermedades digestivas', true),
('Nefrología', 'medical', 'Enfermedades renales', true),
('Neumología', 'medical', 'Enfermedades respiratorias', true),
('Reumatología', 'medical', 'Enfermedades reumáticas', true),
('Dermatología', 'medical', 'Enfermedades de la piel', true),
('Psiquiatría', 'medical', 'Salud mental', true),
('Oncología', 'medical', 'Tratamiento del cáncer', true),
('Geriatría', 'medical', 'Medicina geriátrica', true),
('Medicina de Urgencias', 'medical', 'Medicina de emergencias', true),

-- Especialidades Quirúrgicas
('Cirugía General', 'surgical', 'Cirugía general', true),
('Cirugía Cardiovascular', 'surgical', 'Cirugía del corazón', true),
('Neurocirugía', 'surgical', 'Cirugía del sistema nervioso', true),
('Ortopedia y Traumatología', 'surgical', 'Cirugía de huesos y articulaciones', true),
('Urología', 'surgical', 'Cirugía urológica', true),
('Oftalmología', 'surgical', 'Cirugía ocular', true),
('Otorrinolaringología', 'surgical', 'Cirugía de oído, nariz y garganta', true),
('Cirugía Plástica', 'surgical', 'Cirugía estética y reconstructiva', true),
('Ginecología y Obstetricia', 'surgical', 'Salud femenina y reproductiva', true),

-- Especialidades Diagnósticas
('Radiología', 'diagnostic', 'Diagnóstico por imágenes', true),
('Patología', 'diagnostic', 'Diagnóstico anatomopatológico', true),
('Medicina Nuclear', 'diagnostic', 'Diagnóstico nuclear', true),
('Laboratorio Clínico', 'diagnostic', 'Análisis clínicos', true),

-- Terapias
('Fisioterapia', 'therapy', 'Terapia física y rehabilitación', true),
('Terapia Respiratoria', 'therapy', 'Terapia respiratoria', true),
('Psicología Clínica', 'therapy', 'Terapia psicológica', true),
('Nutrición Clínica', 'therapy', 'Terapia nutricional', true),
('Terapia Ocupacional', 'therapy', 'Terapia ocupacional', true),

-- Enfermería
('Enfermería General', 'nursing', 'Cuidados de enfermería general', true),
('Enfermería Especializada', 'nursing', 'Cuidados especializados', true),
('Enfermería de Urgencias', 'nursing', 'Cuidados en emergencias', true),
('Enfermería Quirúrgica', 'nursing', 'Cuidados perioperatorios', true),

-- Odontología
('Odontología General', 'medical', 'Atención dental general', true),
('Ortodoncia', 'medical', 'Corrección dental', true),
('Endodoncia', 'medical', 'Tratamiento de conductos', true),
('Periodoncia', 'medical', 'Tratamiento de encías', true),
('Cirugía Oral', 'surgical', 'Cirugía oral y maxilofacial', true),

-- Administración
('Administración Hospitalaria', 'administration', 'Gestión hospitalaria', false),
('Gestión de Calidad', 'administration', 'Control de calidad médica', false),
('Facturación Médica', 'administration', 'Facturación y seguros', false)
ON CONFLICT (name) DO NOTHING;

-- 4. ACTUALIZAR TABLA PROFILES PARA SOPORTE MULTI-ROL
-- ==========================================

-- Primero, hacer backup de la tabla actual
CREATE TABLE IF NOT EXISTS public.profiles_backup AS TABLE public.profiles;

-- Agregar nuevas columnas a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id),
ADD COLUMN IF NOT EXISTS user_role_id UUID REFERENCES public.user_roles(id),
ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.medical_specialties(id),
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_info JSONB DEFAULT '{}';

-- Actualizar constraint de role para incluir nuevos roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'doctor', 'patient', 'health_staff', 'admin_staff'));

-- 5. CREAR TABLA DE PACIENTES MEJORADA
-- ==========================================

-- Agregar relación con clínica a pacientes existentes
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id),
ADD COLUMN IF NOT EXISTS primary_doctor_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS insurance_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 6. CREAR TABLA DE RELACIONES CLÍNICA-USUARIO
-- ==========================================

CREATE TABLE IF NOT EXISTS public.clinic_user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_clinic TEXT NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  permissions_override JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, user_id)
);

-- 7. FUNCIONES AUXILIARES
-- ==========================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la clínica del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_clinic()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT clinic_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede acceder a datos de una clínica
CREATE OR REPLACE FUNCTION can_access_clinic_data(target_clinic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_clinic_id UUID;
BEGIN
  SELECT role, clinic_id INTO user_role, user_clinic_id
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Super admin puede acceder a todo
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Otros roles solo pueden acceder a su propia clínica
  RETURN user_clinic_id = target_clinic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ==========================================

-- Trigger para updated_at en clinics
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_clinics
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_clinic_relationships
  BEFORE UPDATE ON public.clinic_user_relationships
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 9. ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role_id ON public.profiles(user_role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_specialty_id ON public.profiles(specialty_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_doctor_id ON public.patients(primary_doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinic_relationships_clinic ON public.clinic_user_relationships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_relationships_user ON public.clinic_user_relationships(user_id);

-- ==========================================
-- ✅ MIGRACIÓN DE ESQUEMA COMPLETADA
-- ==========================================
-- Esta migración prepara la base de datos para:
-- 1. Sistema multi-rol completo
-- 2. Gestión de clínicas
-- 3. Relaciones usuario-clínica
-- 4. Especialidades médicas expandidas
-- 5. Permisos granulares
-- ==========================================