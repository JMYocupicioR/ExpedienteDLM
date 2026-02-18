import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type TimelineEvent = {
  id: string;
  type: 'appointment' | 'consultation' | 'scale' | 'task';
  title: string;
  description: string;
  at: string;
};

export default function TimelinePage() {
  const { profile } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) {
        setEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [appointmentsRes, consultationsRes, scalesRes, tasksRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id,title,appointment_date,appointment_time,status')
          .eq('patient_id', profile.id)
          .order('appointment_date', { ascending: false })
          .limit(10),
        supabase.from('consultations').select('id,diagnosis,created_at').eq('patient_id', profile.id).order('created_at', { ascending: false }).limit(10),
        supabase
          .from('scale_assessments')
          .select('id,score,severity,created_at,medical_scales(name)')
          .eq('patient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any)
          .from('patient_tasks')
          .select('id,title,task_type,status,due_date,created_at')
          .eq('patient_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const appointmentEvents: TimelineEvent[] = (appointmentsRes.data || []).map((item: any) => ({
        id: `a-${item.id}`,
        type: 'appointment',
        title: item.title || 'Cita',
        description: `Estado: ${item.status || 'programada'}`,
        at: `${item.appointment_date}T${item.appointment_time || '00:00:00'}`,
      }));

      const consultationEvents: TimelineEvent[] = (consultationsRes.data || []).map((item: any) => ({
        id: `c-${item.id}`,
        type: 'consultation',
        title: 'Consulta registrada',
        description: item.diagnosis || 'Sin diagnostico capturado.',
        at: item.created_at,
      }));

      const scaleEvents: TimelineEvent[] = (scalesRes.data || []).map((item: any) => ({
        id: `s-${item.id}`,
        type: 'scale',
        title: item.medical_scales?.name ? `Escala: ${item.medical_scales.name}` : 'Escala completada',
        description: `Puntaje: ${item.score ?? 'N/A'} | Severidad: ${item.severity || 'N/A'}`,
        at: item.created_at,
      }));

      const taskEvents: TimelineEvent[] = ((tasksRes.data as any[]) || []).map((item) => ({
        id: `t-${item.id}`,
        type: 'task',
        title: item.title || 'Pendiente asignado',
        description: `${item.task_type || 'task'} - ${item.status || 'pending'}`,
        at: item.due_date || item.created_at,
      }));

      const merged = [...appointmentEvents, ...consultationEvents, ...scaleEvents, ...taskEvents].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      );

      setEvents(merged.slice(0, 25));
      setLoading(false);
    };

    void load();
  }, [profile?.id]);

  const summary = useMemo(
    () => ({
      total: events.length,
      appointments: events.filter((event) => event.type === 'appointment').length,
      pendingTasks: events.filter((event) => event.type === 'task').length,
    }),
    [events],
  );

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando timeline...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Timeline</h1>
        <p className="mt-1 text-sm text-slate-400">
          {summary.total} eventos | {summary.appointments} citas | {summary.pendingTasks} pendientes.
        </p>
      </section>

      <section className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Aun no hay actividad en tu expediente.
          </div>
        ) : null}
        {events.map((event) => (
          <article key={event.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-semibold">{event.title}</p>
            <p className="mt-1 text-sm text-slate-300">{event.description}</p>
            <p className="mt-2 text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
