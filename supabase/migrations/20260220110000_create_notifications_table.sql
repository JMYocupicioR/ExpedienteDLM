-- =====================================================
-- Create notifications table for clinic alerts system
-- Permite al sistema centralizar alertas, pendientes y notificaciones
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  title TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  action_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  suggested_action JSONB
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications (related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications (priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_suggested_action ON public.notifications USING gin (suggested_action);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS 'Alertas y notificaciones para el equipo de la clínica';
