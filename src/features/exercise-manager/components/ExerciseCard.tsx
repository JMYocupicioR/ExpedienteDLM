import { Dumbbell, Play } from 'lucide-react';
import type { ExerciseWithTaxonomy, TaxonomyTerm } from '../types';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-700/50 text-green-200',
  medium: 'bg-amber-700/50 text-amber-200',
  hard: 'bg-red-700/50 text-red-200',
};

const difficultyLabels: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

interface Props {
  exercise: ExerciseWithTaxonomy;
  termMap: Map<string, TaxonomyTerm>;
  onClick: () => void;
}

export default function ExerciseCard({ exercise, termMap, onClick }: Props) {
  // Resolve a few taxonomy labels for preview chips
  const techniqueTerms = exercise.taxonomy_term_ids
    .map((id) => termMap.get(id))
    .filter((t): t is TaxonomyTerm => !!t && t.code.startsWith('tech_'))
    .slice(0, 2);

  const segmentTerms = exercise.taxonomy_term_ids
    .map((id) => termMap.get(id))
    .filter((t): t is TaxonomyTerm => !!t && t.code.startsWith('seg_'))
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 text-left transition-all hover:border-cyan-600/60 hover:shadow-lg hover:shadow-cyan-900/20"
    >
      {/* Thumbnail / placeholder */}
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        {exercise.thumbnail_url ? (
          <img
            src={exercise.thumbnail_url}
            alt={exercise.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Dumbbell size={36} className="text-gray-700" />
        )}
        {exercise.media_url && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 p-1.5">
            <Play size={14} className="text-white" />
          </span>
        )}
        {exercise.is_global && (
          <span className="absolute left-2 top-2 rounded bg-cyan-700/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Global
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-sm font-semibold leading-tight text-gray-100 group-hover:text-cyan-300">
          {exercise.name}
        </h3>

        {exercise.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
            {exercise.description}
          </p>
        )}

        {/* Badges */}
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {exercise.difficulty && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${difficultyColors[exercise.difficulty] ?? 'bg-gray-700 text-gray-300'}`}
            >
              {difficultyLabels[exercise.difficulty] ?? exercise.difficulty}
            </span>
          )}
          {techniqueTerms.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-violet-800/40 px-1.5 py-0.5 text-[10px] font-medium text-violet-200"
            >
              {t.label}
            </span>
          ))}
          {segmentTerms.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-blue-800/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-200"
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Meta */}
        <div className="flex gap-3 text-[10px] text-gray-500">
          {exercise.sets && <span>{exercise.sets} series</span>}
          {exercise.repetitions && <span>{exercise.repetitions} reps</span>}
          {exercise.duration_seconds && (
            <span>{Math.round(exercise.duration_seconds / 60)} min</span>
          )}
        </div>
      </div>
    </button>
  );
}
