import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import type {
  AssignmentPayload,
  Exercise,
  ExerciseFilters,
  ExerciseFormData,
  ExerciseWithTaxonomy,
  Patient,
  TaxonomyTerm,
} from '../types';

// ── helpers ────────────────────────────────────────────────────

/** Fetch taxonomy links for a list of exercise ids */
async function fetchTaxonomyLinks(exerciseIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (exerciseIds.length === 0) return map;

  const { data } = await supabase
    .from('exercise_taxonomy_links')
    .select('exercise_id, term_id')
    .in('exercise_id', exerciseIds);

  if (data) {
    for (const row of data as { exercise_id: string; term_id: string }[]) {
      const arr = map.get(row.exercise_id) ?? [];
      arr.push(row.term_id);
      map.set(row.exercise_id, arr);
    }
  }
  return map;
}

/** Merge exercises + taxonomy links */
function mergeWithTaxonomy(
  exercises: Exercise[],
  linkMap: Map<string, string[]>,
): ExerciseWithTaxonomy[] {
  return exercises.map((e) => ({
    ...e,
    taxonomy_term_ids: linkMap.get(e.id) ?? [],
  }));
}

// ── Main hook ──────────────────────────────────────────────────

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<ExerciseWithTaxonomy[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load all exercises + patients ──────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: exRows, error: exErr }, { data: patRows }] = await Promise.all([
      supabase
        .from('exercise_library')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('patients')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name'),
    ]);

    if (exErr) {
      setError(exErr.message);
      setLoading(false);
      return;
    }

    const rawExercises = (exRows ?? []) as unknown as Exercise[];
    const linkMap = await fetchTaxonomyLinks(rawExercises.map((e) => e.id));
    setExercises(mergeWithTaxonomy(rawExercises, linkMap));
    setPatients((patRows ?? []) as Patient[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ── Filter client-side ─────────────────────────────────────

  const filterExercises = useCallback(
    (filters: ExerciseFilters, termMap: Map<string, TaxonomyTerm>): ExerciseWithTaxonomy[] => {
      return exercises.filter((ex) => {
        // text search
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const inName = ex.name.toLowerCase().includes(q);
          const inDesc = ex.description?.toLowerCase().includes(q) ?? false;
          const inCat = ex.category.toLowerCase().includes(q);
          const inBody = ex.body_area?.toLowerCase().includes(q) ?? false;
          if (!inName && !inDesc && !inCat && !inBody) return false;
        }

        // difficulty
        if (filters.difficulty && ex.difficulty !== filters.difficulty) return false;

        // taxonomy: OR within same type, AND across types
        if (filters.selectedTermIds.size > 0) {
          // group selected ids by type_id
          const byType = new Map<string, string[]>();
          Array.from(filters.selectedTermIds).forEach((tid) => {
            const term = termMap.get(tid);
            if (!term) return;
            const arr = byType.get(term.type_id) ?? [];
            arr.push(tid);
            byType.set(term.type_id, arr);
          });

          const typeEntries = Array.from(byType.entries());
          for (let i = 0; i < typeEntries.length; i++) {
            const termIds = typeEntries[i][1];
            // exercise must match at least one term in this type
            const hasMatch = termIds.some((tid) => ex.taxonomy_term_ids.includes(tid));
            if (!hasMatch) return false;
          }
        }

        return true;
      });
    },
    [exercises],
  );

  // ── Create exercise ────────────────────────────────────────

  const createExercise = useCallback(async (formData: ExerciseFormData) => {
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('No autenticado');
      setSaving(false);
      return null;
    }

    const { taxonomy_term_ids, ...rest } = formData;

    const { data: inserted, error: insertErr } = await supabase
      .from('exercise_library')
      .insert({
        ...rest,
        instructions: JSON.stringify(rest.instructions),
        doctor_id: formData.is_global ? null : user.id,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      setError(insertErr?.message ?? 'Error creando ejercicio');
      setSaving(false);
      return null;
    }

    const exerciseId = (inserted as { id: string }).id;

    // insert taxonomy links
    if (taxonomy_term_ids.length > 0) {
      await supabase.from('exercise_taxonomy_links').insert(
        taxonomy_term_ids.map((term_id) => ({ exercise_id: exerciseId, term_id })),
      );
    }

    setSaving(false);
    return exerciseId;
  }, []);

  // ── Update exercise ────────────────────────────────────────

  const updateExercise = useCallback(async (id: string, formData: ExerciseFormData) => {
    setSaving(true);
    setError(null);

    const { taxonomy_term_ids, ...rest } = formData;

    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateErr } = await supabase
      .from('exercise_library')
      .update({
        ...rest,
        instructions: JSON.stringify(rest.instructions),
        doctor_id: formData.is_global ? null : (user?.id ?? null),
      })
      .eq('id', id);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return false;
    }

    // replace taxonomy links
    await supabase.from('exercise_taxonomy_links').delete().eq('exercise_id', id);
    if (taxonomy_term_ids.length > 0) {
      await supabase.from('exercise_taxonomy_links').insert(
        taxonomy_term_ids.map((term_id) => ({ exercise_id: id, term_id })),
      );
    }

    setSaving(false);
    return true;
  }, []);

  // ── Assign exercise to patient ─────────────────────────────

  const assignExercise = useCallback(async (payload: AssignmentPayload) => {
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('No autenticado');
      setSaving(false);
      return false;
    }

    const { error: insertErr } = await supabase.from('patient_exercise_assignments').insert({
      patient_id: payload.patient_id,
      doctor_id: user.id,
      exercise_id: payload.exercise_id,
      frequency: payload.frequency,
      sets: payload.sets,
      repetitions: payload.repetitions,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      notes: payload.notes || null,
      status: 'active',
    });

    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return false;
    }

    // Try to sync patient tasks
    try {
      const { data: latest } = await supabase
        .from('patient_exercise_assignments')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        await supabase.functions.invoke('sync-patient-tasks', {
          body: { assignment_id: (latest as { id: string }).id },
        });
      }
    } catch {
      // non-blocking
    }

    setSaving(false);
    return true;
  }, []);

  return {
    exercises,
    patients,
    loading,
    saving,
    error,
    reload: loadAll,
    filterExercises,
    createExercise,
    updateExercise,
    assignExercise,
  };
}
