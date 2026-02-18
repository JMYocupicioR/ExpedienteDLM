import { Clock, Dumbbell, Repeat, X } from 'lucide-react';
import type { ExerciseWithTaxonomy, TaxonomyGroup, TaxonomyTerm } from '../types';

const difficultyLabels: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

interface Props {
  exercise: ExerciseWithTaxonomy;
  termMap: Map<string, TaxonomyTerm>;
  groups: TaxonomyGroup[];
  onClose: () => void;
  onAssign: () => void;
  onEdit: () => void;
}

export default function ExerciseDetailModal({
  exercise,
  termMap,
  groups,
  onClose,
  onAssign,
  onEdit,
}: Props) {
  // Parse instructions
  let instructions: string[] = [];
  if (exercise.instructions) {
    try {
      const parsed =
        typeof exercise.instructions === 'string'
          ? JSON.parse(exercise.instructions)
          : exercise.instructions;
      if (Array.isArray(parsed)) instructions = parsed;
    } catch {
      // ignore
    }
  }

  // Group taxonomy terms by type for display
  const termsByType: { typeLabel: string; terms: TaxonomyTerm[] }[] = [];
  for (const g of groups) {
    const matched = exercise.taxonomy_term_ids
      .map((id) => termMap.get(id))
      .filter((t): t is TaxonomyTerm => !!t && t.type_id === g.type.id);
    if (matched.length > 0) {
      termsByType.push({ typeLabel: g.type.label, terms: matched });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Media */}
        {exercise.media_url ? (
          <div className="relative aspect-video w-full bg-black">
            {exercise.media_type === 'video' ? (
              <iframe
                src={exercise.media_url}
                className="h-full w-full"
                allowFullScreen
                title={exercise.name}
              />
            ) : (
              <img
                src={exercise.media_url}
                alt={exercise.name}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Dumbbell size={48} className="text-gray-700" />
          </div>
        )}

        <div className="space-y-5 p-5">
          {/* Title + meta */}
          <div>
            <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-gray-400">
              {exercise.difficulty && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5 font-medium">
                  {difficultyLabels[exercise.difficulty] ?? exercise.difficulty}
                </span>
              )}
              {exercise.category && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5">{exercise.category}</span>
              )}
              {exercise.body_area && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5">{exercise.body_area}</span>
              )}
            </div>
          </div>

          {/* Parameters */}
          <div className="flex gap-4 text-sm text-gray-300">
            {exercise.sets && (
              <span className="flex items-center gap-1">
                <Repeat size={14} className="text-cyan-400" /> {exercise.sets} series
              </span>
            )}
            {exercise.repetitions && (
              <span className="flex items-center gap-1">
                <Dumbbell size={14} className="text-cyan-400" /> {exercise.repetitions} reps
              </span>
            )}
            {exercise.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-cyan-400" />{' '}
                {Math.round(exercise.duration_seconds / 60)} min
              </span>
            )}
          </div>

          {/* Description */}
          {exercise.description && (
            <p className="text-sm leading-relaxed text-gray-300">{exercise.description}</p>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-200">Instrucciones</h3>
              <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-300">
                {instructions.map((step, i) => (
                  <li key={i} className="pl-1">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Taxonomy chips */}
          {termsByType.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200">Clasificación</h3>
              {termsByType.map(({ typeLabel, terms }) => (
                <div key={typeLabel}>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {typeLabel}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {terms.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full bg-cyan-800/30 px-2 py-0.5 text-[11px] font-medium text-cyan-200"
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-gray-800 pt-4">
            <button
              onClick={onAssign}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
            >
              Asignar a paciente
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              Editar ejercicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
