/*
  # Migración para Mejorar el Reporte de Interacciones Medicamentosas

  1. Problema identificado:
    - La función `get_interaction_alerts` ignoraba silenciosamente los medicamentos
      que no se encontraban en el catálogo, lo que podía dar una falsa sensación de seguridad.

  2. Correcciones:
    - Se modifica la función `get_interaction_alerts` para que ahora devuelva un
      objeto JSON más completo.
    - El nuevo objeto de respuesta incluye una lista `unfound_medications` que
      contiene todos los medicamentos de la entrada que no pudieron ser
      verificados por no existir en `medications_catalog`.
*/

-- ===== FUNCIÓN MEJORADA PARA OBTENER ALERTAS DE INTERACCIÓN =====

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
  unfound_medications TEXT[] := ARRAY[]::TEXT[];
  med_name TEXT;
  found_med_count INTEGER;
BEGIN
  -- 1. Validar qué medicamentos de la lista de entrada existen en el catálogo
  FOREACH med_name IN ARRAY medication_names
  LOOP
    SELECT COUNT(*) INTO found_med_count
    FROM public.medications_catalog
    WHERE LOWER(name) = LOWER(med_name)
       OR LOWER(generic_name) = LOWER(med_name)
       OR LOWER(active_ingredient) = LOWER(med_name);

    IF found_med_count = 0 THEN
      unfound_medications := array_append(unfound_medications, med_name);
    END IF;
  END LOOP;

  -- 2. Obtener todas las interacciones para los medicamentos que sí se encontraron
  FOR interaction_record IN 
    SELECT * FROM public.check_drug_interactions_detailed(medication_names)
  LOOP
    -- Contar por severidad
    CASE interaction_record.severity
      WHEN 'severe' THEN total_severe := total_severe + 1;
      WHEN 'contraindicated' THEN total_severe := total_severe + 1;
      WHEN 'moderate' THEN total_moderate := total_moderate + 1;
      WHEN 'mild' THEN total_mild := total_mild + 1;
    END CASE;
    
    -- Agregar interacción al array JSON
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
  
  -- 3. Construir el objeto de respuesta final
  RETURN jsonb_build_object(
    'interactions', interactions,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(interactions),
      'severe', total_severe,
      'moderate', total_moderate,
      'mild', total_mild
    ),
    'unfound_medications', to_jsonb(unfound_medications),
    'has_unverified_meds', array_length(unfound_medications, 1) > 0,
    'has_contraindications', total_severe > 0,
    'requires_monitoring', total_moderate > 0 OR total_severe > 0
  );
END;
$$ LANGUAGE plpgsql;

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON FUNCTION public.get_interaction_alerts(TEXT[]) IS 'Obtiene alertas de interacciones y una lista de medicamentos no encontrados. Devuelve un JSON con: interactions, summary, y unfound_medications.';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: La función get_interaction_alerts ha sido mejorada para reportar medicamentos no encontrados.';
END $$; 