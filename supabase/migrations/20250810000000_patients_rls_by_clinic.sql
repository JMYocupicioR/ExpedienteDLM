-- =====================================================
-- RLS: Patients visibles solo por clínica del usuario
-- Fecha: 2025-08-10
-- =====================================================

-- Asegurar tabla de relaciones usuario-clínica
CREATE TABLE IF NOT EXISTS public.clinic_user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_clinic TEXT NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  permissions_override JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);

-- Restringir valores válidos de rol (alineado al frontend: 'doctor' | 'admin_staff')
ALTER TABLE public.clinic_user_relationships
  DROP CONSTRAINT IF EXISTS chk_role_in_clinic_valid,
  ADD CONSTRAINT chk_role_in_clinic_valid CHECK (role_in_clinic IN ('doctor','admin_staff'));

-- Backfill de clinic_id en patients cuando sea posible (desde perfil del médico primario)
UPDATE public.patients AS pa
SET clinic_id = pr.clinic_id
FROM public.profiles AS pr
WHERE pa.clinic_id IS NULL
  AND pa.primary_doctor_id = pr.id
  AND pr.clinic_id IS NOT NULL;

-- Enforce NOT NULL en patients.clinic_id (solo si ya no hay NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients WHERE clinic_id IS NULL
  ) THEN
    ALTER TABLE public.patients ALTER COLUMN clinic_id SET NOT NULL;
  END IF;
END $$;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_clinic_user_rel_user ON public.clinic_user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_user_rel_clinic ON public.clinic_user_relationships(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);

-- Habilitar RLS en patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Política: super_admin acceso total (opcional)
CREATE POLICY patients_super_admin_all
  ON public.patients
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'super_admin'
    )
  );

-- Helper expresión como subconsulta para reuso
-- Política SELECT: solo filas de clínicas donde el usuario tenga relación activa
CREATE POLICY patients_select_by_clinic
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política INSERT: el clinic_id insertado debe pertenecer a una clínica del usuario
CREATE POLICY patients_insert_by_clinic
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política UPDATE: puede modificar solo pacientes de su clínica
CREATE POLICY patients_update_by_clinic
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política DELETE: puede eliminar solo pacientes de su clínica
CREATE POLICY patients_delete_by_clinic
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Nota: si existían políticas previas en patients, revísalas para que no entren en conflicto


