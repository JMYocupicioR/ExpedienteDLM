export type TaskType = 'scale' | 'exercise' | 'medication' | 'appointment' | 'custom';
export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'expired' | 'cancelled';

export interface PatientProfile {
  patient_id: string;
  patient_user_id: string;
  full_name: string;
  primary_doctor_id: string | null;
  clinic_id: string | null;
}

export interface PatientTask {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string | null;
  task_type: TaskType;
  title: string;
  description: string | null;
  scale_id: string | null;
  exercise_id: string | null;
  prescription_id: string | null;
  appointment_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  due_date: string | null;
  status: TaskStatus;
  completed_at: string | null;
  completion_data: Record<string, unknown> | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ScaleDefinition {
  id: string;
  name: string;
  description: string | null;
  definition: {
    items?: Array<{
      id: string;
      text: string;
      type: 'select';
      options: Array<{ label: string; value: number | string }>;
    }>;
    scoring?: {
      average?: boolean;
      ranges?: Array<{ min: number; max: number; severity: string }>;
    };
  };
}

export interface Conversation {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string | null;
  clinic_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count_patient: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'doctor' | 'patient' | 'system';
  sender_id: string;
  patient_id: string;
  doctor_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'scale_result' | 'exercise_update' | 'system_alert';
  is_read: boolean;
  created_at: string;
}
