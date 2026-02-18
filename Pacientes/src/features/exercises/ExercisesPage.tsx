import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type PatientTask = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  due_date: string | null;
  task_type: string;
};

export default function ExercisesPage() {
  const { profile } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PatientTask[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!profile?.id) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await (supabase as any)
        .from('patient_tasks')
        .select('id,title,description,instructions,status,due_date,task_type')
        .eq('patient_id', profile.id)
        .in('task_type', ['exercise', 'questionnaire', 'document'])
        .order('due_date', { ascending: true, nullsFirst: false });

      setTasks((data as PatientTask[]) || []);
      setLoading(false);
    };

    void loadTasks();
  }, [profile?.id]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando pendientes...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Pendientes y ejercicios</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aqui aparecen los ejercicios, cuestionarios y tareas asignadas por tu medico.
        </p>
      </section>

      <section className="space-y-2">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            No tienes pendientes activos.
          </div>
        ) : null}
        {tasks.map((task) => (
          <article key={task.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{task.title}</p>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-xs uppercase text-slate-300">{task.status}</span>
            </div>
            <p className="mt-1 text-xs text-cyan-300">{task.task_type}</p>
            {task.description ? <p className="mt-2 text-sm text-slate-300">{task.description}</p> : null}
            {task.instructions ? <p className="mt-2 text-sm text-slate-400">Indicaciones: {task.instructions}</p> : null}
            {task.due_date ? <p className="mt-2 text-xs text-slate-500">Fecha limite: {new Date(task.due_date).toLocaleString()}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
