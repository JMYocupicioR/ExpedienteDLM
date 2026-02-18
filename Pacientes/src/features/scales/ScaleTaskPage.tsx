import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type ScaleTask = {
  id: string;
  title: string;
  instructions: string | null;
  related_entity_id: string | null;
  status: string;
};

type ScaleMeta = {
  id: string;
  name: string;
  description: string | null;
};

export default function ScaleTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { profile } = usePatientAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<ScaleTask | null>(null);
  const [scale, setScale] = useState<ScaleMeta | null>(null);
  const [score, setScore] = useState('');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTask = async () => {
      if (!profile?.id || !taskId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: taskData } = await (supabase as any)
        .from('patient_tasks')
        .select('id,title,instructions,related_entity_id,status')
        .eq('id', taskId)
        .eq('patient_id', profile.id)
        .maybeSingle();

      if (!taskData) {
        setError('No se encontro la tarea de escala.');
        setLoading(false);
        return;
      }

      setTask(taskData as ScaleTask);
      if (taskData.related_entity_id) {
        const { data: scaleData } = await supabase
          .from('medical_scales')
          .select('id,name,description')
          .eq('id', taskData.related_entity_id)
          .maybeSingle();
        setScale((scaleData as ScaleMeta | null) || null);
      }

      setLoading(false);
    };

    void loadTask();
  }, [profile?.id, taskId]);

  const submitScale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.id || !task) return;

    setSaving(true);
    setError(null);

    const numericScore = Number(score);
    const answers = {
      notes,
      submitted_from: 'patient_portal',
    };

    const insertPayload = {
      patient_id: profile.id,
      doctor_id: profile.primary_doctor_id,
      scale_id: task.related_entity_id,
      answers,
      score: Number.isFinite(numericScore) ? numericScore : null,
      severity: severity || null,
    };

    const { error: insertError } = await supabase.from('scale_assessments').insert(insertPayload as any);
    if (insertError) {
      setSaving(false);
      setError(insertError.message || 'No fue posible guardar la escala.');
      return;
    }

    await (supabase as any)
      .from('patient_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('patient_id', profile.id);

    setSaving(false);
    navigate('/progreso', { replace: true });
  };

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando escala...</div>;
  }

  if (error || !task) {
    return (
      <div className="rounded-lg border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">
        {error || 'No fue posible abrir la escala.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">{task.title || scale?.name || 'Escala asignada'}</h1>
        {task.instructions ? <p className="mt-1 text-sm text-slate-300">{task.instructions}</p> : null}
        {scale?.description ? <p className="mt-1 text-xs text-slate-400">{scale.description}</p> : null}
      </section>

      <form onSubmit={submitScale} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="space-y-1">
          <label htmlFor="score" className="text-sm text-slate-300">
            Puntaje
          </label>
          <input
            id="score"
            type="number"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="severity" className="text-sm text-slate-300">
            Nivel percibido
          </label>
          <select
            id="severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">Selecciona una opcion</option>
            <option value="leve">Leve</option>
            <option value="moderada">Moderada</option>
            <option value="severa">Severa</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm text-slate-300">
            Notas
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Enviar escala'}
        </button>
      </form>
    </div>
  );
}
