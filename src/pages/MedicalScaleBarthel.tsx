import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, RefreshCw, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Option = { label: string; value: number };
type Item = { id: string; text: string; weight: number; options: Option[] };

// Ítems estándar del Índice de Barthel (versión 0-100)
const BARTHEL_ITEMS: Item[] = [
  { id: 'feeding', text: 'Alimentación', weight: 10, options: [
    { label: 'Independiente', value: 10 },
    { label: 'Necesita ayuda', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'bathing', text: 'Baño', weight: 5, options: [
    { label: 'Independiente', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'grooming', text: 'Aseo personal', weight: 5, options: [
    { label: 'Independiente', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'dressing', text: 'Vestido', weight: 10, options: [
    { label: 'Independiente', value: 10 },
    { label: 'Necesita ayuda', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'bowels', text: 'Control intestinal', weight: 10, options: [
    { label: 'Continente', value: 10 },
    { label: 'Accidentes ocasionales', value: 5 },
    { label: 'Incontinente', value: 0 }
  ] },
  { id: 'bladder', text: 'Control urinario', weight: 10, options: [
    { label: 'Continente', value: 10 },
    { label: 'Accidentes ocasionales', value: 5 },
    { label: 'Incontinente', value: 0 }
  ] },
  { id: 'toilet', text: 'Uso de retrete', weight: 10, options: [
    { label: 'Independiente', value: 10 },
    { label: 'Necesita ayuda', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'transfer', text: 'Traslado cama-sillón', weight: 15, options: [
    { label: 'Independiente', value: 15 },
    { label: 'Pequeña ayuda', value: 10 },
    { label: 'Gran ayuda', value: 5 },
    { label: 'Dependiente', value: 0 }
  ] },
  { id: 'mobility', text: 'Deambulación en llano', weight: 15, options: [
    { label: 'Independiente (sin ayuda)', value: 15 },
    { label: 'Con ayuda/andador', value: 10 },
    { label: 'Silla de ruedas independiente', value: 5 },
    { label: 'Inmóvil', value: 0 }
  ] },
  { id: 'stairs', text: 'Subir y bajar escaleras', weight: 10, options: [
    { label: 'Independiente', value: 10 },
    { label: 'Necesita ayuda', value: 5 },
    { label: 'Incapaz', value: 0 }
  ] },
];

const MAX_SCORE = BARTHEL_ITEMS.reduce((sum, i) => sum + i.weight, 0); // 100

export default function MedicalScaleBarthel() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [answers, setAnswers] = useState<Record<string, number | ''>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Cargar borrador de localStorage por si existe
    const draft = localStorage.getItem('barthel_draft');
    if (draft) {
      try { setAnswers(JSON.parse(draft)); } catch { /* ignore */ }
    }
  }, []);

  const score = useMemo(() => {
    const vals = BARTHEL_ITEMS
      .map(i => answers[i.id])
      .filter(v => typeof v === 'number') as number[];
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0);
  }, [answers]);

  const severity = useMemo(() => {
    if (score <= 20) return 'Dependencia total';
    if (score <= 60) return 'Dependencia severa';
    if (score <= 90) return 'Dependencia moderada';
    if (score < 100) return 'Dependencia leve';
    return 'Independencia';
  }, [score]);

  const severityColor = useMemo(() => {
    if (score <= 20) return 'text-red-400 border-red-700 bg-red-900/20';
    if (score <= 60) return 'text-orange-400 border-orange-700 bg-orange-900/20';
    if (score <= 90) return 'text-yellow-400 border-yellow-700 bg-yellow-900/20';
    if (score < 100) return 'text-blue-400 border-blue-700 bg-blue-900/20';
    return 'text-green-400 border-green-700 bg-green-900/20';
  }, [score]);

  const allAnswered = BARTHEL_ITEMS.every(i => answers[i.id] !== undefined && answers[i.id] !== '');
  const remaining = MAX_SCORE - score;
  const progressPercent = Math.round((score / MAX_SCORE) * 100);

  const handleSaveDraft = () => {
    localStorage.setItem('barthel_draft', JSON.stringify(answers));
  };

  const handleReset = () => {
    setAnswers({});
    localStorage.removeItem('barthel_draft');
  };

  const handleSaveToRecord = async () => {
    setMessage(null);
    try {
      setSaving(true);
      // Obtener parámetros de contexto
      const patientId = searchParams.get('patient') || searchParams.get('paciente') || '';
      const consultationId = searchParams.get('consulta') || searchParams.get('consultation') || null;
      if (!patientId) {
        setMessage({ type: 'error', text: 'Falta el parámetro de paciente en la URL (?patient=...)' });
        return;
      }
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setMessage({ type: 'error', text: 'Debes iniciar sesión para guardar.' });
        return;
      }
      const finalScore = score;
      const finalSeverity = severity;
      // Preparar objeto answers: mantener solo valores numéricos
      const numericAnswers: Record<string, number> = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (typeof v === 'number') numericAnswers[k] = v;
      });

      const { error: insertError } = await supabase
        .from('scale_assessments')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          consultation_id: consultationId,
          scale_id: 'barthel',
          answers: numericAnswers,
          score: finalScore,
          severity: finalSeverity
        });

      if (insertError) throw insertError;
      setMessage({ type: 'success', text: 'Evaluación guardada en el expediente.' });
    } catch (e: any) {
      // Error log removed for security;
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
          <button
            className="px-3 py-2 text-sm text-gray-300 hover:text-white flex items-center"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Reiniciar
          </button>
          <button
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center"
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4 mr-1" /> Guardar borrador
          </button>
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold text-white mb-1">Índice de Barthel</h1>
      <p className="text-sm text-gray-400 mb-4">Evaluación de independencia funcional en actividades básicas de la vida diaria (0-100).</p>

      {/* Resumen */}
      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-300">
            Puntuación total: <span className="text-white font-semibold">{score}</span> / {MAX_SCORE}
            <span className={`ml-3 text-xs border rounded px-2 py-0.5 ${severityColor}`}>{severity}</span>
          </div>
          <div className="text-sm text-gray-400 mt-2 sm:mt-0">Puntos restantes: {remaining}</div>
        </div>
        <div className="mt-3 h-2 bg-gray-700 rounded overflow-hidden">
          <div className="h-full bg-cyan-600" style={{ width: `${progressPercent}%` }} />
        </div>
        {message && (
          <div className={`mt-3 text-sm flex items-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Ítems */}
      <div className="space-y-4">
        {BARTHEL_ITEMS.map(item => (
          <div key={item.id} className="bg-gray-800 border border-gray-700 rounded p-4">
            <div className="text-white font-medium mb-2 flex items-center justify-between">
              <span>{item.text}</span>
              <span className="text-xs text-gray-400">máx. {item.weight} pts</span>
            </div>
            <div>
              <select
                className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                value={answers[item.id] ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  setAnswers(prev => ({ ...prev, [item.id]: v }));
                }}
              >
                <option value="">Seleccionar...</option>
                {item.options.map(opt => (
                  <option key={`${item.id}-${opt.value}`} value={opt.value}>{opt.label} (+{opt.value})</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Interpretación */}
      <div className="mt-4 bg-gray-800 border border-gray-700 rounded p-4 text-sm text-gray-300">
        <div className="font-medium text-white mb-2">Interpretación</div>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          <li>0–20: Dependencia total</li>
          <li>21–60: Dependencia severa</li>
          <li>61–90: Dependencia moderada</li>
          <li>91–99: Dependencia leve</li>
          <li>100: Independencia</li>
        </ul>
        {allAnswered && (
          <div className="mt-3 flex items-center text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" /> Cuestionario completo
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
        <button
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center disabled:opacity-50"
          onClick={handleSaveToRecord}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar en expediente'}
        </button>
      </div>
    </div>
  );
}


