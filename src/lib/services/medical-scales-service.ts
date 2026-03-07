import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type MedicalScaleRow = Database['public']['Tables']['medical_scales']['Row'];

import { ScaleDefinition } from '@/features/medical-records/types/medical-scale.types';

const BOSTON_FALLBACK_DEFINITION: ScaleDefinition = {
  items: [
    { id: 'sss_1', text: 'Dolor nocturno en mano o muneca', type: 'select', options: [{ label: 'Sin dolor', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
    { id: 'sss_2', text: 'Frecuencia del dolor nocturno', type: 'select', options: [{ label: 'Nunca', value: 1 }, { label: 'Una vez', value: 2 }, { label: '2-3 veces', value: 3 }, { label: '4-5 veces', value: 4 }, { label: 'Mas de 5 veces', value: 5 }] },
    { id: 'sss_3', text: 'Dolor durante el dia', type: 'select', options: [{ label: 'Sin dolor', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
    { id: 'sss_4', text: 'Adormecimiento u hormigueo', type: 'select', options: [{ label: 'No', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
    { id: 'fss_1', text: 'Escribir con la mano afectada', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca dificultad', value: 2 }, { label: 'Dificultad moderada', value: 3 }, { label: 'Mucha dificultad', value: 4 }, { label: 'No puede hacerlo', value: 5 }] },
    { id: 'fss_2', text: 'Abrir frascos', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca dificultad', value: 2 }, { label: 'Dificultad moderada', value: 3 }, { label: 'Mucha dificultad', value: 4 }, { label: 'No puede hacerlo', value: 5 }] },
  ],
};

let medicalScalesUnavailable = false;

export const getScaleImageUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const { data } = supabase.storage.from('scales-assets').getPublicUrl(path);
  return data.publicUrl;
};

export const fetchMedicalScalesSafe = async (): Promise<MedicalScaleRow[]> => {
  if (medicalScalesUnavailable) return [];

  const baseColumns = 'id, name, specialty, category, description, is_active, created_at, updated_at';
  const withDefinition = `${baseColumns}, definition`;

  let { data, error } = await supabase.from('medical_scales').select(withDefinition);
  if (error && (error as any).code === '42703') {
    const retry = await supabase.from('medical_scales').select(baseColumns);
    data = retry.data as any;
    error = retry.error as any;
  }

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
  let scaleRow: { id: string; name: string; definition?: ScaleDefinition | null } | null = null;
  let scaleError: { code?: string; message?: string; details?: string | null; hint?: string | null } | null = null;

  const primaryScaleQuery = await supabase
    .from('medical_scales')
    .select('id, name, definition')
    .eq('id', scaleId)
    .maybeSingle();

  scaleRow = (primaryScaleQuery.data as { id: string; name: string; definition?: ScaleDefinition | null } | null) ?? null;
  scaleError = (primaryScaleQuery.error as any) ?? null;

  if (scaleError?.code === '42703') {
    const fallbackScaleQuery = await supabase
      .from('medical_scales')
      .select('id, name')
      .eq('id', scaleId)
      .maybeSingle();
    scaleRow = (fallbackScaleQuery.data as { id: string; name: string; definition?: ScaleDefinition | null } | null) ?? null;
    scaleError = (fallbackScaleQuery.error as any) ?? null;
  }

  if (scaleError || !scaleRow) {
    return null;
  }

  // PRORITIZE JSON DEFINITION:
  // If the scale has a populated 'definition' JSON object, use it directly.
  // This preserves any advanced properties (like image_url, logic.show_if) not present in the relational schema
  // and avoids making failed requests to experimental tables like scale_scoring.
  const def = (scaleRow as { definition?: ScaleDefinition }).definition;
  if (def && typeof def === 'object' && Array.isArray((def as any).items) && (def as any).items.length > 0) {
    return def as ScaleDefinition;
  }

  const { data: questions, error: qError } = await supabase
    .from('scale_questions')
    .select('id, question_text, question_type, order_index, image_url, description, conditional_logic, validation_rules')
    .eq('scale_id', scaleId)
    .order('order_index', { ascending: true });

  if (qError || !questions || questions.length === 0) {
    if (def && typeof def === 'object') return def as ScaleDefinition;

    // Fallback when DB has the scale row but no persisted JSON definition/questions.
    // This prevents empty questionnaires for known scales like Boston CTS.
    const lowerName = String((scaleRow as { name?: string }).name || '').toLowerCase();
    if (lowerName.includes('boston') || lowerName.includes('tunel carpiano') || lowerName.includes('carpal tunnel')) {
      return BOSTON_FALLBACK_DEFINITION;
    }
    return null;
  }

  const questionIds = questions.map((q) => q.id);
  const { data: options } = await supabase
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

  const items = questions.map((q: {
    id: string;
    question_text: string;
    question_type: string;
    order_index: number;
    image_url?: string | null;
    description?: string | null;
    conditional_logic?: Record<string, unknown> | null;
    validation_rules?: Record<string, unknown> | null;
  }) => ({
    id: q.id,
    text: q.question_text || '',
    type: (q.question_type as 'single_choice' | 'multi_choice' | 'select' | 'slider' | 'text' | 'number' | 'info') || 'select',
    description: q.description || undefined,
    image_url: getScaleImageUrl(q.image_url ?? undefined),
    order_index: q.order_index,
    logic: q.conditional_logic as Record<string, unknown> | undefined,
    validation: q.validation_rules as Record<string, unknown> | undefined,
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
