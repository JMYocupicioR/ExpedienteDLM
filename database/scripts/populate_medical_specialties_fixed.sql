-- =====================================================
-- POBLAR TABLA MEDICAL_SPECIALTIES (CORREGIDO)
-- Script para agregar especialidades médicas básicas con UUIDs válidos
-- =====================================================

-- Limpiar tabla si existe
DELETE FROM public.medical_specialties;

-- Insertar especialidades médicas básicas usando gen_random_uuid() o UUIDs válidos
INSERT INTO public.medical_specialties (id, name, category, description, requires_license, is_active, created_at) VALUES 
-- Especialidades Básicas
('550e8400-e29b-41d4-a716-446655440001', 'Medicina General', 'Atención Primaria', 'Medicina general y atención primaria de salud', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Medicina Interna', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades internas del adulto', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Pediatría', 'Especialidades Médicas', 'Atención médica de niños y adolescentes', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Ginecología y Obstetricia', 'Especialidades Médicas', 'Salud reproductiva femenina y atención del embarazo', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Cardiología', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades del corazón', true, true, NOW()),

-- Especialidades Quirúrgicas
('550e8400-e29b-41d4-a716-446655440006', 'Cirugía General', 'Especialidades Quirúrgicas', 'Procedimientos quirúrgicos generales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'Traumatología y Ortopedia', 'Especialidades Quirúrgicas', 'Tratamiento de lesiones del sistema musculoesquelético', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'Neurocirugía', 'Especialidades Quirúrgicas', 'Cirugía del sistema nervioso', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'Cirugía Plástica', 'Especialidades Quirúrgicas', 'Cirugía reconstructiva y estética', true, true, NOW()),

-- Diagnóstico
('550e8400-e29b-41d4-a716-446655440010', 'Radiología', 'Diagnóstico por Imagen', 'Interpretación de estudios de imagen médica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'Patología', 'Diagnóstico', 'Diagnóstico de enfermedades mediante análisis de tejidos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'Laboratorio Clínico', 'Diagnóstico', 'Análisis de muestras biológicas', true, true, NOW()),

-- Salud Mental
('550e8400-e29b-41d4-a716-446655440013', 'Psiquiatría', 'Salud Mental', 'Diagnóstico y tratamiento de trastornos mentales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440014', 'Psicología Clínica', 'Salud Mental', 'Evaluación y tratamiento psicológico', true, true, NOW()),

-- Especialidades de Apoyo
('550e8400-e29b-41d4-a716-446655440015', 'Anestesiología', 'Especialidades de Apoyo', 'Manejo anestésico durante procedimientos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440016', 'Medicina de Rehabilitación', 'Especialidades de Apoyo', 'Rehabilitación y medicina física', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440017', 'Medicina del Trabajo', 'Especialidades de Apoyo', 'Salud ocupacional y medicina laboral', true, true, NOW()),

-- Especialidades Adicionales
('550e8400-e29b-41d4-a716-446655440018', 'Dermatología', 'Especialidades Médicas', 'Enfermedades de la piel', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440019', 'Oftalmología', 'Especialidades Médicas', 'Enfermedades de los ojos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440020', 'Otorrinolaringología', 'Especialidades Médicas', 'Enfermedades del oído, nariz y garganta', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440021', 'Urología', 'Especialidades Médicas', 'Enfermedades del sistema genitourinario', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440022', 'Endocrinología', 'Especialidades Médicas', 'Trastornos hormonales y metabólicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440023', 'Neumología', 'Especialidades Médicas', 'Enfermedades del sistema respiratorio', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440024', 'Gastroenterología', 'Especialidades Médicas', 'Enfermedades del sistema digestivo', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440025', 'Nefrología', 'Especialidades Médicas', 'Enfermedades de los riñones', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440026', 'Hematología', 'Especialidades Médicas', 'Enfermedades de la sangre', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440027', 'Infectología', 'Especialidades Médicas', 'Enfermedades infecciosas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440028', 'Geriatría', 'Especialidades Médicas', 'Atención médica de adultos mayores', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440029', 'Medicina de Urgencias', 'Atención Crítica', 'Atención médica de emergencias', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440030', 'Medicina Intensiva', 'Atención Crítica', 'Cuidados intensivos y críticos', true, true, NOW());

-- Verificar inserción
SELECT COUNT(*) as total_especialidades FROM public.medical_specialties WHERE is_active = true;

-- Mostrar algunas especialidades para verificar
SELECT id, name, category FROM public.medical_specialties ORDER BY name LIMIT 10;