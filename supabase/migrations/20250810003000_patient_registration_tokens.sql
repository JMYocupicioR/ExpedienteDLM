-- =====================================================
-- Tabla: patient_registration_tokens
-- Fecha: 2025-08-10
-- Crea tokens de invitación para registro público de pacientes
-- =====================================================

CREATE TABLE IF NOT EXISTS public.patient_registration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  selected_scale_ids TEXT[] NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de soporte
CREATE INDEX IF NOT EXISTS idx_prt_token ON public.patient_registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_doctor ON public.patient_registration_tokens(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prt_clinic ON public.patient_registration_tokens(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prt_status_expires ON public.patient_registration_tokens(status, expires_at);

-- Habilitar RLS y políticas mínimas
ALTER TABLE public.patient_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Lectura: el médico creador y admin_staff de su clínica pueden verlos
CREATE POLICY prt_select_owner_or_admin
  ON public.patient_registration_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.role_in_clinic = 'admin_staff'
        AND r.is_active = true
        AND r.clinic_id = patient_registration_tokens.clinic_id
    )
  );

-- Inserción: el médico o admin de la clínica
CREATE POLICY prt_insert_owner_or_admin
  ON public.patient_registration_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.role_in_clinic = 'admin_staff'
        AND r.is_active = true
        AND r.clinic_id = patient_registration_tokens.clinic_id
    )
  );

-- Update: mismo criterio que select
CREATE POLICY prt_update_owner_or_admin
  ON public.patient_registration_tokens
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.role_in_clinic = 'admin_staff'
        AND r.is_active = true
        AND r.clinic_id = patient_registration_tokens.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.role_in_clinic = 'admin_staff'
        AND r.is_active = true
        AND r.clinic_id = patient_registration_tokens.clinic_id
    )
  );

-- Delete: restringido a super_admin o admin de clínica
CREATE POLICY prt_delete_admin
  ON public.patient_registration_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.role_in_clinic = 'admin_staff'
        AND r.is_active = true
        AND r.clinic_id = patient_registration_tokens.clinic_id
    )
  );


