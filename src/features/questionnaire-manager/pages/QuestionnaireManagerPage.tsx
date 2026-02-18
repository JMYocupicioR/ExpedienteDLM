import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type Scale = { id: string; name: string; category: string | null; specialty: string | null };
type Patient = { id: string; full_name: string | null };

export default function QuestionnaireManagerPage() {
  const [scales, setScales] = useState<Scale[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedScale, setSelectedScale] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [title, setTitle] = useState('Escala asignada');
  const [description, setDescription] = useState('Por favor completa esta escala hoy.');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canAssign = useMemo(
    () => Boolean(selectedScale && selectedPatient && scheduledDate),
    [selectedScale, selectedPatient, scheduledDate]
  );

  useEffect(() => {
    const load = async () => {
      const [{ data: scalesData }, { data: patientsData }] = await Promise.all([
        supabase.from('medical_scales').select('id, name, category, specialty').eq('is_active', true).order('name'),
        supabase.from('patients').select('id, full_name').eq('is_active', true).order('full_name'),
      ]);
      setScales((scalesData || []) as Scale[]);
      setPatients((patientsData || []) as Patient[]);
      if (scalesData?.length) setSelectedScale(scalesData[0].id);
      if (patientsData?.length) setSelectedPatient(patientsData[0].id);
    };
    void load();
  }, []);

  const assignScaleTask = async () => {
    if (!canAssign) return;
    setSaving(true);
    setMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage('No se detecto sesion activa');
      setSaving(false);
      return;
    }

    const { data: patient } = await supabase
      .from('patients')
      .select('clinic_id')
      .eq('id', selectedPatient)
      .single();

    const { error } = await supabase.from('patient_tasks').insert({
      patient_id: selectedPatient,
      doctor_id: user.id,
      clinic_id: patient?.clinic_id || null,
      task_type: 'scale',
      title,
      description,
      scale_id: selectedScale,
      scheduled_date: scheduledDate,
      priority: 'normal',
    });

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : 'Escala asignada exitosamente.');
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Gestor de Cuestionarios</h1>
        <p className="mt-1 text-sm text-gray-400">
          Biblioteca de escalas y asignacion directa al timeline del paciente.
        </p>
      </header>

      <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-white">Asignar escala</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-gray-300">
            Escala
            <select
              value={selectedScale}
              onChange={(e) => setSelectedScale(e.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2"
            >
              {scales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.name} {scale.category ? `(${scale.category})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-300">
            Paciente
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2"
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name || patient.id}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-300">
            Titulo
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2"
            />
          </label>

          <label className="text-sm text-gray-300">
            Fecha programada
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2"
            />
          </label>

          <label className="text-sm text-gray-300 md:col-span-2">
            Descripcion
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-950 p-2"
              rows={3}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void assignScaleTask()}
            disabled={!canAssign || saving}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Asignando...' : 'Asignar al paciente'}
          </button>
          {message && <p className="text-sm text-gray-300">{message}</p>}
        </div>
      </section>
    </div>
  );
}
