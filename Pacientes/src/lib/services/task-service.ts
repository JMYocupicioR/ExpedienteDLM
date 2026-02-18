import { supabase } from '@/lib/supabase';
import type { PatientTask, TaskStatus } from '@/lib/types/app';

export const taskService = {
  async getTasksByDate(patientId: string, date: string): Promise<PatientTask[]> {
    const { data, error } = await supabase
      .from('patient_tasks')
      .select('*')
      .eq('patient_id', patientId)
      .eq('scheduled_date', date)
      .order('scheduled_time', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data || []) as PatientTask[];
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, completionData?: Record<string, unknown>) {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      payload.completed_at = new Date().toISOString();
    }

    if (completionData) {
      payload.completion_data = completionData;
    }

    const { error } = await supabase.from('patient_tasks').update(payload).eq('id', taskId);
    if (error) throw error;
  },

  async getCompletionStreak(patientId: string, lookbackDays = 60): Promise<number> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - lookbackDays + 1);

    const formatDate = (value: Date) => {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const { data, error } = await supabase
      .from('patient_tasks')
      .select('scheduled_date')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .gte('scheduled_date', formatDate(startDate));

    if (error) throw error;

    const completedDays = new Set((data || []).map((task) => task.scheduled_date));
    let streak = 0;

    for (let offset = 0; offset < lookbackDays; offset += 1) {
      const cursor = new Date(today);
      cursor.setDate(today.getDate() - offset);
      const dayKey = formatDate(cursor);

      if (!completedDays.has(dayKey)) {
        break;
      }

      streak += 1;
    }

    return streak;
  },

  subscribeToTasks(patientId: string, onChange: () => void) {
    const channel = supabase
      .channel(`patient_tasks:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_tasks',
          filter: `patient_id=eq.${patientId}`,
        },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
