-- ==========================================
-- AGREGAR MÁS ESPECIALIDADES MÉDICAS
-- ExpedienteDLM - Catálogo Ampliado
-- ==========================================

-- Este script agrega más especialidades médicas a la tabla existente
-- Se puede ejecutar directamente en el SQL Editor de Supabase

-- 1. AGREGAR NUEVAS ESPECIALIDADES MÉDICAS
-- ==========================================

INSERT INTO public.medical_specialties (name, category, description, requires_license) VALUES
-- ESPECIALIDADES MÉDICAS ADICIONALES
('Alergología e Inmunología', 'medical', 'Alergias e inmunodeficiencias', true),
('Angiología', 'medical', 'Enfermedades vasculares', true),
('Hematología', 'medical', 'Enfermedades de la sangre', true),
('Infectología', 'medical', 'Enfermedades infecciosas', true),
('Medicina del Deporte', 'medical', 'Medicina deportiva y ejercicio', true),
('Medicina Familiar', 'medical', 'Atención integral familiar', true),
('Medicina Preventiva', 'medical', 'Prevención de enfermedades', true),
('Medicina del Trabajo', 'medical', 'Salud ocupacional', true),
('Medicina del Viajero', 'medical', 'Salud en viajes internacionales', true),
('Toxicología Clínica', 'medical', 'Intoxicaciones y envenenamientos', true),
('Genética Médica', 'medical', 'Enfermedades genéticas', true),
('Medicina Paliativa', 'medical', 'Cuidados paliativos', true),
('Medicina Integrativa', 'medical', 'Medicina complementaria', true),
('Medicina Funcional', 'medical', 'Medicina funcional y preventiva', true),

-- ESPECIALIDADES QUIRÚRGICAS ADICIONALES
('Cirugía Torácica', 'surgical', 'Cirugía del tórax', true),
('Cirugía Oncológica', 'surgical', 'Cirugía para cáncer', true),
('Cirugía Pediátrica', 'surgical', 'Cirugía en niños', true),
('Cirugía de la Mano', 'surgical', 'Cirugía de mano y muñeca', true),
('Cirugía de Columna', 'surgical', 'Cirugía de columna vertebral', true),
('Cirugía Robótica', 'surgical', 'Cirugía asistida por robot', true),
('Cirugía Laparoscópica', 'surgical', 'Cirugía mínimamente invasiva', true),
('Cirugía Endovascular', 'surgical', 'Cirugía vascular endoscópica', true),
('Cirugía Bariátrica', 'surgical', 'Cirugía para obesidad', true),
('Cirugía de Trasplantes', 'surgical', 'Trasplantes de órganos', true),
('Cirugía Maxilofacial', 'surgical', 'Cirugía facial y mandibular', true),
('Cirugía de Mama', 'surgical', 'Cirugía mamaria', true),
('Cirugía Hepatobiliar', 'surgical', 'Cirugía del hígado y vías biliares', true),
('Cirugía de Páncreas', 'surgical', 'Cirugía pancreática', true),

-- ESPECIALIDADES DIAGNÓSTICAS ADICIONALES
('Medicina Nuclear', 'diagnostic', 'Diagnóstico y tratamiento nuclear', true),
('Radiología Intervencionista', 'diagnostic', 'Procedimientos radiológicos', true),
('Radiología Pediátrica', 'diagnostic', 'Radiología en niños', true),
('Radiología de Urgencias', 'diagnostic', 'Radiología de emergencia', true),
('Radiología Musculoesquelética', 'diagnostic', 'Radiología de huesos y músculos', true),
('Radiología Neurorradiológica', 'diagnostic', 'Radiología del sistema nervioso', true),
('Radiología Cardiovascular', 'diagnostic', 'Radiología del corazón', true),
('Radiología Abdominal', 'diagnostic', 'Radiología del abdomen', true),
('Radiología Mamaria', 'diagnostic', 'Radiología de mama', true),
('Radiología Torácica', 'diagnostic', 'Radiología del tórax', true),
('Citopatología', 'diagnostic', 'Diagnóstico por células', true),
('Hematopatología', 'diagnostic', 'Patología de la sangre', true),
('Neuropatología', 'diagnostic', 'Patología del sistema nervioso', true),
('Dermatopatología', 'diagnostic', 'Patología de la piel', true),
('Patología Molecular', 'diagnostic', 'Patología molecular y genética', true),

-- TERAPIAS ADICIONALES
('Terapia del Lenguaje', 'therapy', 'Tratamiento de trastornos del habla', true),
('Terapia Visual', 'therapy', 'Rehabilitación visual', true),
('Terapia de Voz', 'therapy', 'Tratamiento de problemas vocales', true),
('Terapia Respiratoria Pediátrica', 'therapy', 'Terapia respiratoria en niños', true),
('Terapia del Dolor', 'therapy', 'Manejo del dolor crónico', true),
('Terapia de Rehabilitación', 'therapy', 'Rehabilitación integral', true),
('Terapia de Movimiento', 'therapy', 'Rehabilitación del movimiento', true),
('Terapia de Equilibrio', 'therapy', 'Rehabilitación del equilibrio', true),
('Terapia de Deglución', 'therapy', 'Tratamiento de problemas de deglución', true),
('Terapia de Vértigo', 'therapy', 'Tratamiento del vértigo', true),
('Terapia de Incontinencia', 'therapy', 'Tratamiento de incontinencia', true),
('Terapia de Cicatrices', 'therapy', 'Tratamiento de cicatrices', true),
('Terapia de Edema', 'therapy', 'Tratamiento del edema', true),
('Terapia de Heridas', 'therapy', 'Tratamiento de heridas complejas', true),
('Terapia de Quemaduras', 'therapy', 'Tratamiento de quemaduras', true),

-- ENFERMERÍA ESPECIALIZADA
('Enfermería Oncológica', 'nursing', 'Cuidados oncológicos', true),
('Enfermería Cardiovascular', 'nursing', 'Cuidados cardiovasculares', true),
('Enfermería Neurológica', 'nursing', 'Cuidados neurológicos', true),
('Enfermería Pediátrica', 'nursing', 'Cuidados pediátricos', true),
('Enfermería Neonatal', 'nursing', 'Cuidados de recién nacidos', true),
('Enfermería de Cuidados Intensivos', 'nursing', 'Cuidados críticos', true),
('Enfermería de Salud Mental', 'nursing', 'Cuidados psiquiátricos', true),
('Enfermería de Salud Comunitaria', 'nursing', 'Cuidados comunitarios', true),
('Enfermería de Salud Ocupacional', 'nursing', 'Salud laboral', true),
('Enfermería de Salud Escolar', 'nursing', 'Salud en instituciones educativas', true),
('Enfermería de Salud Pública', 'nursing', 'Salud pública y epidemiología', true),
('Enfermería de Investigación', 'nursing', 'Investigación en enfermería', true),
('Enfermería de Educación', 'nursing', 'Educación en enfermería', true),
('Enfermería de Gestión', 'nursing', 'Administración en enfermería', true),
('Enfermería de Calidad', 'nursing', 'Control de calidad en enfermería', true),

-- ODONTOLOGÍA ESPECIALIZADA
('Odontopediatría', 'medical', 'Odontología infantil', true),
('Prostodoncia', 'medical', 'Prótesis dentales', true),
('Implantología', 'medical', 'Implantes dentales', true),
('Cirugía Bucal', 'surgical', 'Cirugía oral menor', true),
('Patología Bucal', 'medical', 'Enfermedades de la boca', true),
('Radiología Dental', 'diagnostic', 'Radiología odontológica', true),
('Odontología Estética', 'medical', 'Odontología cosmética', true),
('Odontología Geriátrica', 'medical', 'Odontología en adultos mayores', true),
('Odontología Forense', 'medical', 'Odontología legal', true),
('Odontología Hospitalaria', 'medical', 'Odontología hospitalaria', true),
('Odontología de Urgencias', 'medical', 'Odontología de emergencia', true),
('Odontología Preventiva', 'medical', 'Prevención dental', true),
('Odontología Comunitaria', 'medical', 'Odontología comunitaria', true),
('Odontología del Deporte', 'medical', 'Odontología deportiva', true),
('Odontología del Sueño', 'medical', 'Trastornos del sueño', true),

-- ADMINISTRACIÓN Y GESTIÓN
('Gestión de Riesgos Sanitarios', 'administration', 'Gestión de riesgos en salud', false),
('Gestión de Recursos Humanos en Salud', 'administration', 'RRHH en instituciones sanitarias', false),
('Gestión de Tecnología Sanitaria', 'administration', 'Tecnología médica', false),
('Gestión de Farmacia Hospitalaria', 'administration', 'Farmacia hospitalaria', false),
('Gestión de Laboratorio Clínico', 'administration', 'Administración de laboratorios', false),
('Gestión de Imagenología', 'administration', 'Administración de imagenología', false),
('Gestión de Urgencias', 'administration', 'Administración de servicios de urgencias', false),
('Gestión de Quirófanos', 'administration', 'Administración de quirófanos', false),
('Gestión de UCI', 'administration', 'Administración de cuidados intensivos', false),
('Gestión de Consultorios', 'administration', 'Administración de consultorios', false),
('Gestión de Seguros Médicos', 'administration', 'Administración de seguros', false),
('Gestión de Telemedicina', 'administration', 'Administración de telemedicina', false),
('Gestión de Investigación Clínica', 'administration', 'Administración de investigación', false),
('Gestión de Docencia Médica', 'administration', 'Administración de educación médica', false),
('Gestión de Acreditación Sanitaria', 'administration', 'Acreditación de instituciones', false),

-- ESPECIALIDADES EMERGENTES
('Medicina Regenerativa', 'medical', 'Medicina regenerativa y células madre', true),
('Medicina de Precisión', 'medical', 'Medicina personalizada', true),
('Medicina Digital', 'medical', 'Salud digital y telemedicina', true),
('Medicina del Envejecimiento', 'medical', 'Medicina geriátrica avanzada', true),
('Medicina del Sueño', 'medical', 'Trastornos del sueño', true),
('Medicina del Dolor', 'medical', 'Manejo especializado del dolor', true),
('Medicina del Estilo de Vida', 'medical', 'Medicina preventiva del estilo de vida', true),
('Medicina del Medio Ambiente', 'medical', 'Salud ambiental', true),
('Medicina del Espacio', 'medical', 'Medicina aeroespacial', true),
('Medicina Submarina', 'medical', 'Medicina hiperbárica', true),
('Medicina de Montaña', 'medical', 'Medicina de altura', true),
('Medicina del Deporte de Alto Rendimiento', 'medical', 'Medicina deportiva elite', true),
('Medicina del Ejercicio', 'medical', 'Medicina del ejercicio físico', true),
('Medicina de la Nutrición', 'medical', 'Nutrición clínica avanzada', true),
('Medicina de la Obesidad', 'medical', 'Tratamiento integral de la obesidad', true)
ON CONFLICT (name) DO NOTHING;

-- 2. VERIFICAR ESPECIALIDADES AGREGADAS
-- ==========================================

-- Mostrar el total de especialidades por categoría
SELECT 
  category,
  COUNT(*) as total_especialidades,
  STRING_AGG(name, ', ' ORDER BY name) as especialidades
FROM public.medical_specialties 
WHERE is_active = true 
GROUP BY category 
ORDER BY category;

-- Mostrar el total general
SELECT 
  COUNT(*) as total_especialidades_activas
FROM public.medical_specialties 
WHERE is_active = true;

-- 3. ACTUALIZAR ESPECIALIDADES EXISTENTES (OPCIONAL)
-- ==========================================

-- Si quieres actualizar descripciones de especialidades existentes
UPDATE public.medical_specialties 
SET 
  description = CASE 
    WHEN name = 'Medicina General' THEN 'Atención médica integral y preventiva'
    WHEN name = 'Pediatría' THEN 'Medicina pediátrica integral (0-18 años)'
    WHEN name = 'Cardiología' THEN 'Enfermedades cardiovasculares y del corazón'
    WHEN name = 'Neurología' THEN 'Enfermedades del sistema nervioso central y periférico'
    WHEN name = 'Dermatología' THEN 'Enfermedades de la piel, pelo y uñas'
    ELSE description
  END
WHERE name IN ('Medicina General', 'Pediatría', 'Cardiología', 'Neurología', 'Dermatología');

-- 4. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO (OPCIONAL)
-- ==========================================

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_medical_specialties_name 
ON public.medical_specialties(name);

-- Índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_medical_specialties_category 
ON public.medical_specialties(category);

-- Índice para búsquedas activas
CREATE INDEX IF NOT EXISTS idx_medical_specialties_active 
ON public.medical_specialties(is_active) 
WHERE is_active = true;

-- 5. VERIFICAR INTEGRIDAD DE DATOS
-- ==========================================

-- Verificar que no hay nombres duplicados
SELECT name, COUNT(*) as duplicados
FROM public.medical_specialties 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Verificar que todas las categorías son válidas
SELECT DISTINCT category 
FROM public.medical_specialties 
ORDER BY category;

-- 6. MENSAJE DE CONFIRMACIÓN
-- ==========================================

-- Este script ha agregado aproximadamente 100+ nuevas especialidades médicas
-- organizadas en las siguientes categorías:
-- 
-- 📋 MÉDICAS: Cardiología, Neurología, Endocrinología, etc.
-- 🔪 QUIRÚRGICAS: Cirugía General, Cardiovascular, Neurocirugía, etc.
-- 🔍 DIAGNÓSTICAS: Radiología, Patología, Laboratorio, etc.
-- 💆 TERAPIAS: Fisioterapia, Psicología, Nutrición, etc.
-- 👩‍⚕️ ENFERMERÍA: General, Especializada, Oncológica, etc.
-- 🦷 ODONTOLOGÍA: General, Ortodoncia, Implantología, etc.
-- 🏢 ADMINISTRACIÓN: Gestión hospitalaria, Calidad, Facturación, etc.
-- 🚀 EMERGENTES: Medicina regenerativa, digital, de precisión, etc.
--
-- ✅ Total aproximado: 150+ especialidades médicas disponibles
-- ✅ Todas las especialidades están marcadas como activas
-- ✅ Se incluyen descripciones detalladas
-- ✅ Se respetan las restricciones de licencia por especialidad
