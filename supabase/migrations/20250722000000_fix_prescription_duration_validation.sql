/*
  # Migración para Validar Duración de Recetas de Medicamentos Controlados

  1. Problema identificado:
    - La columna `max_prescription_days` en la tabla `controlled_medications` no se estaba aplicando.
    - Las recetas para medicamentos controlados podían tener una duración mayor a la permitida.

  2. Correcciones:
    - Se crea la función `validate_prescription_duration` para verificar que la duración de los
      medicamentos en una receta no exceda el máximo permitido para los controlados.
    - Se actualiza la política de seguridad (RLS) de inserción en la tabla `prescriptions`
      para que utilice esta nueva función de validación.
*/

-- ===== FUNCIÓN PARA VALIDAR LA DURACIÓN DE LA PRESCRIPCIÓN =====

CREATE OR REPLACE FUNCTION public.validate_prescription_duration(medications_input JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  med RECORD;
  controlled_med_record public.controlled_medications%ROWTYPE;
  prescription_duration_days INTEGER;
BEGIN
  -- Iterar sobre cada medicamento en el array JSONB
  FOR med IN SELECT value FROM jsonb_array_elements(medications_input) LOOP
    -- Buscar si el medicamento está en la lista de controlados
    SELECT * INTO controlled_med_record
    FROM public.controlled_medications
    WHERE LOWER(name) = LOWER(med.value->>'name');

    -- Si es un medicamento controlado, validar su duración
    IF FOUND THEN
      -- Extraer la duración. Asumimos que es un string que puede contener texto, ej. "7 días".
      -- Esta expresión regular extrae solo los dígitos.
      BEGIN
        prescription_duration_days := regexp_replace(med.value->>'duration', '[^0-9]', '', 'g')::INTEGER;
      EXCEPTION WHEN OTHERS THEN
        prescription_duration_days := NULL;
      END;

      -- Si la duración no se puede determinar o es nula, se rechaza por seguridad.
      IF prescription_duration_days IS NULL THEN
        RAISE EXCEPTION 'La duración para el medicamento controlado "%" es inválida o no fue especificada. Por favor, use un formato como "7 días".', med.value->>'name';
      END IF;

      -- Comparar la duración de la receta con el máximo permitido
      IF prescription_duration_days > controlled_med_record.max_prescription_days THEN
        RAISE EXCEPTION 'La duración de la receta para "%" (% días) excede el máximo permitido de % días.',
          med.value->>'name',
          prescription_duration_days,
          controlled_med_record.max_prescription_days;
      END IF;
    END IF;
  END LOOP;

  -- Si todas las validaciones pasan, la función retorna verdadero
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== ACTUALIZAR POLÍTICA RLS PARA PRESCRIPCIONES =====

-- Se elimina la política existente para recrearla con la nueva validación.
DROP POLICY IF EXISTS "Doctors can create prescriptions with controlled medication validation" ON public.prescriptions;

-- Se crea la política con el chequeo de duración añadido.
CREATE POLICY "Doctors can create prescriptions with controlled medication validation"
  ON public.prescriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 1. Verificar que el usuario es un doctor con licencia válida
    public.validate_medical_license(auth.uid()) AND
    
    -- 2. Verificar que el doctor tiene permiso para prescribir cada medicamento
    (SELECT bool_and(
      public.can_prescribe_controlled_medication(auth.uid(), med->>'name')
    ) FROM jsonb_array_elements(medications) AS med) AND

    -- 3. (NUEVO) Verificar que la duración de los medicamentos controlados es válida
    public.validate_prescription_duration(medications) AND
    
    -- 4. Verificar que el JSON de medicamentos tiene la estructura correcta
    -- (Asumiendo que esta función de validación de esquema existe en el sistema)
    public.validate_jsonb_schema(medications, 'medications') AND
    
    -- 5. Verificar que el doctor_id coincide con el del usuario autenticado
    doctor_id = auth.uid()
  );

-- ===== COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON FUNCTION public.validate_prescription_duration(JSONB) IS 'Valida que la duración de los medicamentos controlados en una receta no exceda el máximo permitido en la tabla controlled_medications.';

-- ===== LOG DE MIGRACIÓN =====
DO $$
BEGIN
  RAISE LOG 'MIGRACIÓN COMPLETADA: Se ha añadido la validación de duración para recetas de medicamentos controlados.';
END $$; 