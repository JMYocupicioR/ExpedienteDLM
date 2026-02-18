import { supabase } from '@/lib/supabase';
import type { ScaleDefinition } from '@/lib/types/app';

export const scaleService = {
  async getScaleById(scaleId: string): Promise<ScaleDefinition | null> {
    const { data, error } = await supabase
      .from('medical_scales')
      .select('id, name, description, definition')
      .eq('id', scaleId)
      .maybeSingle();
    if (error || !data) return null;
    return data as ScaleDefinition;
  },

  async saveAssessment(payload: {
    patient_id: string;
    doctor_id: string;
    consultation_id?: string | null;
    scale_id: string;
    answers: Record<string, unknown>;
    score: number;
    severity: string | null;
    interpretation?: Record<string, unknown> | null;
  }) {
    const { error } = await supabase.from('scale_assessments').insert({
      ...payload,
      interpretation: payload.interpretation ?? null,
    });
    if (error) throw error;
  },
};
