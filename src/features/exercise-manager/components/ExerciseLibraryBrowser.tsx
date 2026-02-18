import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type {
  Difficulty,
  ExerciseFilters,
  ExerciseWithTaxonomy,
  TaxonomyGroup,
  TaxonomyTerm,
} from '../types';
import ExerciseCard from './ExerciseCard';
import ExerciseDetailModal from './ExerciseDetailModal';
import TaxonomyFilterPanel from './TaxonomyFilterPanel';

interface Props {
  exercises: ExerciseWithTaxonomy[];
  groups: TaxonomyGroup[];
  termMap: Map<string, TaxonomyTerm>;
  filterExercises: (filters: ExerciseFilters, termMap: Map<string, TaxonomyTerm>) => ExerciseWithTaxonomy[];
  onAssign: (exercise: ExerciseWithTaxonomy) => void;
  onEdit: (exercise: ExerciseWithTaxonomy) => void;
}

export default function ExerciseLibraryBrowser({
  exercises,
  groups,
  termMap,
  filterExercises,
  onAssign,
  onEdit,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedTermIds, setSelectedTermIds] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithTaxonomy | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const filters: ExerciseFilters = useMemo(
    () => ({ search, selectedTermIds, difficulty }),
    [search, selectedTermIds, difficulty],
  );

  const filtered = useMemo(
    () => filterExercises(filters, termMap),
    [filterExercises, filters, termMap],
  );

  const handleToggleTerm = useCallback((termId: string) => {
    setSelectedTermIds((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTermIds(new Set());
    setDifficulty(null);
    setSearch('');
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: search + difficulty + toggle filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, técnica, región..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 focus:border-cyan-600 focus:outline-none"
          />
        </div>

        {/* Difficulty quick filter */}
        <div className="flex gap-1">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                difficulty === d
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {{ easy: 'Fácil', medium: 'Media', hard: 'Difícil' }[d]}
            </button>
          ))}
        </div>

        {/* Toggle filter panel */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white lg:hidden"
        >
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      {/* Main content: filters + grid */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Filter panel */}
        {showFilters && (
          <TaxonomyFilterPanel
            groups={groups}
            selectedTermIds={selectedTermIds}
            onToggleTerm={handleToggleTerm}
            onClearAll={handleClearAll}
          />
        )}

        {/* Exercise grid */}
        <div className="flex-1">
          <p className="mb-3 text-xs text-gray-500">
            {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''} encontrado
            {filtered.length !== 1 ? 's' : ''}
            {filtered.length !== exercises.length && ` de ${exercises.length}`}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center text-sm text-gray-400">
              No se encontraron ejercicios con los filtros actuales.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  termMap={termMap}
                  onClick={() => setSelectedExercise(ex)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          termMap={termMap}
          groups={groups}
          onClose={() => setSelectedExercise(null)}
          onAssign={() => {
            onAssign(selectedExercise);
            setSelectedExercise(null);
          }}
          onEdit={() => {
            onEdit(selectedExercise);
            setSelectedExercise(null);
          }}
        />
      )}
    </div>
  );
}
