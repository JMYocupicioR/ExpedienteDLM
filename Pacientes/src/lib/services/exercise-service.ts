import { supabase } from '@/lib/supabase';

export type ExerciseAssignment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  exercise_id: string;
  sets: number | null;
  repetitions: number | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: string;
  exercise_library: {
    id: string;
    name: string;
    description: string | null;
    media_type: string | null;
    media_url: string | null;
  } | null;
};

export const exerciseService = {
  async getAssignments(patientId: string): Promise<ExerciseAssignment[]> {
    const { data, error } = await supabase
      .from('patient_exercise_assignments')
      .select(
        '*, exercise_library(id, name, description, media_type, media_url)'
      )
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ExerciseAssignment[];
  },

  async logCompletion(payload: {
    assignment_id: string;
    patient_id: string;
    sets_completed?: number | null;
    repetitions_completed?: number | null;
    pain_level?: number | null;
    difficulty_rating?: number | null;
    notes?: string | null;
  }) {
    const { error } = await supabase.from('patient_exercise_logs').insert(payload);
    if (error) throw error;
  },
};
