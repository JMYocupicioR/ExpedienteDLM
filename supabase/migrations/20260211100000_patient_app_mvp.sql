-- Patient app MVP foundation
-- Shared schema for doctor panel and mobile-first patient app

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE medical_practice_settings
ADD COLUMN IF NOT EXISTS allow_patient_self_booking BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  clinic_id UUID REFERENCES clinics(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN ('post_surgery', 'post_consultation', 'scale_threshold', 'time_based', 'adherence_drop', 'custom')
  ),
  trigger_conditions JSONB NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('send_scale', 'assign_exercise', 'send_message', 'create_task', 'send_notification')
  ),
  action_config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_result JSONB,
  status TEXT NOT NULL DEFAULT 'executed' CHECK (status IN ('executed', 'failed', 'skipped'))
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id),
  clinic_id UUID REFERENCES clinics(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  body_area TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  media_type TEXT CHECK (media_type IN ('video', 'image', 'gif')),
  media_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  repetitions INT,
  sets INT,
  instructions JSONB,
  tags TEXT[],
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_exercise_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  exercise_id UUID NOT NULL REFERENCES exercise_library(id),
  sets INT,
  repetitions INT,
  frequency TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES patient_exercise_assignments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sets_completed INT,
  repetitions_completed INT,
  pain_level INT CHECK (pain_level BETWEEN 0 AND 10),
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
  notes TEXT,
  duration_seconds INT
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  clinic_id UUID REFERENCES clinics(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count_patient INT NOT NULL DEFAULT 0,
  unread_count_doctor INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('doctor', 'patient', 'system')),
  sender_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (
    message_type IN ('text', 'image', 'file', 'scale_result', 'exercise_update', 'system_alert')
  ),
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  clinic_id UUID REFERENCES clinics(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('scale', 'exercise', 'medication', 'appointment', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  scale_id UUID REFERENCES medical_scales(id),
  exercise_id UUID REFERENCES exercise_library(id),
  prescription_id UUID REFERENCES prescriptions(id),
  appointment_id UUID REFERENCES appointments(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  due_date TIMESTAMPTZ,
  recurrence_rule JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'expired', 'cancelled')),
  completed_at TIMESTAMPTZ,
  completion_data JSONB,
  trigger_rule_id UUID REFERENCES automation_rules(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_total INT NOT NULL DEFAULT 0,
  tasks_completed INT NOT NULL DEFAULT 0,
  scales_pending INT NOT NULL DEFAULT 0,
  scales_completed INT NOT NULL DEFAULT 0,
  exercises_pending INT NOT NULL DEFAULT 0,
  exercises_completed INT NOT NULL DEFAULT 0,
  adherence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN adherence_score >= 80 THEN 'green'
      WHEN adherence_score >= 50 THEN 'yellow'
      ELSE 'red'
    END
  ) STORED,
  last_activity_at TIMESTAMPTZ,
  alerts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, date)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE (patient_id, code)
);

CREATE TABLE IF NOT EXISTS patient_caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT,
  permissions JSONB NOT NULL DEFAULT '{"can_view_timeline": true, "can_view_progress": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, caregiver_user_id)
);

CREATE TABLE IF NOT EXISTS patient_health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('apple_health', 'google_fit', 'manual')),
  data_type TEXT NOT NULL CHECK (data_type IN ('steps', 'sleep_minutes', 'heart_rate', 'distance_km', 'calories')),
  value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_tasks_patient_date ON patient_tasks(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_patient_tasks_doctor_status ON patient_tasks(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_active ON conversations(patient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_patient_status ON patient_exercise_assignments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_adherence_doctor_date ON patient_adherence(doctor_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_patient_active ON push_subscriptions(patient_id, is_active);

DROP TRIGGER IF EXISTS trg_automation_rules_updated_at ON automation_rules;
CREATE TRIGGER trg_automation_rules_updated_at
BEFORE UPDATE ON automation_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_exercise_library_updated_at ON exercise_library;
CREATE TRIGGER trg_exercise_library_updated_at
BEFORE UPDATE ON exercise_library
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_exercise_assignments_updated_at ON patient_exercise_assignments;
CREATE TRIGGER trg_exercise_assignments_updated_at
BEFORE UPDATE ON patient_exercise_assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_patient_tasks_updated_at ON patient_tasks;
CREATE TRIGGER trg_patient_tasks_updated_at
BEFORE UPDATE ON patient_tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION sync_conversation_after_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 160),
    unread_count_patient = CASE
      WHEN NEW.sender_type = 'doctor' OR NEW.sender_type = 'system' THEN unread_count_patient + 1
      ELSE unread_count_patient
    END,
    unread_count_doctor = CASE
      WHEN NEW.sender_type = 'patient' THEN unread_count_doctor + 1
      ELSE unread_count_doctor
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_conversation_after_message ON messages;
CREATE TRIGGER trg_sync_conversation_after_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION sync_conversation_after_message();

CREATE OR REPLACE FUNCTION link_patient_user(p_patient_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE patients
  SET patient_user_id = p_user_id,
      updated_at = NOW()
  WHERE id = p_patient_id
    AND (patient_user_id IS NULL OR patient_user_id = p_user_id);

  RETURN FOUND;
END;
$$;

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_adherence ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_health_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_tasks_select_own" ON patient_tasks;
CREATE POLICY "patient_tasks_select_own" ON patient_tasks
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_tasks_update_own" ON patient_tasks;
CREATE POLICY "patient_tasks_update_own" ON patient_tasks
FOR UPDATE USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_tasks_doctor_manage" ON patient_tasks;
CREATE POLICY "patient_tasks_doctor_manage" ON patient_tasks
FOR ALL USING (
  doctor_id = auth.uid()
)
WITH CHECK (
  doctor_id = auth.uid()
);

DROP POLICY IF EXISTS "conversation_patient_select" ON conversations;
CREATE POLICY "conversation_patient_select" ON conversations
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "conversation_doctor_manage" ON conversations;
CREATE POLICY "conversation_doctor_manage" ON conversations
FOR ALL USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "messages_participants_select" ON messages;
CREATE POLICY "messages_participants_select" ON messages
FOR SELECT USING (
  doctor_id = auth.uid()
  OR patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_patient_insert" ON messages;
CREATE POLICY "messages_patient_insert" ON messages
FOR INSERT WITH CHECK (
  sender_type = 'patient'
  AND sender_id = auth.uid()
  AND patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_doctor_insert" ON messages;
CREATE POLICY "messages_doctor_insert" ON messages
FOR INSERT WITH CHECK (
  sender_type IN ('doctor', 'system')
  AND doctor_id = auth.uid()
);

DROP POLICY IF EXISTS "exercise_library_read_global_or_owner" ON exercise_library;
CREATE POLICY "exercise_library_read_global_or_owner" ON exercise_library
FOR SELECT USING (
  is_global = TRUE OR doctor_id = auth.uid()
);

DROP POLICY IF EXISTS "exercise_library_doctor_manage" ON exercise_library;
CREATE POLICY "exercise_library_doctor_manage" ON exercise_library
FOR ALL USING (doctor_id = auth.uid() OR doctor_id IS NULL)
WITH CHECK (doctor_id = auth.uid() OR doctor_id IS NULL);

DROP POLICY IF EXISTS "exercise_assign_patient_select" ON patient_exercise_assignments;
CREATE POLICY "exercise_assign_patient_select" ON patient_exercise_assignments
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "exercise_assign_doctor_manage" ON patient_exercise_assignments;
CREATE POLICY "exercise_assign_doctor_manage" ON patient_exercise_assignments
FOR ALL USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "exercise_logs_patient_insert_select" ON patient_exercise_logs;
CREATE POLICY "exercise_logs_patient_insert_select" ON patient_exercise_logs
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "exercise_logs_doctor_select" ON patient_exercise_logs;
CREATE POLICY "exercise_logs_doctor_select" ON patient_exercise_logs
FOR SELECT USING (
  patient_id IN (
    SELECT id FROM patients WHERE primary_doctor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "automation_rules_doctor_manage" ON automation_rules;
CREATE POLICY "automation_rules_doctor_manage" ON automation_rules
FOR ALL USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "automation_exec_doctor_select" ON automation_executions;
CREATE POLICY "automation_exec_doctor_select" ON automation_executions
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
);

DROP POLICY IF EXISTS "adherence_patient_select" ON patient_adherence;
CREATE POLICY "adherence_patient_select" ON patient_adherence
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "adherence_doctor_manage" ON patient_adherence;
CREATE POLICY "adherence_doctor_manage" ON patient_adherence
FOR ALL USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_patient_manage" ON push_subscriptions;
CREATE POLICY "push_subscriptions_patient_manage" ON push_subscriptions
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_achievements_patient_select" ON patient_achievements;
CREATE POLICY "patient_achievements_patient_select" ON patient_achievements
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_achievements_doctor_manage" ON patient_achievements;
CREATE POLICY "patient_achievements_doctor_manage" ON patient_achievements
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_caregivers_patient_select" ON patient_caregivers;
CREATE POLICY "patient_caregivers_patient_select" ON patient_caregivers
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_caregivers_doctor_manage" ON patient_caregivers;
CREATE POLICY "patient_caregivers_doctor_manage" ON patient_caregivers
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_health_data_patient_select_insert" ON patient_health_data;
CREATE POLICY "patient_health_data_patient_select_insert" ON patient_health_data
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "patient_health_data_doctor_select" ON patient_health_data;
CREATE POLICY "patient_health_data_doctor_select" ON patient_health_data
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())
);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('exercise-media', 'exercise-media', false),
  ('message-attachments', 'message-attachments', false),
  ('progress-reports', 'progress-reports', false)
ON CONFLICT (id) DO NOTHING;
