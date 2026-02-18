import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { TaxonomyGroup } from '../types';

interface Props {
  groups: TaxonomyGroup[];
  selectedTermIds: Set<string>;
  onToggleTerm: (termId: string) => void;
  onClearAll: () => void;
}

export default function TaxonomyFilterPanel({
  groups,
  selectedTermIds,
  onToggleTerm,
  onClearAll,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((typeId: string) => {
    setCollapsed((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  }, []);

  const activeCount = selectedTermIds.size;

  return (
    <aside className="flex w-full flex-col gap-1 rounded-lg border border-gray-700 bg-gray-900/80 p-3 lg:w-72">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-200">
          <Filter size={14} />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* Groups */}
      <div className="max-h-[calc(100vh-320px)] space-y-0.5 overflow-y-auto pr-1">
        {groups.map(({ type, terms }) => {
          const isCollapsed = collapsed[type.id] ?? false;
          const selectedInGroup = terms.filter((t) => selectedTermIds.has(t.id)).length;

          return (
            <div key={type.id} className="rounded border border-gray-800 bg-gray-950/50">
              {/* Group header */}
              <button
                onClick={() => toggle(type.id)}
                className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-medium text-gray-300 hover:text-white"
              >
                <span className="flex items-center gap-1.5">
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  {type.label}
                </span>
                {selectedInGroup > 0 && (
                  <span className="rounded-full bg-cyan-700/60 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                    {selectedInGroup}
                  </span>
                )}
              </button>

              {/* Terms */}
              {!isCollapsed && (
                <div className="flex flex-wrap gap-1 px-2.5 pb-2.5">
                  {terms.map((term) => {
                    const active = selectedTermIds.has(term.id);
                    return (
                      <button
                        key={term.id}
                        onClick={() => onToggleTerm(term.id)}
                        title={term.description ?? term.label}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        }`}
                      >
                        {term.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
