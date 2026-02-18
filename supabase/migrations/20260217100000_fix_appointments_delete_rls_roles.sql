-- Fix appointments delete policy: use correct admin roles (owner, director, admin_staff)
-- Previous policy used 'admin' which is not a valid role_in_clinic value.

BEGIN;

DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
CREATE POLICY "appointments_delete_policy" ON public.appointments
  FOR DELETE
  USING (
    doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND clinic_id = appointments.clinic_id
        AND role_in_clinic IN ('owner', 'director', 'admin_staff')
        AND status = 'approved'
        AND is_active = true
    )
  );

COMMIT;
