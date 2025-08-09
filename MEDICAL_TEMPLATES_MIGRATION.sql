-- =====================================================
-- MIGRACIÓN: Sistema de Plantillas Médicas
-- Fecha: 2024-01-XX
-- Descripción: Tablas para gestión de plantillas de interrogatorio, 
--              exploración física y prescripciones médicas
-- =====================================================

-- Crear tabla de categorías de plantillas
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    type VARCHAR(50) NOT NULL CHECK (type IN ('interrogatorio', 'exploracion', 'prescripcion', 'general')),
    is_predefined BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla principal de plantillas médicas
CREATE TABLE IF NOT EXISTS medical_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
    
    -- Información básica
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('interrogatorio', 'exploracion', 'prescripcion')),
    specialty VARCHAR(100), -- Especialidad médica asociada
    
    -- Contenido de la plantilla (JSON)
    content JSONB NOT NULL DEFAULT '{}',
    
    -- Metadatos
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false, -- Si otros médicos pueden usar la plantilla
    is_predefined BOOLEAN DEFAULT false, -- Si es una plantilla del sistema
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0, -- Contador de uso
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Crear tabla de campos de plantillas (para búsqueda y indexación)
CREATE TABLE IF NOT EXISTS template_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES medical_templates(id) ON DELETE CASCADE NOT NULL,
    field_name VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'time')),
    field_label VARCHAR(300) NOT NULL,
    field_options JSONB, -- Para campos select, radio, checkbox
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    section VARCHAR(100), -- Sección dentro de la plantilla
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de favoritos de plantillas
CREATE TABLE IF NOT EXISTS template_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES medical_templates(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, template_id)
);

-- Crear tabla de historial de uso de plantillas
CREATE TABLE IF NOT EXISTS template_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES medical_templates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    context JSONB -- Contexto adicional del uso
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_medical_templates_user_id ON medical_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_clinic_id ON medical_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_type ON medical_templates(type);
CREATE INDEX IF NOT EXISTS idx_medical_templates_specialty ON medical_templates(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_templates_active ON medical_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_medical_templates_public ON medical_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_medical_templates_predefined ON medical_templates(is_predefined);

-- Índice GIN para búsqueda en contenido JSON
CREATE INDEX IF NOT EXISTS idx_medical_templates_content_gin ON medical_templates USING GIN (content);
CREATE INDEX IF NOT EXISTS idx_medical_templates_tags_gin ON medical_templates USING GIN (tags);

-- Índices para campos de plantillas
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_type ON template_fields(field_type);

-- Índices para favoritos
CREATE INDEX IF NOT EXISTS idx_template_favorites_user_id ON template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_template_favorites_template_id ON template_favorites(template_id);

-- Índices para usage
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_used_at ON template_usage(used_at);

-- =====================================================
-- TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Trigger para actualizar updated_at en medical_templates
CREATE OR REPLACE FUNCTION update_medical_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medical_templates_updated_at_trigger
    BEFORE UPDATE ON medical_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_templates_updated_at();

-- Trigger para actualizar contador de uso
CREATE OR REPLACE FUNCTION increment_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE medical_templates 
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_template_usage_count_trigger
    AFTER INSERT ON template_usage
    FOR EACH ROW
    EXECUTE FUNCTION increment_template_usage_count();

-- =====================================================
-- DATOS INICIALES - CATEGORÍAS PREDEFINIDAS
-- =====================================================

INSERT INTO template_categories (name, description, icon, type, is_predefined) VALUES
-- Categorías de Interrogatorio
('General', 'Interrogatorios médicos generales', 'MessageSquare', 'interrogatorio', true),
('Preventivo', 'Chequeos preventivos y evaluaciones de riesgo', 'Shield', 'interrogatorio', true),
('Especialidad', 'Interrogatorios específicos por especialidad médica', 'Stethoscope', 'interrogatorio', true),
('Seguimiento', 'Interrogatorios de seguimiento y control', 'Activity', 'interrogatorio', true),

-- Categorías de Exploración Física
('Sistemas Generales', 'Exploración de sistemas corporales principales', 'Heart', 'exploracion', true),
('Articular', 'Exploración específica de articulaciones', 'Bone', 'exploracion', true),
('Neurológica', 'Exploración del sistema nervioso', 'Brain', 'exploracion', true),
('Especializada', 'Exploraciones por especialidad médica', 'Eye', 'exploracion', true),

-- Categorías de Prescripciones
('Medicamentos', 'Plantillas de prescripción farmacológica', 'Pill', 'prescripcion', true),
('Terapia Física', 'Planes de ejercicios y rehabilitación', 'Dumbbell', 'prescripcion', true),
('Educación', 'Material educativo para pacientes', 'BookOpen', 'prescripcion', true),
('Dietas', 'Planes nutricionales y dietéticos', 'Apple', 'prescripcion', true);

-- =====================================================
-- PLANTILLAS PREDEFINIDAS - INTERROGATORIO
-- =====================================================

-- Plantilla: Primera Consulta
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id) 
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Primera Consulta - Evaluación Inicial',
    'Interrogatorio completo para pacientes de primera vez',
    'interrogatorio',
    'General',
    '{
        "sections": [
            {
                "id": "datos_generales",
                "title": "Datos Generales",
                "fields": [
                    {"id": "motivo_consulta", "label": "Motivo de consulta", "type": "textarea", "required": true},
                    {"id": "enfermedad_actual", "label": "Enfermedad actual", "type": "textarea", "required": true},
                    {"id": "tiempo_evolucion", "label": "Tiempo de evolución", "type": "text", "required": true}
                ]
            },
            {
                "id": "antecedentes",
                "title": "Antecedentes",
                "fields": [
                    {"id": "antecedentes_patologicos", "label": "Antecedentes patológicos personales", "type": "textarea"},
                    {"id": "antecedentes_familiares", "label": "Antecedentes familiares", "type": "textarea"},
                    {"id": "medicamentos_actuales", "label": "Medicamentos actuales", "type": "textarea"},
                    {"id": "alergias", "label": "Alergias conocidas", "type": "textarea"}
                ]
            },
            {
                "id": "revision_sistemas",
                "title": "Revisión por Sistemas",
                "fields": [
                    {"id": "cardiovascular", "label": "Sistema cardiovascular", "type": "textarea"},
                    {"id": "respiratorio", "label": "Sistema respiratorio", "type": "textarea"},
                    {"id": "gastrointestinal", "label": "Sistema gastrointestinal", "type": "textarea"},
                    {"id": "genitourinario", "label": "Sistema genitourinario", "type": "textarea"},
                    {"id": "neurologico", "label": "Sistema neurológico", "type": "textarea"}
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'General' AND type = 'interrogatorio');

-- Plantilla: Evaluación Cardiovascular
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Evaluación de Riesgo Cardiovascular',
    'Interrogatorio específico para evaluar factores de riesgo cardiovascular',
    'interrogatorio',
    'Cardiología',
    '{
        "sections": [
            {
                "id": "sintomas_cardiovasculares",
                "title": "Síntomas Cardiovasculares",
                "fields": [
                    {"id": "dolor_pecho", "label": "¿Ha presentado dolor en el pecho?", "type": "radio", "options": ["Sí", "No"], "required": true},
                    {"id": "dolor_pecho_detalle", "label": "Describa el dolor (localización, irradiación, duración)", "type": "textarea", "conditional": "dolor_pecho_si"},
                    {"id": "disnea", "label": "¿Presenta dificultad para respirar?", "type": "radio", "options": ["Sí", "No"]},
                    {"id": "palpitaciones", "label": "¿Ha sentido palpitaciones?", "type": "radio", "options": ["Sí", "No"]},
                    {"id": "fatiga", "label": "¿Presenta fatiga inusual?", "type": "radio", "options": ["Sí", "No"]}
                ]
            },
            {
                "id": "factores_riesgo",
                "title": "Factores de Riesgo",
                "fields": [
                    {"id": "hipertension", "label": "Hipertensión arterial", "type": "radio", "options": ["Sí", "No", "No sabe"]},
                    {"id": "diabetes", "label": "Diabetes mellitus", "type": "radio", "options": ["Sí", "No", "No sabe"]},
                    {"id": "dislipidemia", "label": "Colesterol o triglicéridos altos", "type": "radio", "options": ["Sí", "No", "No sabe"]},
                    {"id": "tabaquismo", "label": "¿Fuma o ha fumado?", "type": "select", "options": ["Nunca", "Ex-fumador", "Fumador actual"]},
                    {"id": "sedentarismo", "label": "Actividad física regular", "type": "radio", "options": ["Sí", "No"]},
                    {"id": "antecedentes_familiares_cv", "label": "Antecedentes familiares de enfermedad cardiovascular", "type": "textarea"}
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'Especialidad' AND type = 'interrogatorio');

-- =====================================================
-- PLANTILLAS PREDEFINIDAS - EXPLORACIÓN FÍSICA
-- =====================================================

-- Plantilla: Exploración Cardiovascular
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Exploración Sistema Cardiovascular',
    'Exploración física completa del sistema cardiovascular',
    'exploracion',
    'Cardiología',
    '{
        "sections": [
            {
                "id": "inspeccion",
                "title": "Inspección",
                "fields": [
                    {"id": "estado_general", "label": "Estado general del paciente", "type": "select", "options": ["Bueno", "Regular", "Malo"]},
                    {"id": "coloracion", "label": "Coloración de piel y mucosas", "type": "select", "options": ["Normal", "Pálido", "Cianótico", "Ictérico"]},
                    {"id": "edemas", "label": "Presencia de edemas", "type": "radio", "options": ["Ausentes", "Presentes"]},
                    {"id": "edemas_localizacion", "label": "Localización de edemas", "type": "text", "conditional": "edemas_presentes"}
                ]
            },
            {
                "id": "palpacion",
                "title": "Palpación",
                "fields": [
                    {"id": "pulso_radial", "label": "Pulso radial (frecuencia/min)", "type": "number", "required": true},
                    {"id": "pulso_caracteristicas", "label": "Características del pulso", "type": "select", "options": ["Regular", "Irregular", "Filiforme", "Saltón"]},
                    {"id": "choque_punta", "label": "Choque de punta", "type": "text"},
                    {"id": "thrill", "label": "Presencia de thrill", "type": "radio", "options": ["Ausente", "Presente"]}
                ]
            },
            {
                "id": "auscultacion",
                "title": "Auscultación",
                "fields": [
                    {"id": "ruidos_cardiacos", "label": "Ruidos cardíacos", "type": "select", "options": ["Normales", "Taquicárdicos", "Bradicárdicos"]},
                    {"id": "soplos", "label": "Presencia de soplos", "type": "radio", "options": ["Ausentes", "Presentes"]},
                    {"id": "soplos_descripcion", "label": "Descripción de soplos", "type": "textarea", "conditional": "soplos_presentes"}
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'Sistemas Generales' AND type = 'exploracion');

-- Plantilla: Exploración de Rodilla
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Exploración de Rodilla',
    'Exploración específica de articulación de rodilla',
    'exploracion',
    'Traumatología',
    '{
        "sections": [
            {
                "id": "inspeccion_rodilla",
                "title": "Inspección",
                "fields": [
                    {"id": "deformidad", "label": "Deformidad visible", "type": "radio", "options": ["Ausente", "Presente"]},
                    {"id": "inflamacion", "label": "Signos de inflamación", "type": "checkbox", "options": ["Rubor", "Tumor", "Calor", "Dolor"]},
                    {"id": "atrofia_muscular", "label": "Atrofia muscular", "type": "radio", "options": ["Ausente", "Presente"]}
                ]
            },
            {
                "id": "palpacion_rodilla",
                "title": "Palpación",
                "fields": [
                    {"id": "dolor_palpacion", "label": "Dolor a la palpación", "type": "radio", "options": ["Ausente", "Presente"]},
                    {"id": "temperatura", "label": "Temperatura local", "type": "select", "options": ["Normal", "Aumentada"]},
                    {"id": "derrame", "label": "Derrame articular", "type": "radio", "options": ["Ausente", "Presente"]}
                ]
            },
            {
                "id": "movilidad_rodilla",
                "title": "Movilidad",
                "fields": [
                    {"id": "flexion_grados", "label": "Flexión (grados)", "type": "number"},
                    {"id": "extension_grados", "label": "Extensión (grados)", "type": "number"},
                    {"id": "dolor_movimiento", "label": "Dolor al movimiento", "type": "radio", "options": ["Ausente", "Presente"]},
                    {"id": "limitacion_funcional", "label": "Limitación funcional", "type": "textarea"}
                ]
            },
            {
                "id": "pruebas_especiales",
                "title": "Pruebas Especiales",
                "fields": [
                    {"id": "lachman", "label": "Prueba de Lachman", "type": "select", "options": ["Negativa", "Positiva", "No valorable"]},
                    {"id": "cajon_anterior", "label": "Cajón anterior", "type": "select", "options": ["Negativo", "Positivo", "No valorable"]},
                    {"id": "mcmurray", "label": "Prueba de McMurray", "type": "select", "options": ["Negativa", "Positiva", "No valorable"]}
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'Articular' AND type = 'exploracion');

-- =====================================================
-- PLANTILLAS PREDEFINIDAS - PRESCRIPCIONES
-- =====================================================

-- Plantilla: Plan de Ejercicios para Lumbalgia
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Plan de Ejercicios para Lumbalgia',
    'Programa de ejercicios específicos para dolor lumbar',
    'prescripcion',
    'Traumatología',
    '{
        "sections": [
            {
                "id": "indicaciones_generales",
                "title": "Indicaciones Generales",
                "content": "Realizar ejercicios 2-3 veces al día, evitar movimientos bruscos, aplicar calor local antes de ejercicios."
            },
            {
                "id": "ejercicios_estiramiento",
                "title": "Ejercicios de Estiramiento",
                "exercises": [
                    {
                        "name": "Estiramiento rodilla al pecho",
                        "description": "Acostado boca arriba, llevar una rodilla al pecho y mantener 30 segundos",
                        "repetitions": "10 repeticiones por pierna",
                        "frequency": "2 veces al día"
                    },
                    {
                        "name": "Estiramiento de psoas",
                        "description": "En posición de caballero, estirar la cadera hacia adelante",
                        "repetitions": "Mantener 30 segundos",
                        "frequency": "3 veces por pierna"
                    }
                ]
            },
            {
                "id": "ejercicios_fortalecimiento",
                "title": "Ejercicios de Fortalecimiento",
                "exercises": [
                    {
                        "name": "Puente",
                        "description": "Acostado boca arriba, elevar la pelvis contrayendo glúteos",
                        "repetitions": "15 repeticiones",
                        "frequency": "3 series, 2 veces al día"
                    },
                    {
                        "name": "Plancha modificada",
                        "description": "En posición de plancha sobre rodillas, mantener abdomen contraído",
                        "repetitions": "Mantener 15-30 segundos",
                        "frequency": "5 repeticiones"
                    }
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'Terapia Física' AND type = 'prescripcion');

-- Plantilla: Dieta DASH para Hipertensión
INSERT INTO medical_templates (user_id, name, description, type, specialty, content, is_predefined, is_public, category_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@expedientedlm.com' LIMIT 1),
    'Dieta DASH para Hipertensión',
    'Plan alimenticio DASH para control de presión arterial',
    'prescripcion',
    'Medicina Interna',
    '{
        "sections": [
            {
                "id": "principios_generales",
                "title": "Principios Generales",
                "content": "La dieta DASH se basa en consumir frutas, verduras, granos integrales, proteínas magras y lácteos bajos en grasa, mientras se limita el sodio."
            },
            {
                "id": "alimentos_recomendados",
                "title": "Alimentos Recomendados",
                "categories": [
                    {
                        "category": "Frutas",
                        "servings": "4-5 porciones diarias",
                        "examples": "Manzana, plátano, naranja, fresas, melón"
                    },
                    {
                        "category": "Verduras",
                        "servings": "4-5 porciones diarias", 
                        "examples": "Brócoli, espinacas, zanahorias, tomates, pimientos"
                    },
                    {
                        "category": "Granos integrales",
                        "servings": "6-8 porciones diarias",
                        "examples": "Avena, arroz integral, pan integral, quinoa"
                    }
                ]
            },
            {
                "id": "alimentos_limitar",
                "title": "Alimentos a Limitar",
                "restrictions": [
                    "Sodio: menos de 2300mg al día (ideal menos de 1500mg)",
                    "Carnes rojas: máximo 2 porciones por semana",
                    "Dulces y azúcares: máximo 5 porciones por semana",
                    "Bebidas alcohólicas: máximo 1-2 por día"
                ]
            }
        ]
    }'::jsonb,
    true,
    true,
    (SELECT id FROM template_categories WHERE name = 'Dietas' AND type = 'prescripcion');

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para template_categories
CREATE POLICY "template_categories_select_all" ON template_categories FOR SELECT USING (true);

-- Políticas para medical_templates
CREATE POLICY "templates_select_own_or_public" ON medical_templates 
FOR SELECT USING (
    user_id = auth.uid() OR 
    is_public = true OR 
    is_predefined = true OR
    clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "templates_insert_own" ON medical_templates 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "templates_update_own" ON medical_templates 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "templates_delete_own" ON medical_templates 
FOR DELETE USING (user_id = auth.uid());

-- Políticas para template_fields
CREATE POLICY "template_fields_select_accessible" ON template_fields 
FOR SELECT USING (
    template_id IN (
        SELECT id FROM medical_templates 
        WHERE user_id = auth.uid() OR is_public = true OR is_predefined = true
    )
);

CREATE POLICY "template_fields_manage_own" ON template_fields 
FOR ALL USING (
    template_id IN (
        SELECT id FROM medical_templates WHERE user_id = auth.uid()
    )
);

-- Políticas para template_favorites
CREATE POLICY "template_favorites_manage_own" ON template_favorites 
FOR ALL USING (user_id = auth.uid());

-- Políticas para template_usage
CREATE POLICY "template_usage_select_own" ON template_usage 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "template_usage_insert_own" ON template_usage 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para buscar plantillas
CREATE OR REPLACE FUNCTION search_medical_templates(
    search_term TEXT DEFAULT '',
    template_type TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL,
    include_public BOOLEAN DEFAULT true
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(200),
    description TEXT,
    type VARCHAR(50),
    specialty VARCHAR(100),
    is_public BOOLEAN,
    is_predefined BOOLEAN,
    usage_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.type,
        t.specialty,
        t.is_public,
        t.is_predefined,
        t.usage_count,
        t.created_at
    FROM medical_templates t
    WHERE 
        t.is_active = true
        AND (
            user_id_param IS NULL OR 
            t.user_id = user_id_param OR 
            (include_public AND (t.is_public = true OR t.is_predefined = true))
        )
        AND (template_type IS NULL OR t.type = template_type)
        AND (
            search_term = '' OR
            t.name ILIKE '%' || search_term || '%' OR
            t.description ILIKE '%' || search_term || '%' OR
            t.specialty ILIKE '%' || search_term || '%'
        )
    ORDER BY 
        t.is_predefined DESC,
        t.usage_count DESC,
        t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Actualizar contador de plantillas
DO $$
BEGIN
    RAISE NOTICE 'Migración de plantillas médicas completada exitosamente';
    RAISE NOTICE 'Categorías creadas: %', (SELECT COUNT(*) FROM template_categories);
    RAISE NOTICE 'Plantillas predefinidas creadas: %', (SELECT COUNT(*) FROM medical_templates WHERE is_predefined = true);
END $$;