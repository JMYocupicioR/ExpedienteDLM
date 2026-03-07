import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Stethoscope, Tag, Heart, Users, ClipboardList, Loader2 } from 'lucide-react';
import { TaxonomyService, type TaxonomyItem } from '../services/TaxonomyService';

// ===== Types =====

interface ScaleBasic {
  id: string;
  name: string;
  acronym?: string;
}

interface TaxonomyFilters {
  categoryIds: string[];
  specialtyIds: string[];
  bodySystemIds: string[];
  populationIds: string[];
  scaleTypeIds: string[];
}

interface TaxonomyCatalogs {
  categories: TaxonomyItem[];
  specialties: TaxonomyItem[];
  bodySystems: TaxonomyItem[];
  populations: TaxonomyItem[];
  scaleTypes: TaxonomyItem[];
}

type TaxonomyIndex = Record<string, TaxonomyFilters>;

interface ScaleTaxonomySearchProps {
  scales: ScaleBasic[];
  onSelect: (scaleId: string) => void;
}

// ===== Dimension config =====

interface DimensionConfig {
  key: keyof TaxonomyFilters;
  catalogKey: keyof TaxonomyCatalogs;
  label: string;
  icon: React.ReactNode;
  color: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: 'categoryIds',
    catalogKey: 'categories',
    label: 'Categorías',
    icon: <Tag className="h-3.5 w-3.5" />,
    color: 'cyan',
    chipBg: 'bg-cyan-500/15',
    chipText: 'text-cyan-300',
    chipBorder: 'border-cyan-500/30',
  },
  {
    key: 'specialtyIds',
    catalogKey: 'specialties',
    label: 'Especialidades',
    icon: <Stethoscope className="h-3.5 w-3.5" />,
    color: 'purple',
    chipBg: 'bg-purple-500/15',
    chipText: 'text-purple-300',
    chipBorder: 'border-purple-500/30',
  },
  {
    key: 'bodySystemIds',
    catalogKey: 'bodySystems',
    label: 'Sistemas Corporales',
    icon: <Heart className="h-3.5 w-3.5" />,
    color: 'rose',
    chipBg: 'bg-rose-500/15',
    chipText: 'text-rose-300',
    chipBorder: 'border-rose-500/30',
  },
  {
    key: 'populationIds',
    catalogKey: 'populations',
    label: 'Población',
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'amber',
    chipBg: 'bg-amber-500/15',
    chipText: 'text-amber-300',
    chipBorder: 'border-amber-500/30',
  },
  {
    key: 'scaleTypeIds',
    catalogKey: 'scaleTypes',
    label: 'Tipo de Escala',
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    color: 'emerald',
    chipBg: 'bg-emerald-500/15',
    chipText: 'text-emerald-300',
    chipBorder: 'border-emerald-500/30',
  },
];

// ===== Component =====

export function ScaleTaxonomySearch({ scales, onSelect }: ScaleTaxonomySearchProps) {
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [catalogs, setCatalogs] = useState<TaxonomyCatalogs | null>(null);
  const [taxIndex, setTaxIndex] = useState<TaxonomyIndex>({});
  const [loadingTax, setLoadingTax] = useState(false);
  const [filters, setFilters] = useState<TaxonomyFilters>({
    categoryIds: [],
    specialtyIds: [],
    bodySystemIds: [],
    populationIds: [],
    scaleTypeIds: [],
  });

  // Load taxonomy data on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTax(true);
      try {
        const [catalogData, indexData] = await Promise.all([
          TaxonomyService.getAllTaxonomyCatalogs(),
          TaxonomyService.getScaleTaxonomyIndex(),
        ]);
        if (!cancelled) {
          setCatalogs(catalogData);
          setTaxIndex(indexData);
        }
      } catch (err) {
        console.error('[ScaleTaxonomySearch] Error loading taxonomy data:', err);
      } finally {
        if (!cancelled) setLoadingTax(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Toggle a filter chip
  const toggleFilter = useCallback((dimKey: keyof TaxonomyFilters, id: string) => {
    setFilters(prev => {
      const current = prev[dimKey];
      const next = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id];
      return { ...prev, [dimKey]: next };
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      categoryIds: [],
      specialtyIds: [],
      bodySystemIds: [],
      populationIds: [],
      scaleTypeIds: [],
    });
    setSearchText('');
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);
  }, [filters]);

  // Filter scales
  const filteredScales = useMemo(() => {
    let result = scales;

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.acronym && s.acronym.toLowerCase().includes(q))
      );
    }

    // Taxonomy filters (AND between dimensions, OR within a dimension)
    const hasAnyFilter = Object.values(filters).some(arr => arr.length > 0);
    if (hasAnyFilter) {
      result = result.filter(s => {
        const scaleTax = taxIndex[s.id];
        if (!scaleTax) return false; // Scale has no taxonomy → excluded when filters active

        for (const dim of DIMENSIONS) {
          const selectedIds = filters[dim.key];
          if (selectedIds.length === 0) continue; // no filter on this dimension
          const scaleIds = scaleTax[dim.key];
          // At least one selected ID must be present in the scale's taxonomy
          const hasMatch = selectedIds.some(id => scaleIds.includes(id));
          if (!hasMatch) return false;
        }
        return true;
      });
    }

    return result;
  }, [scales, searchText, filters, taxIndex]);

  // Get only taxonomy items that have associated scales (for relevance)
  const getRelevantItems = useCallback((dim: DimensionConfig): TaxonomyItem[] => {
    if (!catalogs) return [];
    const items = catalogs[dim.catalogKey];
    // Show all items from the catalog — let the user explore
    return items;
  }, [catalogs]);

  // Get the name for a taxonomy item by id
  const getTaxonomyName = useCallback((dimKey: keyof TaxonomyFilters, id: string): string => {
    if (!catalogs) return id;
    const dim = DIMENSIONS.find(d => d.key === dimKey);
    if (!dim) return id;
    const item = catalogs[dim.catalogKey].find(i => i.id === id);
    return item?.name_es || item?.name_en || id;
  }, [catalogs]);

  // Get taxonomy chips for a scale
  const getScaleTaxChips = useCallback((scaleId: string): Array<{ label: string; dim: DimensionConfig }> => {
    const scaleTax = taxIndex[scaleId];
    if (!scaleTax) return [];
    const chips: Array<{ label: string; dim: DimensionConfig }> = [];
    for (const dim of DIMENSIONS) {
      for (const id of scaleTax[dim.key]) {
        const name = getTaxonomyName(dim.key, id);
        chips.push({ label: name, dim });
      }
    }
    return chips;
  }, [taxIndex, getTaxonomyName]);

  return (
    <div className="space-y-3">
      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar escala por nombre o acrónimo..."
            className="w-full pl-10 pr-8 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300'
              : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:border-gray-500'
          }`}
        >
          <Filter className="h-4 w-4" />
          Taxonomía
          {activeFilterCount > 0 && (
            <span className="bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Active filter chips (always visible when filters are set) */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400">Filtros:</span>
          {DIMENSIONS.map(dim =>
            filters[dim.key].map(id => (
              <button
                key={`${dim.key}-${id}`}
                onClick={() => toggleFilter(dim.key, id)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${dim.chipBg} ${dim.chipText} ${dim.chipBorder} hover:opacity-80 transition-opacity`}
              >
                {dim.icon}
                {getTaxonomyName(dim.key, id)}
                <X className="h-3 w-3" />
              </button>
            ))
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-white underline ml-1 transition-colors"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Taxonomy filter panel */}
      {showFilters && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 space-y-3 animate-fade-in-down backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-400" />
              Filtrar por taxonomía
            </h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-cyan-300 transition-colors"
              >
                Limpiar todo ({activeFilterCount})
              </button>
            )}
          </div>

          {loadingTax ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando taxonomías...
            </div>
          ) : (
            <div className="space-y-3">
              {DIMENSIONS.map(dim => {
                const items = getRelevantItems(dim);
                if (items.length === 0) return null;
                return (
                  <div key={dim.key}>
                    <div className={`text-xs font-medium ${dim.chipText} mb-1.5 flex items-center gap-1.5`}>
                      {dim.icon}
                      {dim.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(item => {
                        const isActive = filters[dim.key].includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleFilter(dim.key, item.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                              isActive
                                ? `${dim.chipBg} ${dim.chipText} ${dim.chipBorder} ring-1 ring-offset-0 ring-${dim.color}-500/30`
                                : 'bg-gray-700/50 text-gray-300 border-gray-600/50 hover:border-gray-500 hover:text-white'
                            }`}
                          >
                            {item.name_es}
                            {isActive && <X className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scale results */}
      <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 rounded-lg">
        {filteredScales.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No se encontraron escalas con los filtros actuales.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 underline transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredScales.map(scale => {
              const chips = getScaleTaxChips(scale.id);
              return (
                <button
                  key={scale.id}
                  onClick={() => onSelect(scale.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/70 border border-transparent hover:border-gray-600/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                        {scale.name}
                      </span>
                      {scale.acronym && (
                        <span className="text-xs text-gray-400 bg-gray-700/60 px-1.5 py-0.5 rounded flex-shrink-0">
                          {scale.acronym}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 -rotate-90 flex-shrink-0 transition-colors" />
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {chips.slice(0, 4).map((chip, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border ${chip.dim.chipBg} ${chip.dim.chipText} ${chip.dim.chipBorder}`}
                        >
                          {chip.dim.icon}
                          {chip.label}
                        </span>
                      ))}
                      {chips.length > 4 && (
                        <span className="text-[10px] text-gray-400 px-1">
                          +{chips.length - 4} más
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="text-xs text-gray-500 text-right">
        {filteredScales.length} de {scales.length} escalas
      </div>
    </div>
  );
}
