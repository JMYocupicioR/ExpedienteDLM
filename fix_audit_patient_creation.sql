-- Arreglar la función de auditoría para usar el esquema correcto de activity_logs
CREATE OR REPLACE FUNCTION public.audit_patient_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the creation attempt usando el esquema correcto
  INSERT INTO public.activity_logs (
    doctor_id,
    type,
    title,
    description,
    date,
    patient_id,
    patient_name,
    status,
    priority,
    metadata
  ) VALUES (
    auth.uid(),
    'patient_created',
    'Nuevo paciente registrado',
    'Se ha registrado un nuevo paciente: ' || NEW.full_name,
    NOW(),
    NEW.id,
    NEW.full_name,
    'completed',
    'medium',
    jsonb_build_object(
      'patient_name', NEW.full_name,
      'curp', COALESCE(NEW.curp, ''),
      'created_by', auth.uid(),
      'clinic_id', NEW.clinic_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;