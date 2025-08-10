-- =====================================================
-- SISTEMA DE LOGS DE ACTIVIDAD
-- =====================================================

-- Tabla principal de logs de actividad
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN (
      'consultation',
      'prescription',
      'patient_created',
      'appointment',
      'test_result',
      'note'
    )
  ),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name VARCHAR(255),
  status VARCHAR(50) CHECK (
    status IN (
      'completed',
      'pending',
      'cancelled',
      'scheduled'
    )
  ),
  priority VARCHAR(20) CHECK (
    priority IN (
      'low',
      'medium',
      'high'
    )
  ),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_activity_logs_doctor_id ON activity_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_patient_id ON activity_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);

-- RLS para activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'administrator'
  );
$$;

-- Política de lectura
CREATE POLICY "activity_logs_select_policy"
ON activity_logs FOR SELECT
TO authenticated
USING (
  doctor_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ) OR
  is_admin()
);

-- Política de inserción
CREATE POLICY "activity_logs_insert_policy"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  doctor_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  )
);

-- Política de actualización
CREATE POLICY "activity_logs_update_policy"
ON activity_logs FOR UPDATE
TO authenticated
USING (
  doctor_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ) OR
  is_admin()
)
WITH CHECK (
  doctor_id IN (
    SELECT id FROM profiles WHERE id = auth.uid()
  ) OR
  is_admin()
);

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_activity_logs
  BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Función para limpiar logs antiguos
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM activity_logs
    WHERE date < NOW() - (days_to_keep || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- Función para obtener resumen de actividad
CREATE OR REPLACE FUNCTION public.get_activity_summary(
  doctor_id UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  activity_type VARCHAR(50),
  total_count INTEGER,
  completed_count INTEGER,
  pending_count INTEGER,
  cancelled_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    logs.type as activity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
  FROM activity_logs logs
  WHERE 
    logs.doctor_id = get_activity_summary.doctor_id AND
    logs.date BETWEEN start_date AND end_date
  GROUP BY logs.type;
END;
$$;

-- Comentarios
COMMENT ON TABLE public.activity_logs IS 'Registro de todas las actividades realizadas por los usuarios';
COMMENT ON COLUMN activity_logs.type IS 'Tipo de actividad: consultation, prescription, patient_created, etc.';
COMMENT ON COLUMN activity_logs.metadata IS 'Datos adicionales específicos de cada tipo de actividad en formato JSONB';

-- Datos de ejemplo para testing
INSERT INTO public.activity_logs (
  doctor_id,
  type,
  title,
  description,
  date,
  status,
  priority,
  metadata
)
SELECT 
  p.id,
  'note',
  'Nota de prueba del sistema de logs',
  'Esta es una nota automática creada para verificar el funcionamiento del sistema de logs.',
  NOW(),
  'completed',
  'low',
  '{"test": true, "version": "1.0"}'::jsonb
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = current_setting('request.jwt.claim.email', true)
LIMIT 1;