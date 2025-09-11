import React, { useEffect, useMemo, useState } from 'react';
import { X, Link as LinkIcon, Copy, ListChecks } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

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
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('patient_registration_tokens')
        .insert({
          token,
          doctor_id: user!.id,
          clinic_id: profile!.clinic_id as string,
          selected_scale_ids: selectedScaleIds.length ? selectedScaleIds : null,
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


