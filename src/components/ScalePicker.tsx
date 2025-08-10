import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ExternalLink, Plus, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ScaleRow = {
  id: string;
  name: string;
  description?: string | null;
  functions?: string[] | null;
  specialties?: string[] | null;
  anatomy_systems?: string[] | null;
  tags?: string[] | null;
};

interface ScalePickerProps {
  patientId: string;
  doctorId: string;
  consultationId?: string | null;
  onAddScale?: (scale: { id: string; name: string }) => void;
}

export default function ScalePicker({ patientId, doctorId, consultationId, onAddScale }: ScalePickerProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<{ function?: string; specialty?: string; anatomy?: string }>({});
  const [scales, setScales] = useState<ScaleRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('medical_scales')
          .select('id, name, description, functions, specialties, anatomy_systems, tags')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setScales(data || []);
      } catch (e) {
        console.error('Error loading scales', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = scales.filter(s => {
      const matchesText = !q || s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.functions || []).some(f => (f || '').toLowerCase().includes(q)) ||
        (s.specialties || []).some(sp => (sp || '').toLowerCase().includes(q)) ||
        (s.anatomy_systems || []).some(an => (an || '').toLowerCase().includes(q)) ||
        (s.tags || []).some(t => (t || '').toLowerCase().includes(q));
      return matchesText;
    });
    if (filters.function) out = out.filter(s => (s.functions || []).includes(filters.function!));
    if (filters.specialty) out = out.filter(s => (s.specialties || []).includes(filters.specialty!));
    if (filters.anatomy) out = out.filter(s => (s.anatomy_systems || []).includes(filters.anatomy!));
    return out;
  }, [query, scales, filters]);

  const handleOpenCapture = (scaleId: string) => {
    // Map known routes
    let path = `/escalas/${scaleId}`;
    if (scaleId === 'barthel') path = '/escalas/barthel';
    if (scaleId === 'boston_carpal_tunnel') path = '/escalas/boston';
    const params: string[] = [];
    if (patientId) params.push(`patient=${encodeURIComponent(patientId)}`);
    if (consultationId) params.push(`consulta=${encodeURIComponent(consultationId)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    navigate(`${path}${qs}`);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center mb-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-gray-700 text-white border border-gray-600 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            placeholder="Buscar por nombre, función, especialidad..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
          value={filters.function || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, function: e.target.value || undefined }))}
        >
          <option value="">Función</option>
          <option value="functional_independence">Independencia funcional</option>
          <option value="pain">Dolor</option>
          <option value="function">Función</option>
          <option value="osteoarthritis">Osteoartritis</option>
          <option value="symptoms">Síntomas</option>
        </select>
        <select
          className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
          value={filters.specialty || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value || undefined }))}
        >
          <option value="">Especialidad</option>
          <option value="general_medicine">Medicina General</option>
          <option value="primary_care">Atención Primaria</option>
          <option value="rehabilitation">Rehabilitación</option>
          <option value="geriatrics">Geriatría</option>
          <option value="orthopedics">Ortopedia</option>
          <option value="neurology">Neurología</option>
        </select>
        <select
          className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
          value={filters.anatomy || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, anatomy: e.target.value || undefined }))}
        >
          <option value="">Sistema anatómico</option>
          <option value="global">Global</option>
          <option value="knee">Rodilla</option>
          <option value="lower_limb">Miembro inferior</option>
          <option value="hand">Mano</option>
          <option value="wrist">Muñeca</option>
          <option value="upper_limb">Miembro superior</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Cargando escalas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {filtered.map(s => (
            <div key={s.id} className="bg-gray-700 rounded p-3 border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="text-white font-medium flex items-center">
                  <Activity className="h-4 w-4 text-cyan-400 mr-2" /> {s.name}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center"
                    onClick={() => handleOpenCapture(s.id)}
                    title="Abrir captura"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                  </button>
                  {onAddScale && (
                    <button
                      type="button"
                      className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center"
                      onClick={() => onAddScale({ id: s.id, name: s.name })}
                      title="Agregar a consulta"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar
                    </button>
                  )}
                </div>
              </div>
              {s.description && (
                <p className="text-xs text-gray-300 mt-1 line-clamp-2">{s.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-300">
                {(s.functions || []).map(f => <span key={f} className="px-2 py-0.5 bg-gray-800 rounded border border-gray-600">{f}</span>)}
                {(s.specialties || []).map(sp => <span key={sp} className="px-2 py-0.5 bg-gray-800 rounded border border-gray-600">{sp}</span>)}
                {(s.anatomy_systems || []).map(an => <span key={an} className="px-2 py-0.5 bg-gray-800 rounded border border-gray-600">{an}</span>)}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-400">No se encontraron escalas con los filtros actuales.</div>
          )}
        </div>
      )}
    </div>
  );
}


