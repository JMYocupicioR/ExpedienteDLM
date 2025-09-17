import React, { useEffect, useMemo, useState } from 'react';
import { X, Link as LinkIcon, Copy, ListChecks, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import PatientSelector from '@/components/PatientSelector';

type ScaleRow = {
  id: string;
  name: string;
  description?: string | null;
};

interface GenerateInvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function generateSecureToken(length = 48) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  (window.crypto || (window as any).msCrypto).getRandomValues(array);
  return Array.from(array).map(n => alphabet[n % alphabet.length]).join('');
}

export default function GenerateInvitationLinkModal({ isOpen, onClose }: GenerateInvitationLinkModalProps) {
  const { user, profile } = useAuth();
  const [scales, setScales] = useState<ScaleRow[]>([]);
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const [assignedPatientId, setAssignedPatientId] = useState<string>('');
  const [allowedSections, setAllowedSections] = useState<string[]>(['personal','pathological','non_pathological','hereditary']);
  const [expiryAmount, setExpiryAmount] = useState<number>(72);
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'days'>('hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('medical_scales')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setScales(data || []);
      } catch (e: any) {
        // Error log removed for security;
        setError(e?.message || 'No se pudieron cargar las escalas');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  const toggleScale = (id: string) => {
    setSelectedScaleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSection = (id: string) => {
    setAllowedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canGenerate = useMemo(() => !!user && !!profile?.clinic_id, [user, profile]);

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError('No hay sesión o clínica asociada en el perfil.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const token = generateSecureToken(64);
      const ms = (expiryUnit === 'hours' ? expiryAmount * 60 * 60 * 1000 : expiryAmount * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + ms).toISOString();

      const { data, error } = await supabase
        .from('patient_registration_tokens')
        .insert({
          token,
          doctor_id: user!.id,
          clinic_id: profile!.clinic_id as string,
          selected_scale_ids: selectedScaleIds.length ? selectedScaleIds : null,
          allowed_sections: allowedSections,
          assigned_patient_id: assignedPatientId || null,
          expires_at: expiresAt,
          status: 'pending'
        })
        .select()
        .single();
      if (error) throw error;

      const origin = window.location.origin;
      const link = `${origin}/register/patient/${encodeURIComponent(data.token)}`;
      setResultLink(link);
    } catch (e: any) {
      // Error log removed for security;
      setError(e?.message || 'No se pudo generar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!resultLink) return;
    try {
      await navigator.clipboard.writeText(resultLink);
    } catch (e) {
      // Error log removed for security;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center"><ListChecks className="h-5 w-5 mr-2" /> Generar enlace de registro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {!canGenerate && (
            <div className="text-sm text-red-300">Tu perfil no tiene clínica asociada. Configúrala en Configuración.</div>
          )}
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div>
            <div className="text-gray-300 text-sm mb-2">Asignar a un paciente existente (opcional):</div>
            <div className="bg-gray-800/50 border border-gray-700 rounded p-2">
              <PatientSelector
                selectedPatientId={assignedPatientId}
                onPatientSelect={(p) => setAssignedPatientId(p?.id || '')}
                showRecentPatients={true}
              />
            </div>
            {assignedPatientId && (
              <div className="text-xs text-gray-400 mt-1">Este enlace actualizará los datos del paciente seleccionado.</div>
            )}
          </div>
          <div>
            <div className="text-gray-300 text-sm mb-2">Selecciona las secciones del registro a completar:</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { id: 'personal', label: 'Información personal' },
                { id: 'pathological', label: 'Antecedentes patológicos' },
                { id: 'non_pathological', label: 'Antecedentes no patológicos' },
                { id: 'hereditary', label: 'Antecedentes heredofamiliares' },
              ].map(s => (
                <label key={s.id} className="flex items-center space-x-2 bg-gray-800/60 border border-gray-700 rounded p-2">
                  <input type="checkbox" checked={allowedSections.includes(s.id)} onChange={() => toggleSection(s.id)} />
                  <span className="text-sm text-gray-200">{s.label}</span>
                </label>
              ))}
            </div>
            <div className="text-gray-300 text-sm mb-2">Selecciona las escalas que el paciente debe completar:</div>
            <div className="max-h-64 overflow-auto space-y-2">
              {loading ? (
                <div className="text-gray-400">Cargando escalas...</div>
              ) : scales.length === 0 ? (
                <div className="text-gray-400">No hay escalas activas.</div>
              ) : (
                scales.map(s => (
                  <label key={s.id} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-800">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedScaleIds.includes(s.id)}
                      onChange={() => toggleScale(s.id)}
                    />
                    <div>
                      <div className="text-white text-sm font-medium">{s.name}</div>
                      {s.description && <div className="text-xs text-gray-400">{s.description}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-gray-300 text-sm flex items-center"><Clock className="h-4 w-4 mr-1" /> Vigencia:</span>
            <input
              type="number"
              min={1}
              value={expiryAmount}
              onChange={e => setExpiryAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1"
            />
            <select
              value={expiryUnit}
              onChange={e => setExpiryUnit(e.target.value as 'hours' | 'days')}
              className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1"
            >
              <option value="hours">horas</option>
              <option value="days">días</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              disabled={!canGenerate || loading}
              onClick={handleGenerate}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50 flex items-center"
            >
              <LinkIcon className="h-4 w-4 mr-2" /> Generar Link
            </button>

            {resultLink && (
              <div className="flex items-center space-x-2">
                <input
                  readOnly
                  value={resultLink}
                  className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 w-72"
                />
                <button onClick={handleCopy} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


