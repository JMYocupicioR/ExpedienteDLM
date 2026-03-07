import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/lib/database.types';
import { fetchActiveMedicalScalesSafe } from '@/lib/services/medical-scales-service';

type ScaleAssessmentRow = Database['public']['Tables']['scale_assessments']['Row'];
type RawScaleAssessmentRow = ScaleAssessmentRow;
type ProfileRow = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'>;
type MedicalScaleRow = Pick<Database['public']['Tables']['medical_scales']['Row'], 'id' | 'name' | 'definition'>;

type ScaleOptionDef = {
  label: string;
  value: number | string;
};

type ScaleItemDef = {
  id: string;
  text: string;
  type?: 'select' | 'number' | 'text';
  options?: ScaleOptionDef[];
};

type ScaleDefinition = {
  items?: ScaleItemDef[];
};

export interface ScaleAnswerDetail {
  questionId: string;
  questionText: string;
  rawValue: unknown;
  valueLabel: string;
}

export interface ScaleAssessmentInterpretation {
  severity?: string;
  score?: number;
  clinical_significance?: string;
  recommendations?: string[];
  evaluated_at?: string;
  scale_version?: string;
  [key: string]: unknown;
}

export interface ScaleAssessmentViewModel {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string | null;
  consultationId: string | null;
  scaleId: string;
  scaleName: string;
  answers: unknown | null;
  score: number | null;
  severity: string | null;
  interpretation: ScaleAssessmentInterpretation | null;
  createdAt: string;
  updatedAt: string;
  evaluatedAt: string | null;
  scaleVersion: string | null;
  answerDetails: ScaleAnswerDetail[];
  clinicalSummary: string | null;
  recommendationList: string[];
}

const UNKNOWN_DOCTOR_LABEL = 'Médico no disponible';

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseJsonString = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeInterpretation = (raw: unknown): ScaleAssessmentInterpretation | null => {
  if (raw === null || raw === undefined) return null;
  const parsed = typeof raw === 'string' ? parseJsonString(raw) : raw;
  // If it parsed to a plain object, use it directly
  if (isPlainRecord(parsed)) return parsed as ScaleAssessmentInterpretation;
  // If it's still a plain text string (non-JSON), treat it as clinical_significance
  if (typeof parsed === 'string' && parsed.trim().length > 0) {
    return { clinical_significance: parsed };
  }
  return null;
};

const normalizeAnswers = (raw: unknown): unknown | null => {
  if (raw === null || raw === undefined) return null;
  const parsed = typeof raw === 'string' ? parseJsonString(raw) : raw;

  // Flatten nested structures like { sss: { sss_1: 3, ... }, fss: { fss_1: 2, ... } }
  // into a single flat Record so buildAnswerDetails can iterate all questions.
  if (isPlainRecord(parsed)) {
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record);
    const allValuesAreRecords = keys.length > 0 && keys.every((k) => isPlainRecord(record[k]));
    if (allValuesAreRecords) {
      const flat: Record<string, unknown> = {};
      for (const subObj of Object.values(record)) {
        Object.assign(flat, subObj);
      }
      return flat;
    }
  }

  return parsed;
};

const isUuidLike = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const valueToString = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  if (value === null || value === undefined || value === '') return 'Sin respuesta';
  return String(value);
};

const normalizeScaleDefinition = (raw: unknown): ScaleDefinition | null => {
  if (raw) {
    const parsed = typeof raw === 'string' ? parseJsonString(raw) : raw;
    if (isPlainRecord(parsed) && (parsed as ScaleDefinition).items?.length) {
      return parsed as ScaleDefinition;
    }
  }
  return null;
};

// ── Hardcoded fallback definitions for scales whose DB `definition` column is empty ──
const FALLBACK_DEFINITIONS: Record<string, ScaleDefinition> = {
  boston_carpal_tunnel: {
    items: [
      { id: 'sss_1', text: 'Dolor nocturno en mano/muñeca', type: 'select', options: [{ label: 'Sin dolor', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
      { id: 'sss_2', text: 'Frecuencia del dolor nocturno', type: 'select', options: [{ label: 'Nunca', value: 1 }, { label: 'Una vez', value: 2 }, { label: '2-3 veces', value: 3 }, { label: '4-5 veces', value: 4 }, { label: '>5 veces', value: 5 }] },
      { id: 'sss_3', text: 'Dolor diurno en mano/muñeca', type: 'select', options: [{ label: 'Sin dolor', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
      { id: 'sss_4', text: 'Frecuencia del dolor diurno', type: 'select', options: [{ label: 'Nunca', value: 1 }, { label: '1-2/día', value: 2 }, { label: '3-5/día', value: 3 }, { label: '>5/día', value: 4 }, { label: 'Continuo', value: 5 }] },
      { id: 'sss_5', text: 'Duración promedio del dolor diurno', type: 'select', options: [{ label: 'No hay dolor', value: 1 }, { label: '<10 min', value: 2 }, { label: '10-60 min', value: 3 }, { label: '>60 min', value: 4 }, { label: 'Continuo', value: 5 }] },
      { id: 'sss_6', text: 'Adormecimiento', type: 'select', options: [{ label: 'No', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
      { id: 'sss_7', text: 'Debilidad', type: 'select', options: [{ label: 'No', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Severa', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'sss_8', text: 'Hormigueo', type: 'select', options: [{ label: 'No', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
      { id: 'sss_9', text: 'Severidad de adormecimiento/hormigueo nocturno', type: 'select', options: [{ label: 'No', value: 1 }, { label: 'Leve', value: 2 }, { label: 'Moderado', value: 3 }, { label: 'Severo', value: 4 }, { label: 'Muy severo', value: 5 }] },
      { id: 'sss_10', text: 'Frecuencia de despertar por debilidad/hormigueo', type: 'select', options: [{ label: 'Nunca', value: 1 }, { label: 'Una vez', value: 2 }, { label: '2-3 veces', value: 3 }, { label: '4-5 veces', value: 4 }, { label: '>5 veces', value: 5 }] },
      { id: 'sss_11', text: 'Dificultad para agarrar objetos pequeños', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_1', text: 'Escritura', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_2', text: 'Abotonarse la ropa', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_3', text: 'Sostener un libro', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_4', text: 'Sujetar auricular del teléfono', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_5', text: 'Abrir frascos', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_6', text: 'Tareas domésticas', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_7', text: 'Llevar cesta de la compra', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
      { id: 'fss_8', text: 'Bañarse y vestirse', type: 'select', options: [{ label: 'Sin dificultad', value: 1 }, { label: 'Poca', value: 2 }, { label: 'Moderada', value: 3 }, { label: 'Mucha', value: 4 }, { label: 'Muy severa', value: 5 }] },
    ],
  },
  katz: {
    items: [
      { id: 'bathing', text: 'Baño', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
      { id: 'dressing', text: 'Vestido', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
      { id: 'toileting', text: 'Uso del retrete', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
      { id: 'transferring', text: 'Movilización', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
      { id: 'continence', text: 'Continencia', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
      { id: 'feeding', text: 'Alimentación', type: 'select', options: [{ label: 'Independiente', value: 1 }, { label: 'Dependiente', value: 0 }] },
    ],
  },
  barthel: {
    items: [
      { id: 'feeding', text: 'Alimentación', type: 'select', options: [{ label: 'Independiente', value: 10 }, { label: 'Necesita ayuda', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'bathing', text: 'Baño', type: 'select', options: [{ label: 'Independiente', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'grooming', text: 'Aseo personal', type: 'select', options: [{ label: 'Independiente', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'dressing', text: 'Vestido', type: 'select', options: [{ label: 'Independiente', value: 10 }, { label: 'Necesita ayuda', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'bowels', text: 'Control intestinal', type: 'select', options: [{ label: 'Continente', value: 10 }, { label: 'Accidentes ocasionales', value: 5 }, { label: 'Incontinente', value: 0 }] },
      { id: 'bladder', text: 'Control urinario', type: 'select', options: [{ label: 'Continente', value: 10 }, { label: 'Accidentes ocasionales', value: 5 }, { label: 'Incontinente', value: 0 }] },
      { id: 'toilet', text: 'Uso de retrete', type: 'select', options: [{ label: 'Independiente', value: 10 }, { label: 'Necesita ayuda', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'transfer', text: 'Traslado cama-sillón', type: 'select', options: [{ label: 'Independiente', value: 15 }, { label: 'Pequeña ayuda', value: 10 }, { label: 'Gran ayuda', value: 5 }, { label: 'Dependiente', value: 0 }] },
      { id: 'mobility', text: 'Deambulación en llano', type: 'select', options: [{ label: 'Independiente', value: 15 }, { label: 'Con ayuda', value: 10 }, { label: 'Silla de ruedas', value: 5 }, { label: 'Inmóvil', value: 0 }] },
      { id: 'stairs', text: 'Subir/bajar escaleras', type: 'select', options: [{ label: 'Independiente', value: 10 }, { label: 'Necesita ayuda', value: 5 }, { label: 'Incapaz', value: 0 }] },
    ],
  },
};

const getFallbackDefinition = (scaleId: string, scaleName: string): ScaleDefinition | null => {
  // Match by ID first
  if (FALLBACK_DEFINITIONS[scaleId]) return FALLBACK_DEFINITIONS[scaleId];

  // Match by name keywords
  const lower = (scaleName || '').toLowerCase();
  if (lower.includes('boston') || lower.includes('túnel carpiano') || lower.includes('carpal tunnel')) {
    return FALLBACK_DEFINITIONS.boston_carpal_tunnel;
  }
  if (lower.includes('katz')) return FALLBACK_DEFINITIONS.katz;
  if (lower.includes('barthel')) return FALLBACK_DEFINITIONS.barthel;

  return null;
};

const buildAnswerDetails = (answers: unknown, definition: ScaleDefinition | null): ScaleAnswerDetail[] => {
  if (!answers) return [];

  const items = definition?.items || [];

  const buildValueLabel = (item: ScaleItemDef | undefined, rawValue: unknown): string => {
    if (!item?.options || item.options.length === 0) return valueToString(rawValue);
    const match = item.options.find((opt) => String(opt.value) === String(rawValue));
    return match ? `${match.label} (${String(rawValue)})` : valueToString(rawValue);
  };

  // PRIMARY PATH: if we have a definition with items, iterate ITEMS IN ORDER
  // This is the correct approach — the definition is already ordered by order_index
  if (items.length > 0 && isPlainRecord(answers)) {
    const answersRecord = answers as Record<string, unknown>;
    return items.map((item, index) => {
      const rawValue = answersRecord[item.id];
      return {
        questionId: item.id,
        questionText: item.text || `Pregunta ${index + 1}`,
        rawValue: rawValue ?? null,
        valueLabel: rawValue !== undefined && rawValue !== null
          ? buildValueLabel(item, rawValue)
          : 'Sin respuesta',
      };
    });
  }

  // ARRAY FALLBACK: answers stored as positional array
  if (Array.isArray(answers)) {
    return answers.map((value, index) => {
      const itemByIndex = items[index];
      return {
        questionId: itemByIndex?.id || `item_${index + 1}`,
        questionText: itemByIndex?.text || `Pregunta ${index + 1}`,
        rawValue: value,
        valueLabel: buildValueLabel(itemByIndex, value),
      };
    });
  }

  // LAST RESORT: no definition, iterate raw object keys
  if (isPlainRecord(answers)) {
    const entries = Object.entries(answers);
    return entries.map(([questionId, rawValue], index) => ({
      questionId,
      questionText: isUuidLike(questionId) ? `Pregunta ${index + 1}` : questionId,
      rawValue,
      valueLabel: valueToString(rawValue),
    }));
  }

  return [{ questionId: 'response', questionText: 'Respuesta', rawValue: answers, valueLabel: valueToString(answers) }];
};

const buildClinicalSummary = (
  interpretation: ScaleAssessmentInterpretation | null,
  score: number | null,
  severity: string | null
): string | null => {
  if (interpretation?.clinical_significance && interpretation.clinical_significance.trim() !== '') {
    return interpretation.clinical_significance;
  }
  if (score !== null && severity) return `Puntuación de ${score} con severidad ${severity}.`;
  if (score !== null) return `Puntuación total: ${score}.`;
  return null;
};

export const formatAssessmentDate = (dateIso: string): string => {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return format(parsed, 'dd/MM/yyyy - HH:mm');
};

const normalizeScaleAssessment = (
  row: RawScaleAssessmentRow,
  doctorNames: Map<string, string | null>,
  scaleMeta: Map<string, { name: string; definition: ScaleDefinition | null }>
): ScaleAssessmentViewModel => {
  const legacyRow = row as unknown as Record<string, unknown>;
  const interpretation = normalizeInterpretation(row.interpretation ?? legacyRow.interpretation ?? null);
  // Support both old 'doctor_id' column and new 'user_id' column
  const userId = (legacyRow.user_id as string) || row.doctor_id || '';
  const doctorName = doctorNames.get(userId) ?? null;
  const scaleInfo = scaleMeta.get(row.scale_id);
  const derivedScaleName =
    typeof interpretation?.scale_name === 'string'
      ? interpretation.scale_name
      : typeof interpretation?.scale === 'string'
      ? interpretation.scale
      : null;
  const scaleName = scaleInfo?.name || derivedScaleName || row.scale_id;
  // Support both 'score' and 'total_score' column names
  const columnTotalScore = typeof legacyRow.total_score === 'number' ? legacyRow.total_score : null;
  const derivedScore =
    columnTotalScore !== null
      ? columnTotalScore
      : typeof row.score === 'number'
      ? row.score
      : typeof interpretation?.score === 'number'
      ? interpretation.score
      : null;
  const derivedSeverity =
    row.severity ||
    (typeof interpretation?.severity === 'string' ? interpretation.severity : null);
  // Support both 'responses' (new) and 'answers' (old) column names
  const rawAnswers = legacyRow.responses ?? legacyRow.answers ?? null;
  const normalizedAnswers = normalizeAnswers(rawAnswers);

  const answerDetails = buildAnswerDetails(normalizedAnswers, scaleInfo?.definition || null);
  const recommendationList =
    interpretation?.recommendations && Array.isArray(interpretation.recommendations)
      ? interpretation.recommendations.map((item) => String(item))
      : [];

  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: userId,
    doctorName,
    consultationId: row.consultation_id,
    scaleId: row.scale_id,
    scaleName,
    answers: normalizedAnswers,
    score: derivedScore,
    severity: derivedSeverity,
    interpretation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evaluatedAt: interpretation?.evaluated_at || null,
    scaleVersion: interpretation?.scale_version || null,
    answerDetails,
    clinicalSummary: buildClinicalSummary(interpretation, derivedScore, derivedSeverity),
    recommendationList,
  };
};

const fetchScaleMeta = async (
  scaleIds: string[]
): Promise<Map<string, { name: string; definition: ScaleDefinition | null }>> => {
  const map = new Map<string, { name: string; definition: ScaleDefinition | null }>();
  if (scaleIds.length === 0) return map;

  const scales = (await fetchActiveMedicalScalesSafe()) as MedicalScaleRow[];

  // First pass: use JSONB definition or hardcoded fallback as baseline
  scales.forEach((scale) => {
    const dbDef = normalizeScaleDefinition(scale.definition);
    const fallbackDef = getFallbackDefinition(scale.id, scale.name);
    map.set(scale.id, {
      name: scale.name || scale.id,
      definition: dbDef || fallbackDef,
    });
  });

  scaleIds.forEach((id) => {
    if (!map.has(id)) map.set(id, { name: id, definition: null });
  });

  // Second pass: query relational tables for ALL scale IDs.
  // Relational definitions use UUID-based item IDs that match stored answers,
  // so they MUST take priority over hardcoded fallbacks (which use aliases
  // like 'feeding', 'bathing' that don't match the UUID keys in answers).
  if (scaleIds.length > 0) {
    const { data: questions } = await supabase
      .from('scale_questions')
      .select('id, scale_id, question_text, question_type, order_index, description, image_url')
      .in('scale_id', scaleIds)
      .order('order_index', { ascending: true });

    if (questions && questions.length > 0) {
      const questionIds = questions.map((q: { id: string }) => q.id);

      const { data: options } = await supabase
        .from('question_options')
        .select('question_id, option_label, option_value, order_index')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });

      const optsByQuestion = new Map<string, Array<{ label: string; value: number | string }>>();
      (options || []).forEach((opt: { question_id: string; option_label: string; option_value: number | string }) => {
        const arr = optsByQuestion.get(opt.question_id) || [];
        arr.push({ label: opt.option_label || String(opt.option_value), value: opt.option_value });
        optsByQuestion.set(opt.question_id, arr);
      });

      const qByScale = new Map<string, ScaleItemDef[]>();
      questions.forEach((q: {
        id: string;
        scale_id: string;
        question_text: string;
        question_type: string;
        order_index: number;
      }) => {
        const arr = qByScale.get(q.scale_id) || [];
        arr.push({
          id: q.id,
          text: q.question_text || `Pregunta ${q.order_index}`,
          type: (q.question_type as ScaleItemDef['type']) || 'select',
          options: optsByQuestion.get(q.id) || [],
        });
        qByScale.set(q.scale_id, arr);
      });

      // Override with relational definition — these use UUIDs that match stored answers
      qByScale.forEach((items, scaleId) => {
        const existing = map.get(scaleId);
        if (existing) {
          map.set(scaleId, { ...existing, definition: { items } });
        }
      });
    }
  }

  return map;
};

const fetchDoctorNames = async (userIds: string[]): Promise<Map<string, string | null>> => {
  const map = new Map<string, string | null>();
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);

  if (error) {
    ids.forEach((id) => map.set(id, UNKNOWN_DOCTOR_LABEL));
    return map;
  }

  const profiles = (data || []) as ProfileRow[];
  profiles.forEach((profile) => {
    map.set(profile.id, profile.full_name || UNKNOWN_DOCTOR_LABEL);
  });

  ids.forEach((id) => {
    if (!map.has(id)) map.set(id, UNKNOWN_DOCTOR_LABEL);
  });

  return map;
};

// Helper to extract user_id (new) or doctor_id (old) from a row
const extractUserId = (row: Record<string, unknown>): string => {
  return (row.user_id as string) || (row.doctor_id as string) || '';
};

const normalizeScaleAssessments = async (rows: RawScaleAssessmentRow[]): Promise<ScaleAssessmentViewModel[]> => {
  const doctorIds = Array.from(new Set(rows.map((row) => extractUserId(row as unknown as Record<string, unknown>)).filter(Boolean)));
  const scaleIds = Array.from(new Set(rows.map((row) => row.scale_id).filter(Boolean)));
  const doctorNames = await fetchDoctorNames(doctorIds);
  const scaleMeta = await fetchScaleMeta(scaleIds);
  return rows.map((row) => normalizeScaleAssessment(row, doctorNames, scaleMeta));
};

export const fetchScaleAssessmentsByPatient = async (patientId: string): Promise<ScaleAssessmentViewModel[]> => {
  const { data, error } = await supabase
    .from('scale_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return normalizeScaleAssessments((data || []) as RawScaleAssessmentRow[]);
};

export const fetchScaleAssessmentsByConsultation = async (
  consultationId: string
): Promise<ScaleAssessmentViewModel[]> => {
  const { data, error } = await supabase
    .from('scale_assessments')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return normalizeScaleAssessments((data || []) as RawScaleAssessmentRow[]);
};

export const fetchScaleAssessmentById = async (
  assessmentId: string
): Promise<ScaleAssessmentViewModel | null> => {
  const { data, error } = await supabase
    .from('scale_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const normalized = await normalizeScaleAssessments([data as RawScaleAssessmentRow]);
  return normalized[0] || null;
};
