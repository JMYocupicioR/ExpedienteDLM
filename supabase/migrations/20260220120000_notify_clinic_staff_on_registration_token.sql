-- =====================================================
-- Trigger: Crear notificaciones para todo el personal
-- de la clínica cuando se genera un enlace de registro.
-- Corre en el servidor, evita problemas de RLS en cliente.
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_clinic_staff_on_registration_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_user_id UUID;
  scale_count INT;
  msg TEXT;
  action_url_val TEXT;
BEGIN
  IF NEW.clinic_id IS NULL THEN
    RETURN NEW;
  END IF;

  scale_count := COALESCE(array_length(NEW.selected_scale_ids, 1), 0);
  IF scale_count IS NULL THEN scale_count := 0; END IF;

  IF NEW.assigned_patient_id IS NOT NULL THEN
    msg := format('Enlace generado para paciente. %s escala(s). Escanea el QR con la tablet en sala de espera.', scale_count);
    action_url_val := '/expediente/' || NEW.assigned_patient_id::text;
  ELSE
    msg := format('Enlace de registro generado con %s escala(s). Escanea el QR con la tablet para que el paciente responda.', scale_count);
    action_url_val := '/notificaciones';
  END IF;

  -- Insertar notificación para cada miembro aprobado de la clínica
  FOR staff_user_id IN
    SELECT cur.user_id
    FROM clinic_user_relationships cur
    WHERE cur.clinic_id = NEW.clinic_id
      AND cur.status = 'approved'
      AND cur.is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, related_entity_type, related_entity_id, action_url, priority)
    VALUES (
      staff_user_id,
      'Enlace de registro generado',
      msg,
      'registration_token',
      NEW.id,
      action_url_val,
      'normal'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_clinic_staff_on_registration_token ON public.patient_registration_tokens;
CREATE TRIGGER trg_notify_clinic_staff_on_registration_token
  AFTER INSERT ON public.patient_registration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_clinic_staff_on_registration_token();
