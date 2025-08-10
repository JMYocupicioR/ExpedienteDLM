import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, ListChecks, FileText, Plus, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ScaleRow = {
  id: string;
  name: string;
  specialty?: string | null;
  category?: string | null;
  description?: string | null;
  functions?: string[] | null;
  specialties?: string[] | null;
  anatomy_systems?: string[] | null;
  tags?: string[] | null;
};

export default function MedicalScales() {
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
          .select('id, name, specialty, category, description, functions, specialties, anatomy_systems, tags')
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
        (s.specialty || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.functions || []).some(f => (f || '').toLowerCase().includes(q)) ||
        (s.specialties || []).some(sp => (sp || '').toLowerCase().includes(q)) ||
        (s.anatomy_systems || []).some(an => (an || '').toLowerCase().includes(q)) ||
        (s.tags || []).some(t => (t || '').toLowerCase().includes(q));
      return matchesText;
    });
    if (filters.function) {
      out = out.filter(s => (s.functions || []).includes(filters.function!));
    }
    if (filters.specialty) {
      out = out.filter(s => (s.specialties || []).includes(filters.specialty!));
    }
    if (filters.anatomy) {
      out = out.filter(s => (s.anatomy_systems || []).includes(filters.anatomy!));
    }
    return out;
  }, [query, scales, filters]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-white flex items-center">
          <Activity className="h-5 w-5 mr-2" /> Escalas médicas
        </h1>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-gray-800 text-white border border-gray-700 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            placeholder="Buscar por nombre, especialidad o categoría..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
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
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
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
          className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(scale => (
            <div key={scale.id} className="bg-gray-800 border border-gray-700 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">{scale.name}</h3>
                {scale.id === 'barthel' && (
                  <span className="text-xs text-green-400 border border-green-700 bg-green-900/20 rounded px-2 py-0.5">Recomendado</span>
                )}
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                {scale.specialty && <div>Especialidad: {scale.specialty}</div>}
                {scale.category && <div>Categoría: {scale.category}</div>}
                {scale.description && <div className="line-clamp-2">{scale.description}</div>}
                {(scale.specialties && scale.specialties.length > 0) && (
                  <div className="text-xs">Especialidades: {scale.specialties.join(', ')}</div>
                )}
                {(scale.functions && scale.functions.length > 0) && (
                  <div className="text-xs">Funciones: {scale.functions.join(', ')}</div>
                )}
                {(scale.anatomy_systems && scale.anatomy_systems.length > 0) && (
                  <div className="text-xs">Anatomía: {scale.anatomy_systems.join(', ')}</div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  className="text-sm px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center"
                  onClick={() => navigate(`/escalas/${scale.id}`)}
                >
                  <ListChecks className="h-4 w-4 mr-1" /> Abrir
                </button>
                <button
                  className="text-sm px-3 py-1.5 text-gray-300 hover:text-white flex items-center"
                  onClick={() => alert('Detalle próximamente')}
                >
                  <Info className="h-4 w-4 mr-1" /> Detalle
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-400">No se encontraron escalas.</div>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <h2 className="text-white font-medium mb-2">Sugerencia</h2>
          <p className="text-sm text-gray-400">
            Comienza con el Índice de Barthel para evaluar independencia funcional. Luego añadiremos WOMAC, Boston CTS y más.
          </p>
        </div>
      </div>
    </div>
  );
}


