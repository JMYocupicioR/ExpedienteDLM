import { useState, useEffect } from 'react';
import { Search, Stethoscope } from 'lucide-react';
import DoctorCard from '@/components/DoctorCard';
import { publicDoctorService, type PublicDoctor } from '@/lib/services/publicDoctorService';

const COMMON_SPECIALTIES = [
  'Medicina General',
  'Cardiología',
  'Dermatología',
  'Ginecología',
  'Neurología',
  'Ortopedia',
  'Pediatría',
  'Psiquiatría',
  'Reumatología',
  'Traumatología',
];

export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    publicDoctorService
      .searchDoctors({
        query: query.trim() || undefined,
        specialty: specialty || undefined,
        language: language.trim() || undefined,
      })
      .then(setDoctors)
      .catch((err) => {
        setError(err.message || 'Error al buscar médicos');
        setDoctors([]);
      })
      .finally(() => setLoading(false));
  }, [query, specialty, language]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Stethoscope className="h-7 w-7 text-cyan-400" />
            Buscar médicos
          </h1>
          <p className="mt-2 text-slate-400">
            Encuentra médicos por especialidad, nombre o idioma y agenda tu cita.
          </p>
        </header>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
            >
              <option value="">Todas las especialidades</option>
              {COMMON_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
            >
              <option value="">Idioma</option>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && doctors.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            No se encontraron médicos con los filtros seleccionados.
          </div>
        )}

        {!loading && !error && doctors.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
