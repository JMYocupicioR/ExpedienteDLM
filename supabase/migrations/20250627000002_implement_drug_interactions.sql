/*
  # Migración para Implementar Sistema Completo de Interacciones Medicamentosas
  
  1. Objetivos:
    - Crear base de datos robusta de interacciones medicamentosas
    - Implementar validación automática en tiempo real
    - Agregar niveles de severidad y recomendaciones
    - Crear sistema de alertas y auditoría
    
  2. Implementación:
    - Tabla de medicamentos con principios activos
    - Tabla de interacciones con severidad y descripción
    - Funciones de validación automática
    - Triggers para alertas en tiempo real
*/

-- ===== CREAR TABLA DE MEDICAMENTOS CON PRINCIPIOS ACTIVOS =====
CREATE TABLE IF NOT EXISTS public.medications_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  active_ingredient VARCHAR(200) NOT NULL,
  therapeutic_group VARCHAR(100),
  form VARCHAR(50), -- 'tablet', 'capsule', 'syrup', 'injection', etc.
  strength VARCHAR(50),
  is_controlled BOOLEAN DEFAULT FALSE,
  requires_prescription BOOLEAN DEFAULT TRUE,
  contraindications TEXT[],
  side_effects TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===== INSERTAR MEDICAMENTOS COMUNES CON PRINCIPIOS ACTIVOS =====
INSERT INTO public.medications_catalog (name, generic_name, active_ingredient, therapeutic_group, form, strength, is_controlled, contraindications, side_effects) VALUES
-- Antibióticos
('Amoxicilina', 'Amoxicilina', 'amoxicillin', 'Antibiótico', 'tablet', '500mg', FALSE, ARRAY['alergia_penicilina'], ARRAY['diarrea', 'nausea', 'rash']),
('Ciprofloxacino', 'Ciprofloxacino', 'ciprofloxacin', 'Antibiótico', 'tablet', '500mg', FALSE, ARRAY['embarazo', 'lactancia'], ARRAY['nausea', 'mareo', 'fotosensibilidad']),
('Azitromicina', 'Azitromicina', 'azithromycin', 'Antibiótico', 'tablet', '250mg', FALSE, ARRAY['alergia_macrolidos'], ARRAY['diarrea', 'nausea']),

-- Analgésicos
('Ibuprofeno', 'Ibuprofeno', 'ibuprofen', 'AINE', 'tablet', '400mg', FALSE, ARRAY['ulcera_gastrica', 'alergia_aines'], ARRAY['dolor_gastrico', 'mareo']),
('Paracetamol', 'Paracetamol', 'acetaminophen', 'Analgésico', 'tablet', '500mg', FALSE, ARRAY['hepatopatia_severa'], ARRAY['hepatotoxicidad_sobredosis']),
('Aspirina', 'Ácido Acetilsalicílico', 'aspirin', 'AINE', 'tablet', '100mg', FALSE, ARRAY['ulcera_gastrica', 'hemofilia'], ARRAY['sangrado', 'dolor_gastrico']),

-- Cardiovasculares
('Losartán', 'Losartán', 'losartan', 'ARA II', 'tablet', '50mg', FALSE, ARRAY['embarazo'], ARRAY['mareo', 'hipotension']),
('Atorvastatina', 'Atorvastatina', 'atorvastatin', 'Estatina', 'tablet', '20mg', FALSE, ARRAY['hepatopatia_activa'], ARRAY['mialgia', 'elevacion_enzimas']),
('Metoprolol', 'Metoprolol', 'metoprolol', 'Beta-bloqueador', 'tablet', '50mg', FALSE, ARRAY['asma', 'bradicardia'], ARRAY['fatiga', 'mareo']),
('Amlodipino', 'Amlodipino', 'amlodipine', 'Calcio-antagonista', 'tablet', '5mg', FALSE, ARRAY['hipotension_severa'], ARRAY['edema', 'cefalea']),

-- Anticoagulantes
('Warfarina', 'Warfarina', 'warfarin', 'Anticoagulante', 'tablet', '5mg', TRUE, ARRAY['sangrado_activo', 'embarazo'], ARRAY['sangrado', 'hematoma']),

-- Medicamentos controlados
('Tramadol', 'Tramadol', 'tramadol', 'Opioide', 'tablet', '50mg', TRUE, ARRAY['epilepsia', 'depresion_respiratoria'], ARRAY['nausea', 'mareo', 'dependencia']),
('Alprazolam', 'Alprazolam', 'alprazolam', 'Benzodiazepina', 'tablet', '0.5mg', TRUE, ARRAY['glaucoma', 'miastenia'], ARRAY['somnolencia', 'dependencia']),
('Lorazepam', 'Lorazepam', 'lorazepam', 'Benzodiazepina', 'tablet', '1mg', TRUE, ARRAY['glaucoma', 'depresion_respiratoria'], ARRAY['somnolencia', 'amnesia']),

-- Digestivos
('Omeprazol', 'Omeprazol', 'omeprazole', 'IBP', 'capsule', '20mg', FALSE, ARRAY[], ARRAY['cefalea', 'diarrea'])
ON CONFLICT DO NOTHING;

-- ===== CREAR TABLA DE INTERACCIONES MEDICAMENTOSAS =====
CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_a_id UUID REFERENCES public.medications_catalog(id),
  medication_b_id UUID REFERENCES public.medications_catalog(id),
  medication_a_ingredient VARCHAR(200) NOT NULL,
  medication_b_ingredient VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'contraindicated')),
  interaction_type VARCHAR(50) NOT NULL, -- 'pharmacokinetic', 'pharmacodynamic', 'synergistic', 'antagonistic'
  mechanism TEXT,
  clinical_effect TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence_level VARCHAR(20) DEFAULT 'moderate' CHECK (evidence_level IN ('low', 'moderate', 'high')),
  onset VARCHAR(20) DEFAULT 'delayed' CHECK (onset IN ('rapid', 'delayed', 'unknown')),
  references TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(medication_a_ingredient, medication_b_ingredient)
);

-- ===== INSERTAR INTERACCIONES MEDICAMENTOSAS CONOCIDAS =====
INSERT INTO public.drug_interactions (
  medication_a_ingredient, medication_b_ingredient, severity, interaction_type, 
  mechanism, clinical_effect, recommendation, evidence_level, onset
) VALUES
-- Warfarina con otros medicamentos (alta prioridad)
('warfarin', 'aspirin', 'severe', 'pharmacodynamic', 
 'Ambos medicamentos tienen efecto anticoagulante', 
 'Riesgo significativamente aumentado de hemorragia',
 'Evitar combinación. Si es necesario, monitoreo estrecho de INR y signos de sangrado',
 'high', 'rapid'),
 
('warfarin', 'ibuprofen', 'moderate', 'pharmacodynamic',
 'AINES pueden aumentar riesgo de sangrado y afectar función plaquetaria',
 'Incremento del riesgo de hemorragia gastrointestinal',
 'Usar con precaución. Monitorear INR más frecuentemente',
 'high', 'delayed'),

('warfarin', 'amoxicillin', 'moderate', 'pharmacokinetic',
 'Amoxicilina puede potenciar el efecto anticoagulante alterando flora intestinal',
 'Posible aumento del efecto anticoagulante',
 'Monitorear INR durante tratamiento antibiótico',
 'moderate', 'delayed'),

('warfarin', 'ciprofloxacin', 'moderate', 'pharmacokinetic',
 'Ciprofloxacino inhibe metabolismo de warfarina',
 'Aumento del efecto anticoagulante y riesgo de sangrado',
 'Monitorear INR estrechamente, considerar reducir dosis de warfarina',
 'high', 'delayed'),

-- Interacciones de medicamentos cardiovasculares
('losartan', 'atorvastatin', 'mild', 'pharmacokinetic',
 'Interacción menor a nivel metabólico',
 'Efecto mínimo en niveles plasmáticos',
 'No se requieren ajustes especiales',
 'low', 'delayed'),

('metoprolol', 'amlodipine', 'mild', 'pharmacodynamic',
 'Efectos aditivos en reducción de presión arterial',
 'Posible hipotensión aditiva',
 'Monitorear presión arterial, especialmente al inicio',
 'moderate', 'rapid'),

-- Interacciones con tramadol
('tramadol', 'alprazolam', 'severe', 'pharmacodynamic',
 'Depresión aditiva del sistema nervioso central',
 'Riesgo de depresión respiratoria, sedación severa',
 'Evitar combinación. Si es necesario, reducir dosis y monitoreo estrecho',
 'high', 'rapid'),

('tramadol', 'lorazepam', 'severe', 'pharmacodynamic',
 'Depresión aditiva del sistema nervioso central',
 'Riesgo de depresión respiratoria, sedación severa',
 'Evitar combinación o usar dosis muy reducidas con monitoreo',
 'high', 'rapid'),

-- Interacciones entre benzodiazepinas y otros
('alprazolam', 'lorazepam', 'moderate', 'pharmacodynamic',
 'Efectos sedantes aditivos',
 'Sedación excesiva, deterioro cognitivo',
 'Evitar uso concomitante, si es necesario ajustar dosis',
 'moderate', 'rapid'),

-- Interacciones de antibióticos
('ciprofloxacin', 'ibuprofen', 'mild', 'pharmacokinetic',
 'Ciprofloxacino puede aumentar niveles de AINES',
 'Posible aumento de efectos adversos de AINES',
 'Monitorear efectos adversos gastrointestinales',
 'moderate', 'delayed'),

-- Interacciones con omeprazol
('omeprazole', 'atorvastatin', 'mild', 'pharmacokinetic',
 'Omeprazol puede afectar metabolismo de estatinas',
 'Posible aumento leve de niveles de estatina',
 'Monitorear síntomas de miopatía',
 'low', 'delayed'),

-- Interacciones de AINES
('ibuprofen', 'losartan', 'moderate', 'pharmacodynamic',
 'AINES pueden reducir eficacia de ARA II',
 'Posible reducción del efecto antihipertensivo',
 'Monitorear presión arterial, considerar alternativas',
 'high', 'delayed'),

('aspirin', 'ibuprofen', 'moderate', 'pharmacodynamic',
 'Competencia por sitios de unión, efectos aditivos en sangrado',
 'Reducción del efecto cardioprotector de aspirina, aumento de riesgo de sangrado',
 'Espaciar dosis o usar alternativas',
 'high', 'rapid')

ON CONFLICT (medication_a_ingredient, medication_b_ingredient) DO UPDATE SET
  severity = EXCLUDED.severity,
  interaction_type = EXCLUDED.interaction_type,
  mechanism = EXCLUDED.mechanism,
  clinical_effect = EXCLUDED.clinical_effect,
  recommendation = EXCLUDED.recommendation,
  evidence_level = EXCLUDED.evidence_level,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ===== FUNCIÓN PARA BUSCAR INTERACCIONES MEDICAMENTOSAS =====
CREATE OR REPLACE FUNCTION public.check_drug_interactions_detailed(
  medication_names TEXT[]
)
RETURNS TABLE(
  medication_a TEXT,
  medication_b TEXT,
  severity TEXT,
  interaction_type TEXT,
  clinical_effect TEXT,
  recommendation TEXT,
  evidence_level TEXT,
  onset TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    di.medication_a_ingredient::TEXT,
    di.medication_b_ingredient::TEXT,
    di.severity::TEXT,
    di.interaction_type::TEXT,
    di.clinical_effect::TEXT,
    di.recommendation::TEXT,
    di.evidence_level::TEXT,
    di.onset::TEXT
  FROM drug_interactions di
  JOIN medications_catalog ma ON LOWER(ma.active_ingredient) = di.medication_a_ingredient
  JOIN medications_catalog mb ON LOWER(mb.active_ingredient) = di.medication_b_ingredient
  WHERE (
    LOWER(ma.name) = ANY(SELECT LOWER(unnest(medication_names))) OR
    LOWER(ma.generic_name) = ANY(SELECT LOWER(unnest(medication_names)))
  ) AND (
    LOWER(mb.name) = ANY(SELECT LOWER(unnest(medication_names))) OR
    LOWER(mb.generic_name) = ANY(SELECT LOWER(unnest(medication_names)))
  )
  
  UNION
  
  -- También buscar por principio activo directamente
  SELECT DISTINCT
    di.medication_a_ingredient::TEXT,
    di.medication_b_ingredient::TEXT,
    di.severity::TEXT,
    di.interaction_type::TEXT,
    di.clinical_effect::TEXT,
    di.recommendation::TEXT,
    di.evidence_level::TEXT,
    di.onset::TEXT
  FROM drug_interactions di
  WHERE di.medication_a_ingredient = ANY(SELECT LOWER(unnest(medication_names)))
    AND di.medication_b_ingredient = ANY(SELECT LOWER(unnest(medication_names)));
END;
$$ LANGUAGE plpgsql;

-- ===== FUNCIÓN SIMPLIFICADA PARA FRONTEND =====
CREATE OR REPLACE FUNCTION public.get_interaction_alerts(
  medication_names TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  interactions JSONB := '[]';
  interaction_record RECORD;
  total_severe INTEGER := 0;
  total_moderate INTEGER := 0;
  total_mild INTEGER := 0;
BEGIN
  -- Obtener todas las interacciones
  FOR interaction_record IN 
    SELECT * FROM check_drug_interactions_detailed(medication_names)
  LOOP
    -- Contar por severidad
    CASE interaction_record.severity
      WHEN 'severe' THEN total_severe := total_severe + 1;
      WHEN 'contraindicated' THEN total_severe := total_severe + 1;
      WHEN 'moderate' THEN total_moderate := total_moderate + 1;
      WHEN 'mild' THEN total_mild := total_mild + 1;
    END CASE;
    
    -- Agregar interacción al array
    interactions := interactions || jsonb_build_object(
      'medicationA', interaction_record.medication_a,
      'medicationB', interaction_record.medication_b,
      'severity', interaction_record.severity,
      'type', interaction_record.interaction_type,
      'effect', interaction_record.clinical_effect,
      'recommendation', interaction_record.recommendation,
      'evidenceLevel', interaction_record.evidence_level,
      'onset', interaction_record.onset
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'interactions', interactions,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(interactions),
      'severe', total_severe,
      'moderate', total_moderate,
      'mild', total_mild
    ),
    'hasContraindications', total_severe > 0,
    'requiresMonitoring', total_moderate > 0 OR total_severe > 0
  );
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGER PARA VALIDAR INTERACCIONES EN PRESCRIPCIONES =====
CREATE OR REPLACE FUNCTION public.validate_prescription_interactions()
RETURNS TRIGGER AS $$
DECLARE
  medication_list TEXT[];
  interaction_alerts JSONB;
  severe_interactions INTEGER;
BEGIN
  -- Extraer nombres de medicamentos del JSONB
  SELECT ARRAY(
    SELECT med->>'name'
    FROM jsonb_array_elements(NEW.medications) AS med
  ) INTO medication_list;
  
  -- Verificar interacciones
  SELECT get_interaction_alerts(medication_list) INTO interaction_alerts;
  
  -- Obtener número de interacciones severas
  severe_interactions := (interaction_alerts->'summary'->>'severe')::INTEGER;
  
  -- Si hay interacciones severas, agregar advertencia
  IF severe_interactions > 0 THEN
    -- Agregar campo de alertas a la prescripción
    NEW.interaction_alerts := interaction_alerts;
    
    -- Log para auditoría
    INSERT INTO prescription_audit (
      prescription_id,
      doctor_id,
      patient_id,
      medication_name,
      action,
      justification
    ) VALUES (
      NEW.id,
      NEW.doctor_id,
      NEW.patient_id,
      'INTERACTION_ALERT',
      'created',
      'Prescripción creada con ' || severe_interactions || ' interacciones severas detectadas'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== AGREGAR CAMPO PARA ALERTAS DE INTERACCIÓN EN PRESCRIPCIONES =====
ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS interaction_alerts JSONB;

-- ===== APLICAR TRIGGER DE VALIDACIÓN =====
DROP TRIGGER IF EXISTS validate_interactions_trigger ON prescriptions;
CREATE TRIGGER validate_interactions_trigger
  BEFORE INSERT OR UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION validate_prescription_interactions();

-- ===== FUNCIÓN PARA OBTENER INFORMACIÓN COMPLETA DE MEDICAMENTO =====
CREATE OR REPLACE FUNCTION public.get_medication_info(medication_name TEXT)
RETURNS JSONB AS $$
DECLARE
  med_record medications_catalog%ROWTYPE;
  result JSONB;
BEGIN
  -- Buscar medicamento
  SELECT * INTO med_record
  FROM medications_catalog
  WHERE LOWER(name) = LOWER(medication_name)
     OR LOWER(generic_name) = LOWER(medication_name)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', FALSE,
      'message', 'Medicamento no encontrado en el catálogo'
    );
  END IF;
  
  -- Construir respuesta
  result := jsonb_build_object(
    'found', TRUE,
    'id', med_record.id,
    'name', med_record.name,
    'genericName', med_record.generic_name,
    'activeIngredient', med_record.active_ingredient,
    'therapeuticGroup', med_record.therapeutic_group,
    'form', med_record.form,
    'strength', med_record.strength,
    'isControlled', med_record.is_controlled,
    'requiresPrescription', med_record.requires_prescription,
    'contraindications', med_record.contraindications,
    'sideEffects', med_record.side_effects
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===== VISTA PARA CONSULTAS RÁPIDAS DE INTERACCIONES =====
CREATE OR REPLACE VIEW public.interaction_summary AS
SELECT 
  di.medication_a_ingredient,
  di.medication_b_ingredient,
  di.severity,
  di.clinical_effect,
  di.recommendation,
  COUNT(*) OVER (PARTITION BY di.severity) as severity_count
FROM drug_interactions di
ORDER BY 
  CASE di.severity
    WHEN 'contraindicated' THEN 1
    WHEN 'severe' THEN 2
    WHEN 'moderate' THEN 3
    WHEN 'mild' THEN 4
  END;

-- ===== ÍNDICES PARA OPTIMIZAR BÚSQUEDAS =====
CREATE INDEX IF NOT EXISTS idx_medications_catalog_name_gin ON medications_catalog USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_medications_catalog_active_ingredient ON medications_catalog(active_ingredient);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_ingredients ON drug_interactions(medication_a_ingredient, medication_b_ingredient);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(severity);
CREATE INDEX IF NOT EXISTS idx_prescriptions_interaction_alerts ON prescriptions USING gin(interaction_alerts);

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON TABLE medications_catalog IS 'Catálogo completo de medicamentos con principios activos y información clínica';
COMMENT ON TABLE drug_interactions IS 'Base de datos de interacciones medicamentosas con severidad y recomendaciones clínicas';

COMMENT ON FUNCTION check_drug_interactions_detailed(TEXT[]) IS 'Busca interacciones detalladas entre una lista de medicamentos';
COMMENT ON FUNCTION get_interaction_alerts(TEXT[]) IS 'Obtiene alertas de interacciones en formato JSON optimizado para frontend';
COMMENT ON FUNCTION get_medication_info(TEXT) IS 'Obtiene información completa de un medicamento específico';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Sistema completo de interacciones medicamentosas implementado con base de datos real y validaciones automáticas';
END $$; 