import { BookOpen, CalendarDays, Dumbbell, Loader2, PenSquare, Plus } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import ExerciseForm from '../components/ExerciseForm';
import ExerciseLibraryBrowser from '../components/ExerciseLibraryBrowser';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary';
import { useTaxonomy } from '../hooks/useTaxonomy';
import type { AssignmentFrequency, AssignmentPayload, ExerciseFormData, ExerciseWithTaxonomy } from '../types';

type Tab = 'biblioteca' | 'crear' | 'asignar';

export default function ExerciseManagerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('biblioteca');
  const { groups, termMap, loading: taxLoading } = useTaxonomy();
  const {
    exercises,
    patients,
    loading,
    saving,
    error,
    reload,
    filterExercises,
    createExercise,
    updateExercise,
    assignExercise,
  } = useExerciseLibrary();

  // ── Edit state ─────────────────────────────────────────────
  const [editExercise, setEditExercise] = useState<ExerciseWithTaxonomy | null>(null);

  // ── Assign state ───────────────────────────────────────────
  const [assignTarget, setAssignTarget] = useState<ExerciseWithTaxonomy | null>(null);
  const [assignPatient, setAssignPatient] = useState('');
  const [assignFrequency, setAssignFrequency] = useState<AssignmentFrequency>('daily');
  const [assignSets, setAssignSets] = useState<number | ''>('');
  const [assignReps, setAssignReps] = useState<number | ''>('');
  const [assignStartDate, setAssignStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  // ── Handlers ───────────────────────────────────────────────

  const handleSave = useCallback(
    async (formData: ExerciseFormData, existingId?: string) => {
      if (existingId) {
        const ok = await updateExercise(existingId, formData);
        if (ok) {
          setEditExercise(null);
          await reload();
        }
      } else {
        const id = await createExercise(formData);
        if (id) {
          await reload();
        }
      }
    },
    [createExercise, updateExercise, reload],
  );

  const handleGoToAssign = useCallback(
    (exercise: ExerciseWithTaxonomy) => {
      setAssignTarget(exercise);
      setAssignSets(exercise.sets ?? '');
      setAssignReps(exercise.repetitions ?? '');
      setAssignMessage(null);
      setActiveTab('asignar');
    },
    [],
  );

  const handleGoToEdit = useCallback(
    (exercise: ExerciseWithTaxonomy) => {
      setEditExercise(exercise);
      setActiveTab('crear');
    },
    [],
  );

  const handleAssignSubmit = useCallback(async () => {
    if (!assignTarget || !assignPatient) {
      setAssignMessage('Selecciona un ejercicio y un paciente.');
      return;
    }

    const payload: AssignmentPayload = {
      exercise_id: assignTarget.id,
      patient_id: assignPatient,
      frequency: assignFrequency,
      sets: typeof assignSets === 'number' ? assignSets : null,
      repetitions: typeof assignReps === 'number' ? assignReps : null,
      start_date: assignStartDate,
      end_date: assignEndDate || null,
      notes: assignNotes,
    };

    const ok = await assignExercise(payload);
    if (ok) {
      setAssignMessage('Ejercicio asignado exitosamente al paciente.');
      setAssignTarget(null);
      setAssignNotes('');
    }
  }, [
    assignTarget,
    assignPatient,
    assignFrequency,
    assignSets,
    assignReps,
    assignStartDate,
    assignEndDate,
    assignNotes,
    assignExercise,
  ]);

  // ── Loading ────────────────────────────────────────────────

  if (loading || taxLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={24} className="animate-spin text-cyan-500" />
        <span className="ml-2 text-sm text-gray-400">Cargando biblioteca de ejercicios...</span>
      </div>
    );
  }

  // ── Tabs ───────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'biblioteca', label: 'Biblioteca', icon: <BookOpen size={16} /> },
    { id: 'crear', label: 'Crear / Editar', icon: <PenSquare size={16} /> },
    { id: 'asignar', label: 'Asignar', icon: <CalendarDays size={16} /> },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Dumbbell size={24} className="text-cyan-400" />
          Ejercicios de Rehabilitación
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Administra, crea y asigna ejercicios personalizados a tus pacientes.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <nav className="flex gap-1 rounded-lg border border-gray-700 bg-gray-900/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div>
        {/* ── BIBLIOTECA ── */}
        {activeTab === 'biblioteca' && (
          <ExerciseLibraryBrowser
            exercises={exercises}
            groups={groups}
            termMap={termMap}
            filterExercises={filterExercises}
            onAssign={handleGoToAssign}
            onEdit={handleGoToEdit}
          />
        )}

        {/* ── CREAR / EDITAR ── */}
        {activeTab === 'crear' && (
          <section className="rounded-lg border border-gray-700 bg-gray-900/80 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <PenSquare size={18} className="text-cyan-400" />
              {editExercise ? 'Editar ejercicio' : 'Crear nuevo ejercicio'}
            </h2>
            <ExerciseForm
              groups={groups}
              exercises={exercises}
              saving={saving}
              onSave={handleSave}
              editExercise={editExercise}
              onCancelEdit={() => setEditExercise(null)}
            />
          </section>
        )}

        {/* ── ASIGNAR ── */}
        {activeTab === 'asignar' && (
          <section className="rounded-lg border border-gray-700 bg-gray-900/80 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarDays size={18} className="text-cyan-400" />
              Asignar ejercicio a paciente
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Exercise selector */}
              <label className="text-sm text-gray-300">
                <span className="mb-1 block text-xs font-medium text-gray-400">Ejercicio</span>
                <select
                  value={assignTarget?.id ?? ''}
                  onChange={(e) => {
                    const ex = exercises.find((x) => x.id === e.target.value);
                    setAssignTarget(ex ?? null);
                    if (ex) {
                      setAssignSets(ex.sets ?? '');
                      setAssignReps(ex.repetitions ?? '');
                    }
                  }}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                >
                  <option value="">-- Seleccionar ejercicio --</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
              </label>

              {/* Patient selector */}
              <label className="text-sm text-gray-300">
                <span className="mb-1 block text-xs font-medium text-gray-400">Paciente</span>
                <select
                  value={assignPatient}
                  onChange={(e) => setAssignPatient(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                >
                  <option value="">-- Seleccionar paciente --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.id}
                    </option>
                  ))}
                </select>
              </label>

              {/* Frequency */}
              <label className="text-sm text-gray-300">
                <span className="mb-1 block text-xs font-medium text-gray-400">Frecuencia</span>
                <select
                  value={assignFrequency}
                  onChange={(e) => setAssignFrequency(e.target.value as AssignmentFrequency)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                >
                  <option value="daily">Diario</option>
                  <option value="5x_week">5 veces por semana</option>
                  <option value="3x_week">3 veces por semana</option>
                  <option value="2x_week">2 veces por semana</option>
                  <option value="weekly">Semanal</option>
                  <option value="as_needed">Según necesidad</option>
                </select>
              </label>

              {/* Sets / Reps */}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-300">
                  <span className="mb-1 block text-xs font-medium text-gray-400">Series</span>
                  <input
                    type="number"
                    min={0}
                    value={assignSets}
                    onChange={(e) =>
                      setAssignSets(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                    placeholder="3"
                  />
                </label>
                <label className="text-sm text-gray-300">
                  <span className="mb-1 block text-xs font-medium text-gray-400">Repeticiones</span>
                  <input
                    type="number"
                    min={0}
                    value={assignReps}
                    onChange={(e) =>
                      setAssignReps(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                    placeholder="10"
                  />
                </label>
              </div>

              {/* Dates */}
              <label className="text-sm text-gray-300">
                <span className="mb-1 block text-xs font-medium text-gray-400">Fecha de inicio</span>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-1 block text-xs font-medium text-gray-400">
                  Fecha de fin <span className="text-gray-600">(opcional)</span>
                </span>
                <input
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                />
              </label>

              {/* Notes */}
              <label className="text-sm text-gray-300 lg:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-400">
                  Notas para el paciente <span className="text-gray-600">(opcional)</span>
                </span>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
                  placeholder="Indicaciones especiales, precauciones..."
                />
              </label>
            </div>

            {/* Assign preview card */}
            {assignTarget && (
              <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="text-xs font-medium text-gray-500">Ejercicio seleccionado:</p>
                <p className="text-sm font-semibold text-white">{assignTarget.name}</p>
                {assignTarget.description && (
                  <p className="mt-1 text-xs text-gray-400">{assignTarget.description}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center gap-3 border-t border-gray-800 pt-4">
              <button
                onClick={() => void handleAssignSubmit()}
                disabled={saving || !assignTarget || !assignPatient}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Asignar ejercicio
              </button>

              {assignMessage && (
                <p className="text-sm text-gray-300">{assignMessage}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
