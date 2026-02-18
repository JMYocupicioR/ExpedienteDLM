import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type ScaleResult = {
  id: string;
  score: number | null;
  severity: string | null;
  created_at: string;
  medical_scales?: { name: string } | null;
};

export default function ProgressPage() {
  const { profile } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [scaleResults, setScaleResults] = useState<ScaleResult[]>([]);
  const [consultationCount, setConsultationCount] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      if (!profile?.id) {
        setScaleResults([]);
        setConsultationCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [scalesRes, consultationsRes] = await Promise.all([
        supabase
          .from('scale_assessments')
          .select('id,score,severity,created_at,medical_scales(name)')
          .eq('patient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('patient_id', profile.id),
      ]);

      setScaleResults((scalesRes.data as ScaleResult[]) || []);
      setConsultationCount(consultationsRes.count || 0);
      setLoading(false);
    };

    void loadProgress();
  }, [profile?.id]);

  const averageScore = useMemo(() => {
    const values = scaleResults.map((item) => item.score).filter((score): score is number => typeof score === 'number');
    if (values.length === 0) return null;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }, [scaleResults]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando progreso...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Consultas</p>
          <p className="mt-1 text-2xl font-semibold">{consultationCount}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Escalas respondidas</p>
          <p className="mt-1 text-2xl font-semibold">{scaleResults.length}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Promedio global</p>
          <p className="mt-1 text-2xl font-semibold">{averageScore ?? 'N/A'}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Detalle de escalas</h1>
        <div className="mt-3 space-y-2">
          {scaleResults.length === 0 ? (
            <p className="text-sm text-slate-400">Todavia no hay resultados de escalas.</p>
          ) : null}
          {scaleResults.map((result) => (
            <article key={result.id} className="rounded border border-slate-700 p-3 text-sm">
              <p className="font-medium">{result.medical_scales?.name || 'Escala'}</p>
              <p className="text-slate-300">
                Puntaje: {result.score ?? 'N/A'} | Severidad: {result.severity || 'N/A'}
              </p>
              <p className="text-xs text-slate-500">{new Date(result.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
