import { supabase } from '@/lib/supabase';

export const progressService = {
  async getScaleTrend(patientId: string) {
    const { data, error } = await supabase
      .from('scale_assessments')
      .select('created_at, score, severity, scale_id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
      .limit(90);
    if (error) throw error;
    return data || [];
  },

  async getAdherenceTrend(patientId: string) {
    const { data, error } = await supabase
      .from('patient_adherence')
      .select('date, adherence_score, status')
      .eq('patient_id', patientId)
      .order('date', { ascending: true })
      .limit(30);
    if (error) throw error;
    return data || [];
  },
};
