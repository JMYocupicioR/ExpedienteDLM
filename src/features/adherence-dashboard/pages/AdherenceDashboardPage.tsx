import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type AdherenceRow = {
  id: string;
  patient_id: string;
  date: string;
  adherence_score: number;
  status: 'green' | 'yellow' | 'red';
  tasks_total: number;
  tasks_completed: number;
};

function statusClass(status: AdherenceRow['status']) {
  if (status === 'green') return 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40';
  if (status === 'yellow') return 'bg-amber-600/20 text-amber-300 border-amber-500/40';
  return 'bg-rose-600/20 text-rose-300 border-rose-500/40';
}

export default function AdherenceDashboardPage() {
  const [rows, setRows] = useState<AdherenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('patient_adherence')
        .select('id, patient_id, date, adherence_score, status, tasks_total, tasks_completed')
        .eq('doctor_id', user.id)
        .order('date', { ascending: false })
        .limit(300);

      setRows((data || []) as AdherenceRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter]
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tablero de Adherencia</h1>
          <p className="mt-1 text-sm text-gray-400">Semaforo de cumplimiento de pacientes.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'green' | 'yellow' | 'red')}
          className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="green">Verde</option>
          <option value="yellow">Amarillo</option>
          <option value="red">Rojo</option>
        </select>
      </header>

      {loading && <p className="text-sm text-gray-400">Cargando adherencia...</p>}

      <div className="space-y-3">
        {filtered.map((row) => (
          <article key={row.id} className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">Paciente {row.patient_id.slice(0, 8)}</p>
                <h3 className="text-lg font-semibold text-white">{row.adherence_score}% adherencia</h3>
                <p className="text-xs text-gray-500">
                  {row.tasks_completed}/{row.tasks_total} tareas - {row.date}
                </p>
              </div>
              <span className={`rounded border px-3 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                {row.status.toUpperCase()}
              </span>
            </div>
          </article>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="rounded border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300">
            No hay datos para el filtro seleccionado.
          </div>
        )}
      </div>
    </div>
  );
}
