import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import type { TaxonomyGroup, TaxonomyTerm, TaxonomyType } from '../types';

/**
 * Loads all taxonomy types + terms and groups them for the UI.
 * Returns a stable `groups` array and a `termMap` for O(1) lookup.
 */
export function useTaxonomy() {
  const [groups, setGroups] = useState<TaxonomyGroup[]>([]);
  const [termMap, setTermMap] = useState<Map<string, TaxonomyTerm>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: types }, { data: terms }] = await Promise.all([
      supabase
        .from('exercise_taxonomy_types')
        .select('*')
        .order('sort_order'),
      supabase
        .from('exercise_taxonomy_terms')
        .select('*')
        .order('sort_order'),
    ]);

    if (!types || !terms) {
      setLoading(false);
      return;
    }

    const typedTypes = types as unknown as TaxonomyType[];
    const typedTerms = terms as unknown as TaxonomyTerm[];

    const map = new Map<string, TaxonomyTerm>();
    typedTerms.forEach((t) => map.set(t.id, t));
    setTermMap(map);

    const grouped: TaxonomyGroup[] = typedTypes.map((type) => ({
      type,
      terms: typedTerms.filter((t) => t.type_id === type.id),
    }));

    setGroups(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, termMap, loading, reload: load };
}
