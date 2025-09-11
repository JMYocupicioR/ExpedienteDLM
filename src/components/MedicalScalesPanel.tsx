import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePhysicalExam } from '@/features/medical-records/hooks/usePhysicalExam';
import { Plus, Save, ListChecks } from 'lucide-react';

type ScaleDefinition = {
  version?: string;
  items?: Array<{
    id: string;
    text: string;
    type: 'select' | 'number' | 'text';
    options?: Array<{ label: string; value: number | string }>;
  }>;
  scoring?: {
    sum?: 'value';
    average?: boolean;
    ranges?: Array<{ min: number; max: number; severity: string }>;
  };
};

interface MedicalScalesPanelProps {
  patientId: string;
  doctorId: string;
  consultationId: string;
}

export default function MedicalScalesPanel({ patientId, doctorId, consultationId }: MedicalScalesPanelProps) {
  const { listActiveScales, saveScaleAssessment, getScaleAssessmentsByConsultation } = usePhysicalExam({ patientId, doctorId });
  const [scales, setScales] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedScaleId, setSelectedScaleId] = useState<string>('');
  const [selectedScaleDef, setSelectedScaleDef] = useState<ScaleDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [existingAssessments, setExistingAssessments] = useState<any[]>([]);

  const loadScales = useCallback(async () => {
    const data = await listActiveScales();
    setScales(data);
  }, [listActiveScales]);

  const loadExisting = useCallback(async () => {
    const list = await getScaleAssessmentsByConsultation(consultationId);
    setExistingAssessments(list);
  }, [getScaleAssessmentsByConsultation, consultationId]);

  useEffect(() => {
    loadScales();
    loadExisting();
  }, [loadScales, loadExisting]);

  const handleSelectScale = async (scaleId: string) => {
    setSelectedScaleId(scaleId);
    setSelectedScaleDef(null);
    setAnswers({});
    if (!scaleId) return;
    const { data, error } = await supabase
      .from('medical_scales')
      .select('definition')
      .eq('id', scaleId)
      .single();
    if (error) {
      // Error log removed for security;
      return;
    }
    setSelectedScaleDef((data?.definition as unknown) as ScaleDefinition);
  };

  const computedScore = useMemo(() => {
    if (!selectedScaleDef?.items) return null;
    const items = selectedScaleDef.items;
    const values: number[] = [];
    for (const item of items) {
      const val = answers[item.id];
      if (typeof val === 'number') values.push(val);
      if (typeof val === 'string' && !isNaN(Number(val))) values.push(Number(val));
    }
    if (values.length === 0) return 0;
    if (selectedScaleDef.scoring?.average) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return values.reduce((a, b) => a + b, 0);
  }, [answers, selectedScaleDef]);

  const computedSeverity = useMemo(() => {
    if (!selectedScaleDef?.scoring?.ranges || typeof computedScore !== 'number') return null;
    const r = selectedScaleDef.scoring.ranges.find(x => computedScore >= x.min && computedScore <= x.max);
    return r?.severity || null;
  }, [computedScore, selectedScaleDef]);

  const handleSave = async () => {
    if (!selectedScaleId || !selectedScaleDef) return;
    try {
      setSaving(true);
      await saveScaleAssessment({
        consultationId,
        scaleId: selectedScaleId,
        answers,
        score: typeof computedScore === 'number' ? computedScore : undefined,
        severity: computedSeverity ?? undefined,
      });
      setSelectedScaleId('');
      setSelectedScaleDef(null);
      setAnswers({});
      await loadExisting();
    } catch (e) {
      // Error log removed for security;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center"><ListChecks className="h-5 w-5 mr-2" /> Escalas médicas</h3>
        <div className="flex items-center space-x-2">
          <select
            value={selectedScaleId}
            onChange={(e) => handleSelectScale(e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
          >
            <option value="">Seleccionar escala...</option>
            {scales.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedScaleDef || saving}
            className="px-3 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 flex items-center"
            title="Guardar evaluación"
          >
            <Save className="h-4 w-4 mr-1" /> Guardar
          </button>
        </div>
      </div>

      {selectedScaleDef?.items && (
        <div className="space-y-3">
          {selectedScaleDef.items.map(item => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <label className="text-sm text-gray-300">{item.text}</label>
              {item.type === 'select' ? (
                <select
                  value={(answers[item.id] as string | number | undefined) ?? ''}
                  onChange={(e) => {
                    const optVal = e.target.value;
                    const num = Number(optVal);
                    setAnswers(prev => ({ ...prev, [item.id]: isNaN(num) ? optVal : num }));
                  }}
                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                >
                  <option value="">Seleccionar...</option>
                  {item.options?.map(opt => (
                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                  ))}
                </select>
              ) : item.type === 'number' ? (
                <input
                  type="number"
                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  value={(answers[item.id] as number | undefined) ?? ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                />
              ) : (
                <input
                  type="text"
                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                  value={(answers[item.id] as string | undefined) ?? ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="text-sm text-gray-300">
            Puntuación: <span className="font-semibold text-white">{typeof computedScore === 'number' ? computedScore.toFixed(2) : '-'}</span>
            {computedSeverity && (
              <span className="ml-3">Severidad: <span className="font-semibold text-white">{computedSeverity}</span></span>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-gray-300 font-medium mb-2">Evaluaciones registradas</h4>
        {existingAssessments.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay evaluaciones registradas.</p>
        ) : (
          <ul className="space-y-2">
            {existingAssessments.map(a => (
              <li key={a.id} className="text-sm text-gray-300 bg-gray-700 rounded p-2 border border-gray-600">
                <div className="flex justify-between">
                  <span>Escala: {a.scale_id}</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {typeof a.score === 'number' && (
                  <div>Puntuación: <span className="font-semibold text-white">{a.score}</span>{a.severity ? ` • ${a.severity}` : ''}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


