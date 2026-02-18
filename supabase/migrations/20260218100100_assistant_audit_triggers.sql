-- =====================================================
-- MIGRACIÓN: Triggers de auditoría para appointments y patients
-- Fecha: 2026-02-18
-- Descripción: Habilita registro automático de auditoría en appointments y patients.
--   Las acciones del asistente (y de cualquier usuario) quedarán trazadas en audit_logs.
-- =====================================================

-- Asegurar que audit_trigger_function existe (creada en 20250919000003)
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in audit trigger: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appointments: auditar INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
CREATE TRIGGER audit_appointments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Patients: auditar INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS audit_patients_trigger ON public.patients;
CREATE TRIGGER audit_patients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
