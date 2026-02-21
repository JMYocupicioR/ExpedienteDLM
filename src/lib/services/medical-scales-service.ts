import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type MedicalScaleRow = Database['public']['Tables']['medical_scales']['Row'];

export interface ScaleDefinition {
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
}

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

/**
 * Obtiene la definición de una escala. Usa scale_questions + question_options si existen;
 * en caso contrario hace fallback a medical_scales.definition.
 */
export const getScaleDefinitionById = async (scaleId: string): Promise<ScaleDefinition | null> => {
  const { data: scaleRow, error: scaleError } = await supabase
    .from('medical_scales')
    .select('id, name, definition')
    .eq('id', scaleId)
    .maybeSingle();

  if (scaleError || !scaleRow) return null;

  const { data: questions, error: qError } = await supabase
    .from('scale_questions')
    .select('id, question_text, question_type, order_index')
    .eq('scale_id', scaleId)
    .order('order_index', { ascending: true });

  if (qError || !questions || questions.length === 0) {
    const def = (scaleRow as { definition?: ScaleDefinition }).definition;
    return def && typeof def === 'object' ? (def as ScaleDefinition) : null;
  }

  const questionIds = questions.map((q) => q.id);
  const { data: options, error: oError } = await supabase
    .from('question_options')
    .select('question_id, option_label, option_value, order_index')
    .in('question_id', questionIds)
    .order('order_index', { ascending: true });

  const optionsByQuestion = new Map<string, Array<{ label: string; value: number | string }>>();
  (options || []).forEach((opt: { question_id: string; option_label: string; option_value: number | string; order_index: number }) => {
    const arr = optionsByQuestion.get(opt.question_id) || [];
    arr.push({
      label: opt.option_label || String(opt.option_value),
      value: typeof opt.option_value === 'number' ? opt.option_value : opt.option_value,
    });
    optionsByQuestion.set(opt.question_id, arr);
  });

  const items = questions.map((q: { id: string; question_text: string; question_type: string }) => ({
    id: q.id,
    text: q.question_text || '',
    type: 'select' as const,
    options: optionsByQuestion.get(q.id) || [],
  }));

  let scoring: ScaleDefinition['scoring'] | undefined;
  try {
    const { data: scoringRow } = await supabase
      .from('scale_scoring')
      .select('method, average')
      .eq('scale_id', scaleId)
      .maybeSingle();

    const { data: rangesRows } = await supabase
      .from('scoring_ranges')
      .select('*')
      .eq('scale_id', scaleId);

    if (scoringRow || (rangesRows && rangesRows.length > 0)) {
      const def = (scaleRow as { definition?: ScaleDefinition }).definition;
      const mappedRanges = (rangesRows || []).map((r: Record<string, unknown>) => ({
        min: Number((r.min_value ?? r.min ?? 0)),
        max: Number((r.max_value ?? r.max ?? 0)),
        severity: String(r.interpretation_label ?? r.severity ?? r.label ?? ''),
      }));
      scoring = {
        average: (scoringRow as { average?: boolean })?.average ?? def?.scoring?.average ?? false,
        ranges: mappedRanges.length > 0 ? mappedRanges : def?.scoring?.ranges,
      };
    } else {
      const def = (scaleRow as { definition?: ScaleDefinition }).definition;
      if (def && typeof def === 'object' && def.scoring) scoring = def.scoring;
    }
  } catch {
    const def = (scaleRow as { definition?: ScaleDefinition }).definition;
    if (def && typeof def === 'object' && def.scoring) scoring = def.scoring;
  }

  return { items, scoring };
};
