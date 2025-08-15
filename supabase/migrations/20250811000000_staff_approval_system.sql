-- =====================================================
-- MIGRACIÓN: Sistema de Aprobación de Personal
-- Fecha: 2025-08-11
-- Descripción: Implementa sistema de aprobación para personal de clínicas
-- =====================================================

-- 1. AGREGAR CAMPO STATUS A clinic_user_relationships
ALTER TABLE public.clinic_user_relationships 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. AGREGAR CAMPOS DE AUDITORÍA
ALTER TABLE public.clinic_user_relationships 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 3. CREAR ÍNDICES PARA MEJOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_clinic_user_relationships_status ON public.clinic_user_relationships(status);
CREATE INDEX IF NOT EXISTS idx_clinic_user_relationships_clinic_status ON public.clinic_user_relationships(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_clinic_user_relationships_user_status ON public.clinic_user_relationships(user_id, status);

-- 4. FUNCIÓN HELPER PARA VERIFICAR SI UN USUARIO TIENE ACCESO APROBADO A UNA CLÍNICA
CREATE OR REPLACE FUNCTION user_has_approved_access_to_clinic(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
      AND clinic_id = check_clinic_id 
      AND status = 'approved'
      AND is_active = true
  );
$$;

-- 5. FUNCIÓN HELPER PARA VERIFICAR SI UN USUARIO ES ADMIN DE UNA CLÍNICA
CREATE OR REPLACE FUNCTION user_is_clinic_admin(check_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clinic_user_relationships 
    WHERE user_id = auth.uid() 
      AND clinic_id = check_clinic_id 
      AND status = 'approved'
      AND role_in_clinic = 'admin_staff'
      AND is_active = true
  );
$$;

-- 6. FUNCIÓN PARA APROBAR USUARIO
CREATE OR REPLACE FUNCTION approve_clinic_user(
  target_user_id UUID,
  target_clinic_id UUID,
  approver_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el aprobador sea admin de la clínica
  IF NOT user_is_clinic_admin(target_clinic_id) THEN
    RAISE EXCEPTION 'Solo los administradores pueden aprobar usuarios';
  END IF;
  
  -- Verificar que la relación exista y esté pendiente
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_user_relationships 
    WHERE user_id = target_user_id 
      AND clinic_id = target_clinic_id 
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'No se encontró solicitud pendiente para este usuario';
  END IF;
  
  -- Aprobar la solicitud
  UPDATE public.clinic_user_relationships 
  SET 
    status = 'approved',
    approved_by = approver_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id 
    AND clinic_id = target_clinic_id 
    AND status = 'pending';
    
  RETURN FOUND;
END;
$$;

-- 7. FUNCIÓN PARA RECHAZAR USUARIO
CREATE OR REPLACE FUNCTION reject_clinic_user(
  target_user_id UUID,
  target_clinic_id UUID,
  rejection_reason TEXT DEFAULT NULL,
  rejector_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el rechazador sea admin de la clínica
  IF NOT user_is_clinic_admin(target_clinic_id) THEN
    RAISE EXCEPTION 'Solo los administradores pueden rechazar usuarios';
  END IF;
  
  -- Verificar que la relación exista y esté pendiente
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_user_relationships 
    WHERE user_id = target_user_id 
      AND clinic_id = target_clinic_id 
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'No se encontró solicitud pendiente para este usuario';
  END IF;
  
  -- Rechazar la solicitud
  UPDATE public.clinic_user_relationships 
  SET 
    status = 'rejected',
    rejection_reason = rejection_reason,
    rejected_by = rejector_id,
    rejected_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id 
    AND clinic_id = target_clinic_id 
    AND status = 'pending';
    
  RETURN FOUND;
END;
$$;

-- 8. FUNCIÓN PARA SOLICITAR ACCESO A UNA CLÍNICA (MÉDICOS)
CREATE OR REPLACE FUNCTION request_clinic_access(
  target_clinic_id UUID,
  desired_role_in_clinic TEXT DEFAULT 'doctor',
  request_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  clinic_name TEXT;
  user_full_name TEXT;
  existing_status TEXT;
  result JSON;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Verificar que la clínica existe
  SELECT name INTO clinic_name
  FROM public.clinics 
  WHERE id = target_clinic_id AND is_active = true;
  
  IF clinic_name IS NULL THEN
    RAISE EXCEPTION 'La clínica especificada no existe o no está activa';
  END IF;
  
  -- Obtener información del usuario
  SELECT full_name INTO user_full_name
  FROM public.profiles 
  WHERE id = current_user_id;
  
  -- Verificar si ya existe una relación con esta clínica
  SELECT status INTO existing_status
  FROM public.clinic_user_relationships 
  WHERE user_id = current_user_id AND clinic_id = target_clinic_id;
  
  -- Manejar casos según el estado existente
  IF existing_status IS NOT NULL THEN
    CASE existing_status
      WHEN 'pending' THEN
        RAISE EXCEPTION 'Ya tienes una solicitud pendiente para esta clínica. Espera la respuesta del administrador.';
      WHEN 'approved' THEN
        RAISE EXCEPTION 'Ya eres miembro aprobado de esta clínica.';
      WHEN 'rejected' THEN
        -- Permitir re-solicitar si fue rechazado
        UPDATE public.clinic_user_relationships 
        SET 
          status = 'pending',
          role_in_clinic = desired_role_in_clinic,
          rejection_reason = NULL,
          rejected_by = NULL,
          rejected_at = NULL,
          updated_at = NOW()
        WHERE user_id = current_user_id AND clinic_id = target_clinic_id;
        
        result := json_build_object(
          'success', true,
          'message', 'Solicitud reenviada exitosamente. El administrador de la clínica revisará tu nueva solicitud.',
          'clinic_name', clinic_name,
          'status', 'pending',
          'action', 'resubmitted'
        );
        RETURN result;
    END CASE;
  ELSE
    -- Crear nueva solicitud
    INSERT INTO public.clinic_user_relationships (
      clinic_id,
      user_id,
      role_in_clinic,
      status,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      target_clinic_id,
      current_user_id,
      desired_role_in_clinic,
      'pending',
      true,
      NOW(),
      NOW()
    );
    
    result := json_build_object(
      'success', true,
      'message', 'Solicitud enviada exitosamente. El administrador de la clínica revisará tu solicitud.',
      'clinic_name', clinic_name,
      'status', 'pending',
      'action', 'created'
    );
    RETURN result;
  END IF;
  
  -- Este punto no debería alcanzarse, pero por seguridad
  RAISE EXCEPTION 'Error inesperado al procesar la solicitud';
END;
$$;

-- 9. FUNCIÓN PARA BUSCAR CLÍNICAS DISPONIBLES
CREATE OR REPLACE FUNCTION search_available_clinics(
  search_term TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  clinic_id UUID,
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  clinic_email TEXT,
  current_user_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    COALESCE(cur.status, 'not_member') as current_user_status
  FROM public.clinics c
  LEFT JOIN public.clinic_user_relationships cur 
    ON c.id = cur.clinic_id AND cur.user_id = current_user_id
  WHERE c.is_active = true
    AND (
      search_term IS NULL 
      OR c.name ILIKE '%' || search_term || '%'
      OR c.address ILIKE '%' || search_term || '%'
    )
  ORDER BY 
    CASE 
      WHEN cur.status = 'approved' THEN 1
      WHEN cur.status = 'pending' THEN 2 
      WHEN cur.status = 'rejected' THEN 3
      ELSE 4
    END,
    c.name
  LIMIT limit_results;
END;
$$;

-- 10. ACTUALIZAR POLÍTICAS RLS EXISTENTES PARA INCLUIR STATUS = 'approved'

-- Política para patients - solo usuarios aprobados
DROP POLICY IF EXISTS patients_select_by_clinic ON public.patients;
CREATE POLICY patients_select_by_clinic
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.status = 'approved'
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política para patients - INSERT
DROP POLICY IF EXISTS patients_insert_by_clinic ON public.patients;
CREATE POLICY patients_insert_by_clinic
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.status = 'approved'
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política para patients - UPDATE
DROP POLICY IF EXISTS patients_update_by_clinic ON public.patients;
CREATE POLICY patients_update_by_clinic
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.status = 'approved'
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.status = 'approved'
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
    )
  );

-- Política para patients - DELETE
DROP POLICY IF EXISTS patients_delete_by_clinic ON public.patients;
CREATE POLICY patients_delete_by_clinic
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_user_relationships r
      WHERE r.user_id = auth.uid()
        AND r.status = 'approved'
        AND r.is_active = true
        AND r.clinic_id = patients.clinic_id
        AND r.role_in_clinic = 'admin_staff'
    )
  );

-- 9. ACTUALIZAR POLÍTICAS DE STORAGE PARA INCLUIR STATUS = 'approved'

-- Política para patient-documents
DROP POLICY IF EXISTS patient_docs_clinic_users ON storage.objects;
CREATE POLICY patient_docs_clinic_users
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND status = 'approved'
          AND is_active = true
      )
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT clinic_id::text
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND status = 'approved'
          AND is_active = true
      )
    )
  );

-- 10. ACTUALIZAR POLÍTICAS DE clinic_user_relationships

-- Política para ver relaciones (usuarios ven las suyas, admins ven todas de su clínica)
DROP POLICY IF EXISTS cur_select_self_or_admin ON public.clinic_user_relationships;
CREATE POLICY cur_select_self_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    -- Usuario ve sus propias relaciones
    user_id = auth.uid()
    OR 
    -- Admin ve todas las relaciones de su clínica
    (
      clinic_id IN (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND status = 'approved'
          AND role_in_clinic = 'admin_staff'
          AND is_active = true
      )
    )
  );

-- Política para crear relaciones (solo admins o auto-registro)
DROP POLICY IF EXISTS cur_insert_self_or_admin ON public.clinic_user_relationships;
CREATE POLICY cur_insert_self_or_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Usuario puede agregarse a sí mismo (auto-registro)
    user_id = auth.uid()
    OR
    -- O es admin de la clínica
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
    )
  );

-- Política para actualizar relaciones (solo admins)
DROP POLICY IF EXISTS cur_update_admin ON public.clinic_user_relationships;
CREATE POLICY cur_update_admin
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
      )
    )
  );

-- Política para eliminar relaciones (solo admins)
DROP POLICY IF EXISTS cur_delete_admin ON public.clinic_user_relationships;
CREATE POLICY cur_delete_admin
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id 
      FROM public.clinic_user_relationships
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
      )
    )
  );

-- 13. CONCEDER PERMISOS A FUNCIONES
GRANT EXECUTE ON FUNCTION user_has_approved_access_to_clinic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_clinic_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_clinic_user(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_clinic_user(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_clinic_access(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_available_clinics(TEXT, INTEGER) TO authenticated;

-- 14. ACTUALIZAR REGISTROS EXISTENTES
-- Marcar como 'approved' a usuarios que ya tienen is_active = true
UPDATE public.clinic_user_relationships 
SET status = 'approved', updated_at = NOW()
WHERE is_active = true AND status = 'pending';

-- 15. CREAR VISTA PARA FACILITAR CONSULTAS
CREATE OR REPLACE VIEW clinic_staff_overview AS
SELECT 
  c.id as clinic_id,
  c.name as clinic_name,
  cur.user_id,
  p.full_name,
  p.email,
  cur.role_in_clinic,
  cur.status,
  cur.is_active,
  cur.created_at,
  cur.approved_at,
  cur.approved_by,
  cur.rejection_reason,
  cur.rejected_at,
  cur.rejected_by
FROM public.clinics c
JOIN public.clinic_user_relationships cur ON c.id = cur.clinic_id
JOIN public.profiles p ON cur.user_id = p.id
ORDER BY c.name, cur.status, cur.created_at;

-- 16. CREAR TRIGGER PARA AUDITORÍA
CREATE OR REPLACE FUNCTION audit_clinic_user_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Registrar cambio de estado
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      timestamp
    ) VALUES (
      'clinic_user_relationships',
      NEW.id,
      'status_change',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.profiles(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Crear trigger
DROP TRIGGER IF EXISTS audit_clinic_user_status_change_trigger ON public.clinic_user_relationships;
CREATE TRIGGER audit_clinic_user_status_change_trigger
  AFTER UPDATE ON public.clinic_user_relationships
  FOR EACH ROW
  EXECUTE FUNCTION audit_clinic_user_status_change();

-- 17. CREAR ÍNDICES PARA AUDITORÍA
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp);

-- 18. CONCEDER PERMISOS FINALES
GRANT SELECT ON public.clinic_staff_overview TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;

-- =====================================================
-- RESUMEN DE CAMBIOS IMPLEMENTADOS:
-- =====================================================
-- ✅ Campo status agregado a clinic_user_relationships
-- ✅ Campos de auditoría para aprobación/rechazo
-- ✅ Funciones helper para verificar permisos
-- ✅ Función para solicitar acceso a clínicas (médicos)
-- ✅ Función para buscar clínicas disponibles
-- ✅ Políticas RLS actualizadas para incluir status = 'approved'
-- ✅ Sistema de auditoría completo
-- ✅ Vista para facilitar consultas de personal
-- ✅ Índices para optimizar performance
-- =====================================================
