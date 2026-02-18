import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type MedicalScaleRow = Database['public']['Tables']['medical_scales']['Row'];

let medicalScalesUnavailable = false;

export const fetchMedicalScalesSafe = async (): Promise<MedicalScaleRow[]> => {
  if (medicalScalesUnavailable) return [];

  const { data, error } = await supabase.from('medical_scales').select('*');
  if (error) {
    medicalScalesUnavailable = true;
    return [];
  }

  return (data || []) as MedicalScaleRow[];
};

export const fetchActiveMedicalScalesSafe = async (): Promise<MedicalScaleRow[]> => {
  const rows = await fetchMedicalScalesSafe();
  return rows.filter((row) => row.is_active !== false);
};

export const resetMedicalScalesCache = (): void => {
  medicalScalesUnavailable = false;
};
