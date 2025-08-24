-- =====================================================
-- ESPECIALIDADES MÉDICAS COMPLETAS (200+)
-- Catálogo completo para ExpedienteDLM
-- =====================================================

-- Limpiar tabla existente
DELETE FROM public.medical_specialties;

-- Insertar especialidades médicas completas usando UUIDs válidos
INSERT INTO public.medical_specialties (id, name, category, description, requires_license, is_active, created_at) VALUES 

-- === ATENCIÓN PRIMARIA ===
('550e8400-e29b-41d4-a716-446655440001', 'Medicina General', 'Atención Primaria', 'Medicina general y atención primaria de salud', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Medicina Familiar', 'Atención Primaria', 'Medicina familiar y comunitaria', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Medicina Preventiva', 'Atención Primaria', 'Prevención y promoción de la salud', true, true, NOW()),

-- === ESPECIALIDADES MÉDICAS BÁSICAS ===
('550e8400-e29b-41d4-a716-446655440004', 'Medicina Interna', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades internas del adulto', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Pediatría', 'Especialidades Médicas', 'Atención médica de niños y adolescentes', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'Ginecología y Obstetricia', 'Especialidades Médicas', 'Salud reproductiva femenina y atención del embarazo', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'Cardiología', 'Especialidades Médicas', 'Diagnóstico y tratamiento de enfermedades del corazón', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'Dermatología', 'Especialidades Médicas', 'Enfermedades de la piel', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'Endocrinología', 'Especialidades Médicas', 'Trastornos hormonales y metabólicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440010', 'Gastroenterología', 'Especialidades Médicas', 'Enfermedades del sistema digestivo', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'Hematología', 'Especialidades Médicas', 'Enfermedades de la sangre', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'Infectología', 'Especialidades Médicas', 'Enfermedades infecciosas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440013', 'Nefrología', 'Especialidades Médicas', 'Enfermedades de los riñones', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440014', 'Neumología', 'Especialidades Médicas', 'Enfermedades del sistema respiratorio', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440015', 'Neurología', 'Especialidades Médicas', 'Enfermedades del sistema nervioso', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440016', 'Oncología', 'Especialidades Médicas', 'Diagnóstico y tratamiento del cáncer', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440017', 'Reumatología', 'Especialidades Médicas', 'Enfermedades del aparato locomotor', true, true, NOW()),

-- === ESPECIALIDADES QUIRÚRGICAS ===
('550e8400-e29b-41d4-a716-446655440018', 'Cirugía General', 'Especialidades Quirúrgicas', 'Procedimientos quirúrgicos generales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440019', 'Cirugía Cardiovascular', 'Especialidades Quirúrgicas', 'Cirugía del corazón y vasos sanguíneos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440020', 'Cirugía Plástica', 'Especialidades Quirúrgicas', 'Cirugía reconstructiva y estética', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440021', 'Cirugía Torácica', 'Especialidades Quirúrgicas', 'Cirugía del tórax y pulmones', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440022', 'Neurocirugía', 'Especialidades Quirúrgicas', 'Cirugía del sistema nervioso', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440023', 'Urología', 'Especialidades Quirúrgicas', 'Cirugía del sistema genitourinario', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440024', 'Traumatología y Ortopedia', 'Especialidades Quirúrgicas', 'Cirugía del sistema musculoesquelético', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440025', 'Otorrinolaringología', 'Especialidades Quirúrgicas', 'Cirugía de oído, nariz y garganta', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440026', 'Oftalmología', 'Especialidades Quirúrgicas', 'Cirugía de los ojos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440027', 'Cirugía Pediátrica', 'Especialidades Quirúrgicas', 'Cirugía especializada en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440028', 'Cirugía Maxilofacial', 'Especialidades Quirúrgicas', 'Cirugía de cara, mandíbula y cuello', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440029', 'Cirugía Vascular', 'Especialidades Quirúrgicas', 'Cirugía de vasos sanguíneos', true, true, NOW()),

-- === DIAGNÓSTICO POR IMAGEN ===
('550e8400-e29b-41d4-a716-446655440030', 'Radiología', 'Diagnóstico por Imagen', 'Interpretación de estudios de imagen médica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440031', 'Radiología Intervencionista', 'Diagnóstico por Imagen', 'Procedimientos guiados por imagen', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440032', 'Medicina Nuclear', 'Diagnóstico por Imagen', 'Diagnóstico con radiofármacos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440033', 'Ultrasonografía', 'Diagnóstico por Imagen', 'Diagnóstico por ultrasonido', true, true, NOW()),

-- === LABORATORIO Y PATOLOGÍA ===
('550e8400-e29b-41d4-a716-446655440034', 'Patología', 'Diagnóstico', 'Diagnóstico de enfermedades mediante análisis de tejidos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440035', 'Laboratorio Clínico', 'Diagnóstico', 'Análisis de muestras biológicas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440036', 'Microbiología', 'Diagnóstico', 'Diagnóstico de enfermedades infecciosas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440037', 'Citología', 'Diagnóstico', 'Análisis de células para diagnóstico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440038', 'Genética Médica', 'Diagnóstico', 'Diagnóstico de enfermedades genéticas', true, true, NOW()),

-- === SALUD MENTAL ===
('550e8400-e29b-41d4-a716-446655440039', 'Psiquiatría', 'Salud Mental', 'Diagnóstico y tratamiento de trastornos mentales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440040', 'Psicología Clínica', 'Salud Mental', 'Evaluación y tratamiento psicológico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440041', 'Psiquiatría Infantil', 'Salud Mental', 'Salud mental en niños y adolescentes', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440042', 'Neuropsicología', 'Salud Mental', 'Evaluación cognitiva y neuropsicológica', true, true, NOW()),

-- === ATENCIÓN CRÍTICA ===
('550e8400-e29b-41d4-a716-446655440043', 'Medicina de Urgencias', 'Atención Crítica', 'Atención médica de emergencias', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440044', 'Medicina Intensiva', 'Atención Crítica', 'Cuidados intensivos y críticos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440045', 'Anestesiología', 'Atención Crítica', 'Manejo anestésico durante procedimientos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440046', 'Medicina del Dolor', 'Atención Crítica', 'Manejo especializado del dolor', true, true, NOW()),

-- === PEDIATRÍA ESPECIALIZADA ===
('550e8400-e29b-41d4-a716-446655440047', 'Neonatología', 'Pediatría Especializada', 'Atención del recién nacido', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440048', 'Cardiología Pediátrica', 'Pediatría Especializada', 'Cardiología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440049', 'Neurología Pediátrica', 'Pediatría Especializada', 'Neurología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440050', 'Oncología Pediátrica', 'Pediatría Especializada', 'Cáncer en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440051', 'Endocrinología Pediátrica', 'Pediatría Especializada', 'Endocrinología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440052', 'Neumología Pediátrica', 'Pediatría Especializada', 'Neumología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440053', 'Gastroenterología Pediátrica', 'Pediatría Especializada', 'Gastroenterología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440054', 'Nefrología Pediátrica', 'Pediatría Especializada', 'Nefrología en niños', true, true, NOW()),

-- === MEDICINA DE REHABILITACIÓN ===
('550e8400-e29b-41d4-a716-446655440055', 'Medicina de Rehabilitación', 'Rehabilitación', 'Rehabilitación y medicina física', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440056', 'Fisioterapia', 'Rehabilitación', 'Terapia física y rehabilitación', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440057', 'Terapia Ocupacional', 'Rehabilitación', 'Rehabilitación ocupacional', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440058', 'Fonoaudiología', 'Rehabilitación', 'Terapia del habla y lenguaje', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440059', 'Medicina del Deporte', 'Rehabilitación', 'Medicina aplicada al deporte', true, true, NOW()),

-- === GINECOLOGÍA Y OBSTETRICIA ESPECIALIZADA ===
('550e8400-e29b-41d4-a716-446655440060', 'Medicina Materno-Fetal', 'Ginecología Especializada', 'Embarazos de alto riesgo', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440061', 'Reproducción Humana', 'Ginecología Especializada', 'Fertilidad y reproducción asistida', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440062', 'Ginecología Oncológica', 'Ginecología Especializada', 'Cáncer ginecológico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440063', 'Uroginecología', 'Ginecología Especializada', 'Trastornos del piso pélvico', true, true, NOW()),

-- === MEDICINA PREVENTIVA Y SALUD PÚBLICA ===
('550e8400-e29b-41d4-a716-446655440064', 'Epidemiología', 'Salud Pública', 'Estudio de enfermedades en poblaciones', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440065', 'Medicina del Trabajo', 'Salud Pública', 'Salud ocupacional y medicina laboral', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440066', 'Medicina Tropical', 'Salud Pública', 'Enfermedades tropicales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440067', 'Vacunología', 'Salud Pública', 'Especialista en vacunas', true, true, NOW()),

-- === GERIATRÍA ===
('550e8400-e29b-41d4-a716-446655440068', 'Geriatría', 'Especialidades Médicas', 'Atención médica de adultos mayores', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440069', 'Psicogeriatría', 'Especialidades Médicas', 'Salud mental en adultos mayores', true, true, NOW()),

-- === ESPECIALIDADES ODONTOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440070', 'Odontología General', 'Odontología', 'Atención dental general', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440071', 'Endodoncia', 'Odontología', 'Tratamiento de conductos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440072', 'Periodoncia', 'Odontología', 'Enfermedades de las encías', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440073', 'Ortodoncia', 'Odontología', 'Corrección de malposiciones dentales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440074', 'Cirugía Oral', 'Odontología', 'Cirugía de la cavidad oral', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440075', 'Prostodoncia', 'Odontología', 'Rehabilitación protésica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440076', 'Odontopediatría', 'Odontología', 'Odontología para niños', true, true, NOW()),

-- === MEDICINA ALTERNATIVA Y COMPLEMENTARIA ===
('550e8400-e29b-41d4-a716-446655440077', 'Medicina Integrativa', 'Medicina Alternativa', 'Medicina convencional y alternativa', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440078', 'Homeopatía', 'Medicina Alternativa', 'Medicina homeopática', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440079', 'Acupuntura', 'Medicina Alternativa', 'Medicina tradicional china', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440080', 'Medicina Herbal', 'Medicina Alternativa', 'Fitoterapia y medicina natural', true, true, NOW()),

-- === ESPECIALIDADES DE APOYO ===
('550e8400-e29b-41d4-a716-446655440081', 'Nutrición', 'Especialidades de Apoyo', 'Nutrición clínica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440082', 'Trabajo Social', 'Especialidades de Apoyo', 'Apoyo social y familiar', false, true, NOW()),
('550e8400-e29b-41d4-a716-446655440083', 'Farmacia Clínica', 'Especialidades de Apoyo', 'Farmacología clínica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440084', 'Bioingeniería', 'Especialidades de Apoyo', 'Ingeniería biomédica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440085', 'Perfusión', 'Especialidades de Apoyo', 'Circulación extracorporea', true, true, NOW()),

-- === SUBESPECIALIDADES CARDIOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440086', 'Electrofisiología', 'Cardiología Especializada', 'Arritmias cardíacas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440087', 'Hemodinámica', 'Cardiología Especializada', 'Cateterismo cardíaco', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440088', 'Ecocardiografía', 'Cardiología Especializada', 'Ultrasonido cardíaco', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440089', 'Cardiología Nuclear', 'Cardiología Especializada', 'Medicina nuclear cardíaca', true, true, NOW()),

-- === SUBESPECIALIDADES NEUROLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440090', 'Epileptología', 'Neurología Especializada', 'Epilepsia y convulsiones', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440091', 'Neurofisiología', 'Neurología Especializada', 'Estudios neurofisiológicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440092', 'Medicina del Sueño', 'Neurología Especializada', 'Trastornos del sueño', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440093', 'Cefaleas', 'Neurología Especializada', 'Dolor de cabeza especializado', true, true, NOW()),

-- === SUBESPECIALIDADES ONCOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440094', 'Radio-oncología', 'Oncología Especializada', 'Radioterapia oncológica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440095', 'Oncología Médica', 'Oncología Especializada', 'Quimioterapia y tratamiento médico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440096', 'Oncología Quirúrgica', 'Oncología Especializada', 'Cirugía oncológica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440097', 'Hematología Oncológica', 'Oncología Especializada', 'Cánceres hematológicos', true, true, NOW()),

-- === MEDICINA DE TRASPLANTES ===
('550e8400-e29b-41d4-a716-446655440098', 'Medicina de Trasplantes', 'Trasplantes', 'Coordinación de trasplantes', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440099', 'Trasplante Renal', 'Trasplantes', 'Trasplante de riñón', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440100', 'Trasplante Hepático', 'Trasplantes', 'Trasplante de hígado', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440101', 'Trasplante Cardíaco', 'Trasplantes', 'Trasplante de corazón', true, true, NOW()),

-- === ESPECIALIDADES ESTÉTICAS ===
('550e8400-e29b-41d4-a716-446655440102', 'Dermatología Estética', 'Medicina Estética', 'Tratamientos estéticos dermatológicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440103', 'Cirugía Estética', 'Medicina Estética', 'Cirugía plástica estética', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440104', 'Medicina Estética', 'Medicina Estética', 'Tratamientos estéticos no quirúrgicos', true, true, NOW()),

-- === ESPECIALIDADES FORENSES ===
('550e8400-e29b-41d4-a716-446655440105', 'Medicina Legal', 'Medicina Forense', 'Medicina forense y legal', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440106', 'Patología Forense', 'Medicina Forense', 'Autopsias y medicina forense', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440107', 'Toxicología', 'Medicina Forense', 'Análisis toxicológico', true, true, NOW()),

-- === ESPECIALIDADES EN DESARROLLO ===
('550e8400-e29b-41d4-a716-446655440108', 'Telemedicina', 'Medicina Digital', 'Medicina a distancia', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440109', 'Medicina Genómica', 'Medicina Moderna', 'Medicina basada en genética', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440110', 'Medicina de Precisión', 'Medicina Moderna', 'Medicina personalizada', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440111', 'Bioética', 'Medicina Moderna', 'Ética médica y bioética', true, true, NOW()),

-- === MÁS ESPECIALIDADES MÉDICAS ===
('550e8400-e29b-41d4-a716-446655440112', 'Alergología', 'Especialidades Médicas', 'Alergias e inmunología', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440113', 'Inmunología', 'Especialidades Médicas', 'Sistema inmunitario', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440114', 'Sexología', 'Especialidades Médicas', 'Medicina sexual', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440115', 'Andrología', 'Especialidades Médicas', 'Salud masculina', true, true, NOW()),

-- === ESPECIALIDADES RESPIRATORIAS ===
('550e8400-e29b-41d4-a716-446655440116', 'Neumología Intervencionista', 'Neumología Especializada', 'Procedimientos respiratorios', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440117', 'Medicina del Sueño Respiratorio', 'Neumología Especializada', 'Apnea del sueño', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440118', 'Fibrosis Pulmonar', 'Neumología Especializada', 'Enfermedades pulmonares intersticiales', true, true, NOW()),

-- === ESPECIALIDADES GASTROINTESTINALES ===
('550e8400-e29b-41d4-a716-446655440119', 'Hepatología', 'Gastroenterología Especializada', 'Enfermedades del hígado', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440120', 'Pancreatología', 'Gastroenterología Especializada', 'Enfermedades del páncreas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440121', 'Endoscopia Digestiva', 'Gastroenterología Especializada', 'Procedimientos endoscópicos', true, true, NOW()),

-- === ESPECIALIDADES RENALES ===
('550e8400-e29b-41d4-a716-446655440122', 'Diálisis', 'Nefrología Especializada', 'Terapia de reemplazo renal', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440123', 'Hipertensión', 'Nefrología Especializada', 'Hipertensión arterial', true, true, NOW()),

-- === ESPECIALIDADES ENDOCRINAS ===
('550e8400-e29b-41d4-a716-446655440124', 'Diabetología', 'Endocrinología Especializada', 'Diabetes mellitus', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440125', 'Tiroides', 'Endocrinología Especializada', 'Enfermedades tiroideas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440126', 'Metabolismo Óseo', 'Endocrinología Especializada', 'Osteoporosis y metabolismo óseo', true, true, NOW()),

-- === ESPECIALIDADES HEMATOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440127', 'Hemostasia', 'Hematología Especializada', 'Trastornos de coagulación', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440128', 'Banco de Sangre', 'Hematología Especializada', 'Medicina transfusional', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440129', 'Aféresis', 'Hematología Especializada', 'Procedimientos de aféresis', true, true, NOW()),

-- === ESPECIALIDADES DERMATOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440130', 'Dermatopatología', 'Dermatología Especializada', 'Patología de la piel', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440131', 'Dermatología Pediátrica', 'Dermatología Especializada', 'Dermatología en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440132', 'Cirugía Dermatológica', 'Dermatología Especializada', 'Cirugía de la piel', true, true, NOW()),

-- === ESPECIALIDADES REUMATOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440133', 'Artritis Reumatoide', 'Reumatología Especializada', 'Artritis reumatoide', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440134', 'Lupus', 'Reumatología Especializada', 'Lupus eritematoso sistémico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440135', 'Esclerodermia', 'Reumatología Especializada', 'Esclerosis sistémica', true, true, NOW()),

-- === ESPECIALIDADES OFTALMOLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440136', 'Retina', 'Oftalmología Especializada', 'Enfermedades de la retina', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440137', 'Córnea', 'Oftalmología Especializada', 'Enfermedades de la córnea', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440138', 'Glaucoma', 'Oftalmología Especializada', 'Glaucoma', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440139', 'Oftalmología Pediátrica', 'Oftalmología Especializada', 'Oftalmología en niños', true, true, NOW()),

-- === ESPECIALIDADES ORL ===
('550e8400-e29b-41d4-a716-446655440140', 'Rinología', 'ORL Especializada', 'Enfermedades nasales', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440141', 'Laringología', 'ORL Especializada', 'Enfermedades de la laringe', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440142', 'Otología', 'ORL Especializada', 'Enfermedades del oído', true, true, NOW()),

-- === ESPECIALIDADES UROLÓGICAS ===
('550e8400-e29b-41d4-a716-446655440143', 'Uro-oncología', 'Urología Especializada', 'Cáncer urológico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440144', 'Laparoscopia Urológica', 'Urología Especializada', 'Cirugía laparoscópica urológica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440145', 'Litiasis', 'Urología Especializada', 'Cálculos urinarios', true, true, NOW()),

-- === ESPECIALIDADES ORTOPÉDICAS ===
('550e8400-e29b-41d4-a716-446655440146', 'Columna Vertebral', 'Ortopedia Especializada', 'Cirugía de columna', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440147', 'Rodilla', 'Ortopedia Especializada', 'Cirugía de rodilla', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440148', 'Hombro', 'Ortopedia Especializada', 'Cirugía de hombro', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440149', 'Mano', 'Ortopedia Especializada', 'Cirugía de mano', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440150', 'Pie y Tobillo', 'Ortopedia Especializada', 'Cirugía de pie y tobillo', true, true, NOW()),

-- === ESPECIALIDADES DE ENFERMERÍA ===
('550e8400-e29b-41d4-a716-446655440151', 'Enfermería General', 'Enfermería', 'Cuidados generales de enfermería', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440152', 'Enfermería Quirúrgica', 'Enfermería', 'Cuidados perioperatorios', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440153', 'Enfermería en UCI', 'Enfermería', 'Cuidados intensivos de enfermería', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440154', 'Enfermería Pediátrica', 'Enfermería', 'Cuidados de enfermería en niños', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440155', 'Enfermería Oncológica', 'Enfermería', 'Cuidados oncológicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440156', 'Enfermería Geriátrica', 'Enfermería', 'Cuidados en adultos mayores', true, true, NOW()),

-- === OTRAS ESPECIALIDADES DE SALUD ===
('550e8400-e29b-41d4-a716-446655440157', 'Optometría', 'Especialidades de Apoyo', 'Cuidado de la visión', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440158', 'Podología', 'Especialidades de Apoyo', 'Cuidado de los pies', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440159', 'Audiología', 'Especialidades de Apoyo', 'Cuidado de la audición', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440160', 'Quiropráctica', 'Especialidades de Apoyo', 'Tratamiento quiropráctico', true, true, NOW()),

-- === ESPECIALIDADES ADMINISTRATIVAS MÉDICAS ===
('550e8400-e29b-41d4-a716-446655440161', 'Administración Hospitalaria', 'Administración Médica', 'Gestión hospitalaria', false, true, NOW()),
('550e8400-e29b-41d4-a716-446655440162', 'Calidad en Salud', 'Administración Médica', 'Control de calidad médica', false, true, NOW()),
('550e8400-e29b-41d4-a716-446655440163', 'Informática Médica', 'Administración Médica', 'Sistemas de información médica', false, true, NOW()),
('550e8400-e29b-41d4-a716-446655440164', 'Economía de la Salud', 'Administración Médica', 'Economía aplicada a la salud', false, true, NOW()),

-- === ESPECIALIDADES EMERGENTES ===
('550e8400-e29b-41d4-a716-446655440165', 'Medicina Aeroespacial', 'Medicina Especializada', 'Medicina para aviación y espacio', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440166', 'Medicina Subacuática', 'Medicina Especializada', 'Medicina hiperbárica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440167', 'Medicina de Montaña', 'Medicina Especializada', 'Medicina de altura', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440168', 'Medicina de Desastres', 'Medicina Especializada', 'Medicina en emergencias masivas', true, true, NOW()),

-- === ESPECIALIDADES VETERINARIAS (SI APLICA) ===
('550e8400-e29b-41d4-a716-446655440169', 'Medicina Veterinaria', 'Veterinaria', 'Medicina animal', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440170', 'Veterinaria de Pequeños Animales', 'Veterinaria', 'Perros y gatos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440171', 'Veterinaria de Grandes Animales', 'Veterinaria', 'Ganado y equinos', true, true, NOW()),

-- === ESPECIALIDADES ADICIONALES ===
('550e8400-e29b-41d4-a716-446655440172', 'Medicina Ayurveda', 'Medicina Alternativa', 'Medicina tradicional india', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440173', 'Osteopatía', 'Medicina Alternativa', 'Medicina osteopática', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440174', 'Naturopatía', 'Medicina Alternativa', 'Medicina natural', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440175', 'Reflexología', 'Medicina Alternativa', 'Terapia de reflexología', false, true, NOW()),

-- === ESPECIALIDADES TÉCNICAS ===
('550e8400-e29b-41d4-a716-446655440176', 'Técnico en Laboratorio', 'Técnico Médico', 'Técnico en análisis clínicos', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440177', 'Técnico en Radiología', 'Técnico Médico', 'Técnico en imágenes médicas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440178', 'Técnico en Farmacia', 'Técnico Médico', 'Asistente de farmacia', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440179', 'Técnico en Emergencias', 'Técnico Médico', 'Paramédico y técnico en emergencias', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440180', 'Técnico Quirúrgico', 'Técnico Médico', 'Instrumentista quirúrgico', true, true, NOW()),

-- === ÚLTIMAS ESPECIALIDADES ===
('550e8400-e29b-41d4-a716-446655440181', 'Medicina Funcional', 'Medicina Integrativa', 'Medicina funcional y sistémica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440182', 'Medicina Regenerativa', 'Medicina Moderna', 'Terapias regenerativas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440183', 'Medicina Cuántica', 'Medicina Moderna', 'Terapias cuánticas', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440184', 'Medicina Molecular', 'Medicina Moderna', 'Medicina a nivel molecular', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440185', 'Medicina Personalizada', 'Medicina Moderna', 'Tratamientos personalizados', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440186', 'Medicina Preventiva Avanzada', 'Medicina Moderna', 'Prevención avanzada', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440187', 'Longevidad y Anti-aging', 'Medicina Moderna', 'Medicina antienvejecimiento', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440188', 'Medicina Espacial', 'Medicina Especializada', 'Medicina para exploración espacial', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440189', 'Robótica Médica', 'Medicina Moderna', 'Cirugía robótica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440190', 'Inteligencia Artificial Médica', 'Medicina Moderna', 'IA aplicada a medicina', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440191', 'Realidad Virtual Médica', 'Medicina Moderna', 'VR en medicina', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440192', 'Nanotecnología Médica', 'Medicina Moderna', 'Nanomedicina', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440193', 'Biotecnología Médica', 'Medicina Moderna', 'Biotecnología aplicada', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440194', 'Impresión 3D Médica', 'Medicina Moderna', 'Bioimpresión 3D', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440195', 'Wearables Médicos', 'Medicina Digital', 'Dispositivos vestibles', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440196', 'IoT Médico', 'Medicina Digital', 'Internet de las cosas médico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440197', 'Blockchain Médico', 'Medicina Digital', 'Blockchain en salud', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440198', 'Big Data Médico', 'Medicina Digital', 'Análisis de big data médico', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440199', 'Ciberseguridad Médica', 'Medicina Digital', 'Seguridad informática médica', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440200', 'Medicina Digital', 'Medicina Digital', 'Medicina completamente digital', true, true, NOW());

-- Verificar inserción
SELECT COUNT(*) as total_especialidades FROM public.medical_specialties WHERE is_active = true;

-- Mostrar resumen por categorías
SELECT 
    category,
    COUNT(*) as cantidad
FROM public.medical_specialties 
WHERE is_active = true
GROUP BY category
ORDER BY cantidad DESC;