-- =====================================================
-- Permitir a administrative_assistant ver personal de su clínica
-- Fecha: 2026-02-18
-- Descripción: Asistentes necesitan ver la lista de doctores/estaff
--   para asignar citas. Extiende RLS en clinic_user_relationships y profiles.
-- =====================================================

BEGIN;

-- --------------------------------------------------------
-- clinic_user_relationships: permitir a miembros activos ver
-- todos los relationships de su clínica (no solo el propio)
-- --------------------------------------------------------
DROP POLICY IF EXISTS "cur_select_policy" ON public.clinic_user_relationships;

CREATE POLICY "cur_select_policy" ON public.clinic_user_relationships
FOR SELECT USING (
  is_super_admin()
  OR user_id = auth.uid()
  OR is_clinic_admin(clinic_id)
  OR is_active_member(clinic_id)
);

-- --------------------------------------------------------
-- profiles: permitir a miembros activos ver perfiles de
-- otros miembros de la misma clínica (para lista de staff)
-- --------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR is_super_admin()
  OR EXISTS (
    SELECT 1 FROM clinic_user_relationships cur_admin
    JOIN clinic_user_relationships cur_member ON cur_admin.clinic_id = cur_member.clinic_id
    WHERE cur_admin.user_id = auth.uid()
      AND cur_member.user_id = public.profiles.id
      AND cur_admin.role_in_clinic IN ('owner', 'director', 'admin_staff')
      AND cur_admin.status = 'approved'
      AND cur_admin.is_active = true
  )
  -- Asistentes y otros miembros activos ven perfiles de colegas en su clínica
  OR EXISTS (
    SELECT 1 FROM clinic_user_relationships cur_me
    JOIN clinic_user_relationships cur_other ON cur_me.clinic_id = cur_other.clinic_id
    WHERE cur_me.user_id = auth.uid()
      AND cur_other.user_id = public.profiles.id
      AND cur_me.status = 'approved'
      AND cur_me.is_active = true
      AND cur_other.status = 'approved'
      AND cur_other.is_active = true
  )
);

COMMIT;
