-- =====================================================
-- Permitir a personal de la clínica leer tokens de registro
-- para poder generar el QR en la vista de notificaciones.
-- =====================================================

CREATE POLICY patient_registration_tokens_clinic_staff_select
  ON public.patient_registration_tokens
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IS NOT NULL
    AND public.is_active_member(clinic_id)
  );
