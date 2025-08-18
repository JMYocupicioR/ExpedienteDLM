import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ScaleStepper from '@/components/ScaleStepper';

type TokenRow = {
  id: string;
  token: string;
  doctor_id: string;
  clinic_id: string;
  selected_scale_ids: string[] | null;
  expires_at: string;
  status: string;
  created_at: string;
  doctor?: { full_name: string | null } | null;
  clinic?: { name: string } | null;
};

type PersonalInfo = {
  full_name: string;
  birth_date: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Pathological = {
  chronic_diseases: string[];
  current_treatments: string[];
  surgeries: string[];
  fractures: string[];
  previous_hospitalizations: string[];
  substance_use: Record<string, unknown>;
};

type NonPathological = {
  handedness: string;
  religion: string;
  marital_status: string;
  education_level: string;
  diet: string;
  personal_hygiene: string;
  vaccination_history: string[];
};

type ScaleDefinition = {
  items?: Array<{ id: string; text: string; type: 'select'; options: Array<{ label: string; value: number | string }> }>
  scoring?: { average?: boolean; ranges?: Array<{ min: number; max: number; severity: string }> }
}

export default function PatientPublicRegistration() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null);
  const [step, setStep] = useState(1);

  const [personal, setPersonal] = useState<PersonalInfo>({ full_name: '', birth_date: '', gender: 'unspecified', email: '', phone: '', address: '' });
  const [pathological, setPathological] = useState<Pathological>({ chronic_diseases: [], current_treatments: [], surgeries: [], fractures: [], previous_hospitalizations: [], substance_use: {} });
  const [nonPathological, setNonPathological] = useState<NonPathological>({ handedness: 'right', religion: '', marital_status: '', education_level: '', diet: '', personal_hygiene: '', vaccination_history: [] });
  const [scaleDefs, setScaleDefs] = useState<Record<string, { name: string; definition: ScaleDefinition }>>({});
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, { answers: Record<string, unknown>; score: number | null; severity: string | null }>>({});
  const [activeScaleId, setActiveScaleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('patient_registration_tokens')
          .select('id, token, doctor_id, clinic_id, selected_scale_ids, expires_at, status, created_at, doctor:profiles(full_name), clinic:clinics(name)')
          .eq('token', token)
          .single();
        if (error) throw error;

        const isExpired = new Date(data.expires_at).getTime() < Date.now();
        if (data.status !== 'pending' || isExpired) {
          setError('Este enlace no es válido o ha expirado.');
          setTokenRow(null);
          return;
        }
        setTokenRow(data as unknown as TokenRow);

        const scaleIds = (data.selected_scale_ids || []) as string[];
        if (scaleIds.length > 0) {
          const { data: defs, error: err2 } = await supabase
            .from('medical_scales')
            .select('id, name, definition')
            .in('id', scaleIds)
            .eq('is_active', true);
          if (err2) throw err2;
          const map: Record<string, { name: string; definition: ScaleDefinition }> = {};
          (defs || []).forEach((row: any) => { map[row.id] = { name: row.name, definition: row.definition as ScaleDefinition }; });
          setScaleDefs(map);
        }
      } catch (e: any) {
        console.error('Error validating token', e);
        setError('No se pudo validar el enlace.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const welcome = useMemo(() => {
    if (!tokenRow) return '';
    const doc = tokenRow.doctor?.full_name || 'tu médico';
    const clinic = tokenRow.clinic?.name || 'tu clínica';
    return `Bienvenido(a). Este registro será entregado a ${doc} en ${clinic}.`;
  }, [tokenRow]);

  const handleScaleComplete = (scaleId: string, payload: { answers: Record<string, unknown>; score: number | null; severity: string | null }) => {
    setScaleAnswers(prev => ({ ...prev, [scaleId]: payload }));
    setActiveScaleId(null);
  };

  const handleSubmit = async () => {
    if (!tokenRow) return;
    try {
      setSubmitting(true);
      setError(null);
      const body = {
        token: tokenRow.token,
        personal,
        pathological,
        nonPathological,
        scales: scaleAnswers,
      };
      const { data, error } = await supabase.functions.invoke('complete-patient-registration', { body });
      if (error) throw new Error(error.message || 'Error al completar registro');
      setSubmitted(true);
    } catch (e: any) {
      console.error('Error submit', e);
      setError(e?.message || 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !tokenRow) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-6 text-center max-w-md">
          <h1 className="text-white text-lg font-semibold mb-2">Enlace inválido</h1>
          <p className="text-gray-300 text-sm">{error || 'El enlace no es válido.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-6 text-center max-w-md">
          <h1 className="text-white text-lg font-semibold mb-2">Registro enviado</h1>
          <p className="text-gray-300 text-sm">Gracias. Tu información fue enviada correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
          <h1 className="text-white text-xl font-semibold mb-1">Registro de paciente</h1>
          <p className="text-gray-300 text-sm">{welcome}</p>
        </div>

        {/* Stepper header */}
        <div className="flex items-center space-x-2 mb-4">
          {[1,2,3].map(n => (
            <div key={n} className={`px-3 py-1 rounded ${step === n ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-300'}`}>Paso {n}</div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Nombre completo</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.full_name} onChange={e => setPersonal(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Fecha de nacimiento</label>
                <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.birth_date} onChange={e => setPersonal(p => ({ ...p, birth_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Género</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))}>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="unspecified">Prefiero no decir</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Correo</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.email || ''} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Teléfono</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.phone || ''} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Dirección</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={personal.address || ''} onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded" onClick={() => setStep(2)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Enfermedades crónicas</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Separar por coma" value={pathological.chronic_diseases.join(', ')} onChange={e => setPathological(v => ({ ...v, chronic_diseases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Tratamientos actuales</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Separar por coma" value={pathological.current_treatments.join(', ')} onChange={e => setPathological(v => ({ ...v, current_treatments: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Cirugías</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Separar por coma" value={pathological.surgeries.join(', ')} onChange={e => setPathological(v => ({ ...v, surgeries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
              <div>
                <label className="text-sm text-gray-300">Fracturas</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Separar por coma" value={pathological.fractures.join(', ')} onChange={e => setPathological(v => ({ ...v, fractures: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Hospitalizaciones previas</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Separar por coma" value={pathological.previous_hospitalizations.join(', ')} onChange={e => setPathological(v => ({ ...v, previous_hospitalizations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button className="px-3 py-2 bg-gray-700 text-white rounded" onClick={() => setStep(1)}>Atrás</button>
              <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded" onClick={() => setStep(3)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
            {(tokenRow.selected_scale_ids || []).length === 0 && (
              <div className="text-gray-300 text-sm">No hay escalas para completar. Puedes enviar el formulario.</div>
            )}
            <div className="space-y-2">
              {(tokenRow.selected_scale_ids || []).map((sid: string) => {
                const answered = Boolean(scaleAnswers[sid]);
                return (
                  <div key={sid} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded p-3">
                    <div className="text-sm text-gray-200">
                      {scaleDefs[sid]?.name || sid}
                      {answered && <span className="ml-2 text-xs text-green-400">Completada</span>}
                    </div>
                    <button
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
                      onClick={() => setActiveScaleId(sid)}
                    >
                      {answered ? 'Revisar' : 'Responder'}
                    </button>
                  </div>
                );
              })}
            </div>

            {activeScaleId && (
              <ScaleStepper
                isOpen={true}
                onClose={() => setActiveScaleId(null)}
                scaleId={activeScaleId}
                scaleName={scaleDefs[activeScaleId]?.name || activeScaleId}
                definition={scaleDefs[activeScaleId]?.definition || { items: [] }}
                initialAnswers={scaleAnswers[activeScaleId]?.answers}
                onComplete={(payload) => handleScaleComplete(activeScaleId, payload)}
              />
            )}

            <div className="flex items-center justify-between">
              <button className="px-3 py-2 bg-gray-700 text-white rounded" onClick={() => setStep(2)}>Atrás</button>
              <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar registro'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


