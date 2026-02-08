-- =====================================================
-- MIGRACIÓN: Habilitar acceso a Consultas (RLS)
-- Fecha: 2026-02-05
-- Descripción: Agrega políticas RLS para SELECT, INSERT y UPDATE en la tabla consultations.
-- Soluciona el error "permission denied" al crear consultas.
-- =====================================================

-- Habilitar RLS (por si acaso)
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas antiguas (limpieza)
DROP POLICY IF EXISTS "consultations_select_own_clinic" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert_access" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update_access" ON public.consultations;

-- 2. Política SELECT: 
-- - Doctores ven consultas que ellos hicieron
-- - Miembros de la clínica ven consultas de su clínica
CREATE POLICY "consultations_select_access" ON public.consultations
FOR SELECT USING (
  -- El usuario es el doctor que la creó
  doctor_id = auth.uid()
  OR
  -- O el usuario pertenece a la clínica de la consulta
  (
    clinic_id IS NOT NULL AND
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
    )
  )
);

-- 3. Política INSERT:
-- - Doctores pueden crear consultas para ellos mismos
-- - Si es en una clínica, deben ser miembros activos
CREATE POLICY "consultations_insert_access" ON public.consultations
FOR INSERT WITH CHECK (
  doctor_id = auth.uid()
  AND
  (
    -- Caso 1: Médico independiente (podría ser NULL clinic_id, aunque la app parece requerirlo a veces)
    -- Si tu app permite consultas sin clínica explícita:
    clinic_id IS NULL
    OR
    -- Caso 2: Consulta en clínica
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
    )
  )
);

-- 4. Política UPDATE:
-- - El doctor creador puede editar
-- - Miembros de la clínica (con permisos, simplificado a todos por ahora) pueden editar
CREATE POLICY "consultations_update_access" ON public.consultations
FOR UPDATE USING (
  doctor_id = auth.uid()
  OR
  (
    clinic_id IS NOT NULL AND
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND status = 'approved'
    )
  )
);

-- Index recommendations based on usage
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_date ON consultations(doctor_id, created_at DESC);
