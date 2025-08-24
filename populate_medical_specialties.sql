-- =====================================================
-- POBLAR TABLA MEDICAL_SPECIALTIES
-- Script para agregar especialidades médicas básicas
-- =====================================================

-- Limpiar tabla si existe
DELETE FROM public.medical_specialties;

-- Insertar especialidades médicas básicas
INSERT INTO public.medical_specialties (id, name, category, description, requires_license, is_active, created_at) VALUES 
-- Especialidades Básicas
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Medicina General', 'Atención Primaria', 'Medicina general y atención primaria de salud', true, true, NOW()),
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Medicina Interna', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades internas del adulto', true, true, NOW()),
('c3d4e5f6-g7h8-9012-cdef-345678901234', 'Pediatría', 'Especialidades Médicas', 'Atención médica de niños y adolescentes', true, true, NOW()),
('d4e5f6g7-h8i9-0123-defg-456789012345', 'Ginecología y Obstetricia', 'Especialidades Médicas', 'Salud reproductiva femenina y atención del embarazo', true, true, NOW()),
('e5f6g7h8-i9j0-1234-efgh-567890123456', 'Cardiología', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades del corazón', true, true, NOW()),

-- Especialidades Quirúrgicas
('f6g7h8i9-j0k1-2345-fghi-678901234567', 'Cirugía General', 'Especialidades Quirúrgicas', 'Procedimientos quirúrgicos generales', true, true, NOW()),
('g7h8i9j0-k1l2-3456-ghij-789012345678', 'Traumatología y Ortopedia', 'Especialidades Quirúrgicas', 'Tratamiento de lesiones del sistema musculoesquelético', true, true, NOW()),
('h8i9j0k1-l2m3-4567-hijk-890123456789', 'Neurocirugía', 'Especialidades Quirúrgicas', 'Cirugía del sistema nervioso', true, true, NOW()),
('i9j0k1l2-m3n4-5678-ijkl-901234567890', 'Cirugía Plástica', 'Especialidades Quirúrgicas', 'Cirugía reconstructiva y estética', true, true, NOW()),

-- Diagnóstico
('j0k1l2m3-n4o5-6789-jklm-012345678901', 'Radiología', 'Diagnóstico por Imagen', 'Interpretación de estudios de imagen médica', true, true, NOW()),
('k1l2m3n4-o5p6-7890-klmn-123456789012', 'Patología', 'Diagnóstico', 'Diagnóstico de enfermedades mediante análisis de tejidos', true, true, NOW()),
('l2m3n4o5-p6q7-8901-lmno-234567890123', 'Laboratorio Clínico', 'Diagnóstico', 'Análisis de muestras biológicas', true, true, NOW()),

-- Salud Mental
('m3n4o5p6-q7r8-9012-mnop-345678901234', 'Psiquiatría', 'Salud Mental', 'Diagnóstico y tratamiento de trastornos mentales', true, true, NOW()),
('n4o5p6q7-r8s9-0123-nopq-456789012345', 'Psicología Clínica', 'Salud Mental', 'Evaluación y tratamiento psicológico', true, true, NOW()),

-- Especialidades de Apoyo
('o5p6q7r8-s9t0-1234-opqr-567890123456', 'Anestesiología', 'Especialidades de Apoyo', 'Manejo anestésico durante procedimientos', true, true, NOW()),
('p6q7r8s9-t0u1-2345-pqrs-678901234567', 'Medicina de Rehabilitación', 'Especialidades de Apoyo', 'Rehabilitación y medicina física', true, true, NOW()),
('q7r8s9t0-u1v2-3456-qrst-789012345678', 'Medicina del Trabajo', 'Especialidades de Apoyo', 'Salud ocupacional y medicina laboral', true, true, NOW()),

-- Especialidades Adicionales
('r8s9t0u1-v2w3-4567-rstu-890123456789', 'Dermatología', 'Especialidades Médicas', 'Enfermedades de la piel', true, true, NOW()),
('s9t0u1v2-w3x4-5678-stuv-901234567890', 'Oftalmología', 'Especialidades Médicas', 'Enfermedades de los ojos', true, true, NOW()),
('t0u1v2w3-x4y5-6789-tuvw-012345678901', 'Otorrinolaringología', 'Especialidades Médicas', 'Enfermedades del oído, nariz y garganta', true, true, NOW()),
('u1v2w3x4-y5z6-7890-uvwx-123456789012', 'Urología', 'Especialidades Médicas', 'Enfermedades del sistema genitourinario', true, true, NOW()),
('v2w3x4y5-z6a7-8901-vwxy-234567890123', 'Endocrinología', 'Especialidades Médicas', 'Trastornos hormonales y metabólicos', true, true, NOW()),
('w3x4y5z6-a7b8-9012-wxyz-345678901234', 'Neumología', 'Especialidades Médicas', 'Enfermedades del sistema respiratorio', true, true, NOW()),
('x4y5z6a7-b8c9-0123-xyza-456789012345', 'Gastroenterología', 'Especialidades Médicas', 'Enfermedades del sistema digestivo', true, true, NOW()),
('y5z6a7b8-c9d0-1234-yzab-567890123456', 'Nefrología', 'Especialidades Médicas', 'Enfermedades de los riñones', true, true, NOW()),
('z6a7b8c9-d0e1-2345-zabc-678901234567', 'Hematología', 'Especialidades Médicas', 'Enfermedades de la sangre', true, true, NOW()),
('a7b8c9d0-e1f2-3456-abcd-789012345678', 'Infectología', 'Especialidades Médicas', 'Enfermedades infecciosas', true, true, NOW()),
('b8c9d0e1-f2g3-4567-bcde-890123456789', 'Geriatría', 'Especialidades Médicas', 'Atención médica de adultos mayores', true, true, NOW()),
('c9d0e1f2-g3h4-5678-cdef-901234567890', 'Medicina de Urgencias', 'Atención Crítica', 'Atención médica de emergencias', true, true, NOW()),
('d0e1f2g3-h4i5-6789-defg-012345678901', 'Medicina Intensiva', 'Atención Crítica', 'Cuidados intensivos y críticos', true, true, NOW());

-- Verificar inserción
SELECT COUNT(*) as total_especialidades FROM public.medical_specialties WHERE is_active = true;