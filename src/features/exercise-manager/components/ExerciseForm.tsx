import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import type {
  Difficulty,
  ExerciseFormData,
  ExerciseWithTaxonomy,
  MediaType,
  TaxonomyGroup,
} from '../types';
import TaxonomyTagSelect from './TaxonomyTagSelect';

interface Props {
  groups: TaxonomyGroup[];
  exercises: ExerciseWithTaxonomy[];
  saving: boolean;
  onSave: (data: ExerciseFormData, existingId?: string) => void;
  /** If set, form pre-populates with this exercise for editing */
  editExercise?: ExerciseWithTaxonomy | null;
  onCancelEdit?: () => void;
}

const emptyForm: ExerciseFormData = {
  name: '',
  description: '',
  category: '',
  body_area: '',
  difficulty: 'easy',
  media_type: null,
  media_url: '',
  thumbnail_url: '',
  duration_seconds: null,
  repetitions: null,
  sets: null,
  instructions: [''],
  is_global: false,
  taxonomy_term_ids: [],
};

export default function ExerciseForm({
  groups,
  exercises,
  saving,
  onSave,
  editExercise,
  onCancelEdit,
}: Props) {
  const [form, setForm] = useState<ExerciseFormData>(emptyForm);
  const [selectedId, setSelectedId] = useState<string>('');

  // When editExercise changes externally (e.g. from browser modal)
  useEffect(() => {
    if (editExercise) {
      let parsedInstructions: string[] = [''];
      if (editExercise.instructions) {
        try {
          const parsed =
            typeof editExercise.instructions === 'string'
              ? JSON.parse(editExercise.instructions as unknown as string)
              : editExercise.instructions;
          if (Array.isArray(parsed)) parsedInstructions = parsed;
        } catch {
          // ignore
        }
      }

      setForm({
        name: editExercise.name,
        description: editExercise.description ?? '',
        category: editExercise.category,
        body_area: editExercise.body_area ?? '',
        difficulty: editExercise.difficulty ?? 'easy',
        media_type: editExercise.media_type ?? null,
        media_url: editExercise.media_url ?? '',
        thumbnail_url: editExercise.thumbnail_url ?? '',
        duration_seconds: editExercise.duration_seconds,
        repetitions: editExercise.repetitions,
        sets: editExercise.sets,
        instructions: parsedInstructions.length > 0 ? parsedInstructions : [''],
        is_global: editExercise.is_global,
        taxonomy_term_ids: editExercise.taxonomy_term_ids,
      });
      setSelectedId(editExercise.id);
    }
  }, [editExercise]);

  // Load exercise from dropdown
  const handleSelectExercise = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!id) {
        setForm(emptyForm);
        return;
      }
      const ex = exercises.find((e) => e.id === id);
      if (!ex) return;

      let parsedInstructions: string[] = [''];
      if (ex.instructions) {
        try {
          const parsed =
            typeof ex.instructions === 'string'
              ? JSON.parse(ex.instructions as unknown as string)
              : ex.instructions;
          if (Array.isArray(parsed)) parsedInstructions = parsed;
        } catch {
          // ignore
        }
      }

      setForm({
        name: ex.name,
        description: ex.description ?? '',
        category: ex.category,
        body_area: ex.body_area ?? '',
        difficulty: ex.difficulty ?? 'easy',
        media_type: ex.media_type ?? null,
        media_url: ex.media_url ?? '',
        thumbnail_url: ex.thumbnail_url ?? '',
        duration_seconds: ex.duration_seconds,
        repetitions: ex.repetitions,
        sets: ex.sets,
        instructions: parsedInstructions.length > 0 ? parsedInstructions : [''],
        is_global: ex.is_global,
        taxonomy_term_ids: ex.taxonomy_term_ids,
      });
    },
    [exercises],
  );

  const set = useCallback(
    <K extends keyof ExerciseFormData>(key: K, value: ExerciseFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Instructions array management
  const addInstruction = useCallback(() => {
    setForm((prev) => ({ ...prev, instructions: [...prev.instructions, ''] }));
  }, []);

  const updateInstruction = useCallback((idx: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.instructions];
      next[idx] = value;
      return { ...prev, instructions: next };
    });
  }, []);

  const removeInstruction = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Clean empty instructions
      const cleaned = {
        ...form,
        instructions: form.instructions.filter((s) => s.trim() !== ''),
      };
      onSave(cleaned, selectedId || undefined);
    },
    [form, selectedId, onSave],
  );

  const handleNew = useCallback(() => {
    setSelectedId('');
    setForm(emptyForm);
    onCancelEdit?.();
  }, [onCancelEdit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector: new or existing */}
      <div className="flex items-end gap-3">
        <label className="flex-1 text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Seleccionar ejercicio</span>
          <select
            value={selectedId}
            onChange={(e) => handleSelectExercise(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          >
            <option value="">-- Nuevo ejercicio --</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.category})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1 rounded-lg border border-gray-600 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* Grid: basic fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">
            Nombre <span className="text-red-400">*</span>
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="Ej: Williams 1 - Inclinación Pélvica"
          />
        </label>

        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">
            Categoría <span className="text-red-400">*</span>
          </span>
          <input
            required
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="Ej: Williams, McKenzie, Estiramiento..."
          />
        </label>

        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Región corporal</span>
          <input
            value={form.body_area}
            onChange={(e) => set('body_area', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="Ej: Columna Lumbar, Hombro..."
          />
        </label>

        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Dificultad</span>
          <select
            value={form.difficulty}
            onChange={(e) => set('difficulty', e.target.value as Difficulty)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          >
            <option value="easy">Fácil</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
          </select>
        </label>
      </div>

      {/* Parameters */}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Series</span>
          <input
            type="number"
            min={0}
            value={form.sets ?? ''}
            onChange={(e) => set('sets', e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="3"
          />
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Repeticiones</span>
          <input
            type="number"
            min={0}
            value={form.repetitions ?? ''}
            onChange={(e) => set('repetitions', e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="10"
          />
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Duración (min)</span>
          <input
            type="number"
            min={0}
            value={form.duration_seconds ? Math.round(form.duration_seconds / 60) : ''}
            onChange={(e) =>
              set('duration_seconds', e.target.value ? Number(e.target.value) * 60 : null)
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="5"
          />
        </label>
      </div>

      {/* Description */}
      <label className="block text-sm text-gray-300">
        <span className="mb-1 block text-xs font-medium text-gray-400">Descripción</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          placeholder="Breve descripción del ejercicio..."
        />
      </label>

      {/* Instructions (step by step) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Instrucciones paso a paso</span>
          <button
            type="button"
            onClick={addInstruction}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <Plus size={12} /> Agregar paso
          </button>
        </div>
        <div className="space-y-2">
          {form.instructions.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-bold text-gray-400">
                {idx + 1}
              </span>
              <input
                value={step}
                onChange={(e) => updateInstruction(idx, e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm focus:border-cyan-600 focus:outline-none"
                placeholder={`Paso ${idx + 1}...`}
              />
              {form.instructions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstruction(idx)}
                  className="mt-1 p-1 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Media */}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">Tipo de media</span>
          <select
            value={form.media_type ?? ''}
            onChange={(e) => set('media_type', (e.target.value || null) as MediaType | null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          >
            <option value="">Ninguno</option>
            <option value="video">Video</option>
            <option value="image">Imagen</option>
            <option value="gif">GIF</option>
          </select>
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">URL de media</span>
          <input
            value={form.media_url}
            onChange={(e) => set('media_url', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="https://youtube.com/embed/..."
          />
        </label>
        <label className="text-sm text-gray-300">
          <span className="mb-1 block text-xs font-medium text-gray-400">URL de miniatura</span>
          <input
            value={form.thumbnail_url}
            onChange={(e) => set('thumbnail_url', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none"
            placeholder="https://..."
          />
        </label>
      </div>

      {/* Taxonomy multi-select */}
      <TaxonomyTagSelect
        groups={groups}
        selectedTermIds={form.taxonomy_term_ids}
        onChange={(ids) => set('taxonomy_term_ids', ids)}
      />

      {/* Global toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={form.is_global}
          onChange={(e) => set('is_global', e.target.checked)}
          className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-cyan-600 focus:ring-cyan-600"
        />
        <span>
          Hacer público este ejercicio{' '}
          <span className="text-xs text-gray-500">(visible para todos los profesionales)</span>
        </span>
      </label>

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-gray-800 pt-4">
        <button
          type="submit"
          disabled={saving || !form.name.trim() || !form.category.trim()}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {selectedId ? 'Guardar cambios' : 'Crear ejercicio'}
        </button>
        {selectedId && (
          <button
            type="button"
            onClick={handleNew}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancelar edición
          </button>
        )}
      </div>
    </form>
  );
}
