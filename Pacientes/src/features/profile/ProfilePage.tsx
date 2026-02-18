import { usePatientAuth } from '@/context/PatientAuthContext';
import { clearPatientDebugLogs, getPatientDebugLogs, isPatientDebugEnabled, patientLog, setPatientDebugEnabled } from '@/lib/patientDebugLogger';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type PathologicalHistory = {
  chronic_diseases: string[];
  current_treatments: string[];
  surgeries: string[];
  fractures: string[];
  previous_hospitalizations: string[];
};

type NonPathologicalHistory = {
  handedness: string;
  religion: string;
  marital_status: string;
  education_level: string;
  diet: string;
  personal_hygiene: string;
  vaccination_history: string[];
};

type HereditaryBackground = {
  id: string;
  relationship: string;
  condition: string;
  notes: string | null;
};

export default function ProfilePage() {
  const { profile, refreshProfile, profileLoading, authError } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathological, setPathological] = useState<PathologicalHistory | null>(null);
  const [nonPathological, setNonPathological] = useState<NonPathologicalHistory | null>(null);
  const [hereditary, setHereditary] = useState<HereditaryBackground[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(isPatientDebugEnabled());

  const loadData = async () => {
    setError(null);
    patientLog('info', 'profile.page.load.start', { patientId: profile?.id || null });

    try {
      if (!profile?.id) {
        patientLog('warn', 'profile.page.load.skipped_no_profile');
        setLoading(false);
        return;
      }

      setLoading(true);

      const [pathologicalRes, nonPathologicalRes, hereditaryRes] = await Promise.all([
        supabase.from('pathological_histories').select('*').eq('patient_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('non_pathological_histories').select('*').eq('patient_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hereditary_backgrounds').select('*').eq('patient_id', profile.id).order('created_at', { ascending: false }).limit(20),
      ]);

      if (pathologicalRes.error) {
        patientLog('error', 'profile.page.pathological.error', { patientId: profile.id, message: pathologicalRes.error.message });
      }
      if (nonPathologicalRes.error) {
        patientLog('error', 'profile.page.non_pathological.error', { patientId: profile.id, message: nonPathologicalRes.error.message });
      }
      if (hereditaryRes.error) {
        patientLog('error', 'profile.page.hereditary.error', { patientId: profile.id, message: hereditaryRes.error.message });
      }

      setPathological((pathologicalRes.data as PathologicalHistory | null) || null);
      setNonPathological((nonPathologicalRes.data as NonPathologicalHistory | null) || null);
      setHereditary((hereditaryRes.data as HereditaryBackground[]) || []);
      setLastSyncAt(new Date().toISOString());
      patientLog('info', 'profile.page.load.success', {
        patientId: profile.id,
        hasPathological: !!pathologicalRes.data,
        hasNonPathological: !!nonPathologicalRes.data,
        hereditaryCount: hereditaryRes.data?.length || 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cargar tu perfil.';
      setError(message);
      patientLog('error', 'profile.page.load.unhandled_error', { message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [profile?.id]);

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando perfil...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">Mi perfil</h1>
          <button
            onClick={() => {
              void refreshProfile();
              void loadData();
            }}
            disabled={profileLoading || loading}
            className="rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800 disabled:opacity-60"
          >
            {profileLoading || loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
        {lastSyncAt ? (
          <p className="mt-2 text-xs text-slate-500">Ultima sincronizacion: {new Date(lastSyncAt).toLocaleString()}</p>
        ) : null}
        {authError ? <p className="mt-2 text-xs text-amber-300">{authError}</p> : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        <p className="mt-2 text-sm text-slate-300">Nombre: {profile?.full_name || 'No disponible'}</p>
        <p className="text-sm text-slate-300">Correo: {profile?.email || 'No disponible'}</p>
        <p className="text-sm text-slate-300">Telefono: {profile?.phone || 'No disponible'}</p>
        <p className="text-sm text-slate-300">Fecha de nacimiento: {profile?.birth_date || 'No disponible'}</p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Antecedentes patologicos</h2>
        {!pathological ? (
          <p className="mt-2 text-sm text-slate-400">Sin informacion registrada.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>Enfermedades cronicas: {(pathological.chronic_diseases || []).join(', ') || 'N/A'}</li>
            <li>Tratamientos actuales: {(pathological.current_treatments || []).join(', ') || 'N/A'}</li>
            <li>Cirugias: {(pathological.surgeries || []).join(', ') || 'N/A'}</li>
            <li>Fracturas: {(pathological.fractures || []).join(', ') || 'N/A'}</li>
            <li>Hospitalizaciones: {(pathological.previous_hospitalizations || []).join(', ') || 'N/A'}</li>
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Antecedentes no patologicos</h2>
        {!nonPathological ? (
          <p className="mt-2 text-sm text-slate-400">Sin informacion registrada.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>Lateralidad: {nonPathological.handedness || 'N/A'}</li>
            <li>Religion: {nonPathological.religion || 'N/A'}</li>
            <li>Estado civil: {nonPathological.marital_status || 'N/A'}</li>
            <li>Nivel educativo: {nonPathological.education_level || 'N/A'}</li>
            <li>Dieta: {nonPathological.diet || 'N/A'}</li>
            <li>Vacunacion: {(nonPathological.vaccination_history || []).join(', ') || 'N/A'}</li>
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-semibold">Antecedentes heredofamiliares</h2>
        {hereditary.length === 0 ? <p className="mt-2 text-sm text-slate-400">Sin registros.</p> : null}
        <div className="mt-2 space-y-2">
          {hereditary.map((item) => (
            <article key={item.id} className="rounded border border-slate-700 p-3 text-sm">
              <p className="font-medium">
                {item.relationship}: {item.condition}
              </p>
              {item.notes ? <p className="text-slate-400">{item.notes}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Diagnostico de perfil</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !debugEnabled;
                setDebugEnabled(next);
                setPatientDebugEnabled(next);
              }}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              {debugEnabled ? 'Logs ON' : 'Logs OFF'}
            </button>
            <button
              type="button"
              onClick={() => setShowLogs((prev) => !prev)}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              {showLogs ? 'Ocultar logs' : 'Ver logs'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearPatientDebugLogs();
                patientLog('info', 'profile.debug.logs_cleared');
              }}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              Limpiar logs
            </button>
          </div>
        </div>
        {showLogs ? (
          <div className="mt-3 max-h-56 space-y-2 overflow-auto rounded border border-slate-800 bg-slate-950 p-2">
            {getPatientDebugLogs().length === 0 ? (
              <p className="text-xs text-slate-400">Sin logs por el momento.</p>
            ) : (
              getPatientDebugLogs()
                .slice()
                .reverse()
                .slice(0, 40)
                .map((entry) => (
                  <div key={entry.id} className="rounded border border-slate-800 p-2 text-xs">
                    <p className="text-slate-300">
                      [{entry.level.toUpperCase()}] {new Date(entry.ts).toLocaleTimeString()} - {entry.event}
                    </p>
                    {entry.details ? <pre className="mt-1 overflow-x-auto text-slate-500">{JSON.stringify(entry.details, null, 2)}</pre> : null}
                  </div>
                ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
