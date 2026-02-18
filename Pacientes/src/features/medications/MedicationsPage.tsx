import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type MedicationRow = {
  id: string;
  consultation_id: string | null;
  created_at: string;
  [key: string]: unknown;
};

export default function MedicationsPage() {
  const { profile } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<MedicationRow[]>([]);

  useEffect(() => {
    const loadMedications = async () => {
      if (!profile?.id) {
        setMedications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('patient_prescription_history')
        .select('*')
        .eq('patient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setMedications((data as MedicationRow[]) || []);
      setLoading(false);
    };

    void loadMedications();
  }, [profile?.id]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando medicamentos...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Medicamentos</h1>
        <p className="mt-1 text-sm text-slate-400">Historial de recetas y medicamentos registrados en tu expediente.</p>
      </section>

      <section className="space-y-2">
        {medications.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">Sin recetas registradas.</div>
        ) : null}
        {medications.map((row) => (
          <article key={row.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-medium">Registro #{row.id.slice(0, 8)}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">
              {JSON.stringify(row, null, 2)}
            </pre>
          </article>
        ))}
      </section>
    </div>
  );
}
