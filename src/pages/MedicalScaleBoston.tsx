import React, { useMemo, useState } from 'react';
import { ArrowLeft, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Option = { label: string; value: number };
type Q = { id: string; text: string; options: Option[] };

// 11 preguntas SSS (síntomas) 1-5
const SSS: Q[] = [
  { id: 'sss_1', text: 'Dolor nocturno en mano/muñeca', options: [1,2,3,4,5].map(v => ({ label: labelBy(v), value: v })) },
  { id: 'sss_2', text: 'Frecuencia del dolor nocturno', options: [1,2,3,4,5].map(v => ({ label: freqLabelBy(v), value: v })) },
  { id: 'sss_3', text: 'Dolor diurno en mano/muñeca', options: [1,2,3,4,5].map(v => ({ label: labelBy(v), value: v })) },
  { id: 'sss_4', text: 'Frecuencia del dolor diurno', options: [1,2,3,4,5].map(v => ({ label: dayFreqLabelBy(v), value: v })) },
  { id: 'sss_5', text: 'Duración promedio del dolor diurno', options: [1,2,3,4,5].map(v => ({ label: durationLabelBy(v), value: v })) },
  { id: 'sss_6', text: 'Adormecimiento', options: [1,2,3,4,5].map(v => ({ label: genericSeverity(v), value: v })) },
  { id: 'sss_7', text: 'Debilidad', options: [1,2,3,4,5].map(v => ({ label: weaknessLabelBy(v), value: v })) },
  { id: 'sss_8', text: 'Hormigueo', options: [1,2,3,4,5].map(v => ({ label: genericSeverity(v), value: v })) },
  { id: 'sss_9', text: 'Severidad de adormecimiento/hormigueo nocturno', options: [1,2,3,4,5].map(v => ({ label: genericSeverity(v), value: v })) },
  { id: 'sss_10', text: 'Frecuencia de despertar por debilidad/hormigueo', options: [1,2,3,4,5].map(v => ({ label: wakeLabelBy(v), value: v })) },
  { id: 'sss_11', text: 'Dificultad para agarrar objetos pequeños', options: [1,2,3,4,5].map(v => ({ label: difficultyLabelBy(v), value: v })) }
];

// 8 preguntas FSS (función) 1-5
const FSS: Q[] = [
  { id: 'fss_1', text: 'Escritura', options: diffOptions() },
  { id: 'fss_2', text: 'Abotonarse la ropa', options: diffOptions() },
  { id: 'fss_3', text: 'Sostener un libro', options: diffOptions() },
  { id: 'fss_4', text: 'Sujetar auricular del teléfono', options: diffOptions() },
  { id: 'fss_5', text: 'Abrir frascos', options: diffOptions() },
  { id: 'fss_6', text: 'Tareas domésticas', options: diffOptions() },
  { id: 'fss_7', text: 'Llevar cesta de la compra', options: diffOptions() },
  { id: 'fss_8', text: 'Bañarse y vestirse', options: diffOptions() }
];

function labelBy(v: number) {
  return ['Sin dolor','Leve','Moderado','Severo','Muy severo'][v-1];
}
function freqLabelBy(v: number) {
  return ['Nunca','Una vez','2-3 veces','4-5 veces','>5 veces'][v-1];
}
function dayFreqLabelBy(v: number) {
  return ['Nunca','1-2/día','3-5/día','>5/día','Continuo'][v-1];
}
function durationLabelBy(v: number) {
  return ['No hay dolor','<10 min','10-60 min','>60 min','Continuo'][v-1];
}
function genericSeverity(v: number) {
  return ['No','Leve','Moderado','Severo','Muy severo'][v-1];
}
function weaknessLabelBy(v: number) {
  return ['No','Leve','Moderada','Severa','Muy severa'][v-1];
}
function wakeLabelBy(v: number) {
  return ['Nunca','Una vez','2-3 veces','4-5 veces','>5 veces'][v-1];
}
function difficultyLabelBy(v: number) {
  return ['Sin dificultad','Poca','Moderada','Mucha','Muy severa'][v-1];
}
function diffOptions(): Option[] {
  return [1,2,3,4,5].map(v => ({ label: difficultyLabelBy(v), value: v }));
}

export default function MedicalScaleBoston() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sssAnswers, setSssAnswers] = useState<Record<string, number | ''>>({});
  const [fssAnswers, setFssAnswers] = useState<Record<string, number | ''>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sssAvg = useMemo(() => averageFrom(SSS, sssAnswers), [sssAnswers]);
  const fssAvg = useMemo(() => averageFrom(FSS, fssAnswers), [fssAnswers]);

  const sssInterpretation = useMemo(() => interpretSSS(sssAvg), [sssAvg]);
  const fssInterpretation = useMemo(() => interpretFSS(fssAvg), [fssAvg]);

  function averageFrom(list: Q[], answers: Record<string, number | ''>) {
    const vals = list.map(q => answers[q.id]).filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function interpretSSS(avg: number) {
    if (avg < 2) return 'Síntomas leves';
    if (avg < 3.5) return 'Síntomas moderados';
    return 'Síntomas severos';
  }
  function interpretFSS(avg: number) {
    if (avg < 2) return 'Función normal/leve';
    if (avg < 3.5) return 'Dificultad moderada';
    return 'Dificultad severa';
  }

  const handleReset = () => {
    setSssAnswers({});
    setFssAnswers({});
  };

  const handleSaveToRecord = async () => {
    setMessage(null);
    try {
      setSaving(true);
      const patientId = searchParams.get('patient') || '';
      const consultationId = searchParams.get('consulta') || null;
      if (!patientId) {
        setMessage({ type: 'error', text: 'Falta el parámetro de paciente en la URL (?patient=...)' });
        return;
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setMessage({ type: 'error', text: 'Debes iniciar sesión para guardar.' });
        return;
      }
      // Empaquetar respuestas
      const sss: Record<string, number> = {};
      Object.entries(sssAnswers).forEach(([k, v]) => { if (typeof v === 'number') sss[k] = v; });
      const fss: Record<string, number> = {};
      Object.entries(fssAnswers).forEach(([k, v]) => { if (typeof v === 'number') fss[k] = v; });

      const { error: insertError } = await supabase
        .from('scale_assessments')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          consultation_id: consultationId,
          scale_id: 'boston_carpal_tunnel',
          answers: { sss, fss },
          score: Number(((sssAvg + fssAvg) / 2).toFixed(2)),
          severity: `${interpretSSS(sssAvg)} / ${interpretFSS(fssAvg)}`
        });
      if (insertError) throw insertError;
      setMessage({ type: 'success', text: 'Evaluación guardada en el expediente.' });
    } catch (e: any) {
      console.error('Error saving Boston', e);
      setMessage({ type: 'error', text: e?.message || 'Error al guardar la evaluación.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/escalas')} className="text-gray-300 hover:text-white flex items-center">
          <ArrowLeft className="h-5 w-5 mr-1" /> Volver
        </button>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 text-sm text-gray-300 hover:text-white flex items-center" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reiniciar
          </button>
          <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center disabled:opacity-50" onClick={handleSaveToRecord} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar en expediente'}
          </button>
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold text-white mb-1">Boston Carpal Tunnel Questionnaire (BCTQ)</h1>
      <p className="text-sm text-gray-400 mb-4">Síndrome del túnel carpiano: severidad de síntomas (SSS) y estado funcional (FSS), 1–5.</p>

      {message && (
        <div className={`mb-3 text-sm flex items-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />} {message.text}
        </div>
      )}

      {/* Resumen */}
      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
          <div>SSS (promedio): <span className="text-white font-semibold">{sssAvg.toFixed(2)}</span> — {sssInterpretation}</div>
          <div>FSS (promedio): <span className="text-white font-semibold">{fssAvg.toFixed(2)}</span> — {fssInterpretation}</div>
        </div>
      </div>

      {/* SSS */}
      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
        <h2 className="text-white font-medium mb-3">Parte 1 — Escala de Severidad de Síntomas (SSS)</h2>
        <div className="space-y-3">
          {SSS.map(q => (
            <div key={q.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <label className="text-sm text-gray-300">{q.text}</label>
              <select
                className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                value={sssAnswers[q.id] ?? ''}
                onChange={(e) => setSssAnswers(prev => ({ ...prev, [q.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">Seleccionar...</option>
                {q.options.map(opt => (
                  <option key={`${q.id}-${opt.value}`} value={opt.value}>{opt.label} ({opt.value})</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* FSS */}
      <div className="bg-gray-800 border border-gray-700 rounded p-4">
        <h2 className="text-white font-medium mb-3">Parte 2 — Escala de Estado Funcional (FSS)</h2>
        <div className="space-y-3">
          {FSS.map(q => (
            <div key={q.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <label className="text-sm text-gray-300">{q.text}</label>
              <select
                className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                value={fssAnswers[q.id] ?? ''}
                onChange={(e) => setFssAnswers(prev => ({ ...prev, [q.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">Seleccionar...</option>
                {q.options.map(opt => (
                  <option key={`${q.id}-${opt.value}`} value={opt.value}>{opt.label} ({opt.value})</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


