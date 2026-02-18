import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type AppointmentItem = {
  id: string;
  title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  type: string;
  location: string | null;
  notes: string | null;
};

export default function AppointmentsPage() {
  const { profile } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  useEffect(() => {
    const loadAppointments = async () => {
      if (!profile?.id) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('appointments')
        .select('id,title,appointment_date,appointment_time,status,type,location,notes')
        .eq('patient_id', profile.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      setAppointments((data as AppointmentItem[]) || []);
      setLoading(false);
    };

    void loadAppointments();
  }, [profile?.id]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const next: AppointmentItem[] = [];
    const prev: AppointmentItem[] = [];

    appointments.forEach((appointment) => {
      const at = new Date(`${appointment.appointment_date}T${appointment.appointment_time || '00:00:00'}`);
      if (at.getTime() >= now.getTime()) {
        next.push(appointment);
      } else {
        prev.push(appointment);
      }
    });

    return { upcoming: next, past: prev.reverse() };
  }, [appointments]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando citas...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Mis citas</h1>
        <p className="mt-1 text-sm text-slate-400">Consulta tus citas proximas y tu historial.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-300">Proximas ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">Sin citas proximas.</div>
        ) : null}
        {upcoming.map((appointment) => (
          <article key={appointment.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{appointment.title}</p>
            <p className="mt-1 text-sm text-slate-300">
              {appointment.appointment_date} {appointment.appointment_time} | {appointment.type}
            </p>
            <p className="mt-1 text-sm text-slate-400">Estado: {appointment.status}</p>
            {appointment.location ? <p className="mt-1 text-sm text-slate-400">Lugar: {appointment.location}</p> : null}
            {appointment.notes ? <p className="mt-1 text-sm text-slate-400">Notas: {appointment.notes}</p> : null}
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-300">Historial ({past.length})</h2>
        {past.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">Sin historial de citas.</div>
        ) : null}
        {past.slice(0, 20).map((appointment) => (
          <article key={appointment.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="font-semibold">{appointment.title}</p>
            <p className="mt-1 text-sm text-slate-300">
              {appointment.appointment_date} {appointment.appointment_time}
            </p>
            <p className="mt-1 text-sm text-slate-400">Estado: {appointment.status}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
