-- =====================================================
-- MIGRACIÓN: Sistema de Citas Robusto y Notificaciones
-- Fecha: 2025-08-12
-- Descripción: Crea tabla de appointments con estado y notificaciones
-- =====================================================

-- 1. CREAR TABLA DE APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30, -- duración en minutos
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'confirmed_by_patient', 'completed', 'cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
  ),
  type TEXT NOT NULL DEFAULT 'consultation' CHECK (
    type IN ('consultation', 'follow_up', 'check_up', 'procedure', 'emergency')
  ),
  location TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  external_calendar_event_id TEXT, -- Para futuras integraciones con Google Calendar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- 2. CREAR TABLA DE NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  title TEXT,
  is_read BOOLEAN DEFAULT false,
  related_entity_type TEXT, -- 'appointment', 'patient', 'consultation', etc.
  related_entity_id UUID,
  action_url TEXT, -- URL opcional para navegar al hacer click
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON public.appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON public.appointments(clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON public.appointments(doctor_id, status);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority, created_at DESC);

-- 4. FUNCIÓN PARA VERIFICAR CONFLICTOS DE CITAS
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_duration INTEGER,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  conflict_exists BOOLEAN := false;
  appointment_start TIMESTAMP;
  appointment_end TIMESTAMP;
BEGIN
  -- Combinar fecha y hora para crear timestamps
  appointment_start := (p_appointment_date::text || ' ' || p_appointment_time::text)::timestamp;
  appointment_end := appointment_start + (p_duration || ' minutes')::interval;
  
  -- Verificar si existe conflicto con otras citas del mismo médico
  SELECT EXISTS (
    SELECT 1 
    FROM public.appointments a
    WHERE a.doctor_id = p_doctor_id
      AND a.status NOT IN ('cancelled_by_clinic', 'cancelled_by_patient', 'no_show')
      AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
      AND (
        -- La nueva cita empieza durante una cita existente
        (appointment_start >= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_start < (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
        OR
        -- La nueva cita termina durante una cita existente
        (appointment_end > (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_end <= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
        OR
        -- La nueva cita envuelve completamente una cita existente
        (appointment_start <= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp 
         AND appointment_end >= (a.appointment_date::text || ' ' || a.appointment_time::text)::timestamp + (a.duration || ' minutes')::interval)
      )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$;

-- 5. FUNCIÓN PARA CREAR NOTIFICACIONES DE CITA
CREATE OR REPLACE FUNCTION create_appointment_notifications(
  p_appointment_id UUID,
  p_doctor_id UUID,
  p_patient_id UUID,
  p_clinic_id UUID,
  p_patient_name TEXT,
  p_doctor_name TEXT,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_action_type TEXT -- 'created', 'updated', 'cancelled'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_message TEXT;
  notification_title TEXT;
  admin_user RECORD;
BEGIN
  -- Preparar mensaje según el tipo de acción
  CASE p_action_type
    WHEN 'created' THEN
      notification_title := 'Nueva cita agendada';
      notification_message := 'Nueva cita con ' || p_patient_name || ' para ' || p_appointment_date || ' a las ' || p_appointment_time;
    WHEN 'updated' THEN
      notification_title := 'Cita modificada';
      notification_message := 'Cita con ' || p_patient_name || ' modificada para ' || p_appointment_date || ' a las ' || p_appointment_time;
    WHEN 'cancelled' THEN
      notification_title := 'Cita cancelada';
      notification_message := 'Cita con ' || p_patient_name || ' del ' || p_appointment_date || ' a las ' || p_appointment_time || ' ha sido cancelada';
    ELSE
      notification_title := 'Actualización de cita';
      notification_message := 'Actualización en cita con ' || p_patient_name;
  END CASE;

  -- Notificar al médico asignado
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    related_entity_type, 
    related_entity_id,
    action_url,
    priority
  ) VALUES (
    p_doctor_id,
    notification_title,
    notification_message,
    'appointment',
    p_appointment_id,
    '/citas',
    CASE WHEN p_action_type = 'cancelled' THEN 'high' ELSE 'normal' END
  );

  -- Notificar a todos los administradores de la clínica
  FOR admin_user IN 
    SELECT DISTINCT cur.user_id
    FROM public.clinic_user_relationships cur
    WHERE cur.clinic_id = p_clinic_id 
      AND cur.role_in_clinic = 'admin_staff'
      AND cur.status = 'approved'
      AND cur.is_active = true
      AND cur.user_id != p_doctor_id -- No duplicar notificación al médico
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      priority
    ) VALUES (
      admin_user.user_id,
      notification_title,
      notification_message,
      'appointment',
      p_appointment_id,
      '/citas',
      CASE WHEN p_action_type = 'cancelled' THEN 'high' ELSE 'normal' END
    );
  END LOOP;
END;
$$;

-- 6. FUNCIÓN PARA ACTUALIZAR TIMESTAMP AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. CREAR TRIGGERS
-- Trigger para actualizar updated_at en appointments
DROP TRIGGER IF EXISTS update_appointments_modtime ON public.appointments;
CREATE TRIGGER update_appointments_modtime 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. HABILITAR RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9. CREAR POLÍTICAS RLS PARA APPOINTMENTS

-- Lectura: usuarios que tengan acceso aprobado a la clínica de la cita
CREATE POLICY appointments_select_policy
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = appointments.clinic_id
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- Inserción: solo usuarios con rol doctor o admin_staff en la clínica
CREATE POLICY appointments_insert_policy
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = clinic_id
        AND cur.role_in_clinic IN ('doctor', 'admin_staff')
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- Actualización: el médico asignado o admin_staff de la clínica
CREATE POLICY appointments_update_policy
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR doctor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = appointments.clinic_id
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- Eliminación: solo admin_staff de la clínica o super_admin
CREATE POLICY appointments_delete_policy
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_user_relationships cur
      WHERE cur.user_id = auth.uid()
        AND cur.clinic_id = appointments.clinic_id
        AND cur.role_in_clinic = 'admin_staff'
        AND cur.status = 'approved'
        AND cur.is_active = true
    )
  );

-- 10. CREAR POLÍTICAS RLS PARA NOTIFICATIONS

-- Lectura: solo el usuario propietario de la notificación
CREATE POLICY notifications_select_policy
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Inserción: cualquier usuario autenticado puede crear notificaciones
CREATE POLICY notifications_insert_policy
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualización: solo el propietario puede marcar como leída
CREATE POLICY notifications_update_policy
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Eliminación: solo el propietario
CREATE POLICY notifications_delete_policy
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 11. CONCEDER PERMISOS
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION check_appointment_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION create_appointment_notifications TO authenticated;

-- =====================================================
-- RESUMEN DE LA MIGRACIÓN:
-- =====================================================
-- ✅ Tabla appointments con estado y referencia externa creada
-- ✅ Tabla notifications para sistema de notificaciones
-- ✅ Índices optimizados para consultas frecuentes
-- ✅ Función de verificación de conflictos de citas
-- ✅ Función automática para crear notificaciones
-- ✅ Triggers para actualización automática de timestamps
-- ✅ Políticas RLS completas y seguras
-- ✅ Permisos otorgados correctamente
-- =====================================================
