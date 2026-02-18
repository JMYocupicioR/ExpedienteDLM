import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { TaxonomyGroup } from '../types';

interface Props {
  groups: TaxonomyGroup[];
  selectedTermIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Multi-select tag picker grouped by taxonomy type.
 * Used in the exercise create / edit form.
 */
export default function TaxonomyTagSelect({ groups, selectedTermIds, onChange }: Props) {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const toggleTerm = useCallback(
    (termId: string) => {
      if (selectedTermIds.includes(termId)) {
        onChange(selectedTermIds.filter((id) => id !== termId));
      } else {
        onChange([...selectedTermIds, termId]);
      }
    },
    [selectedTermIds, onChange],
  );

  const selectedSet = new Set(selectedTermIds);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">Clasificaciones (taxonomía)</label>

      {/* Selected chips */}
      {selectedTermIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTermIds.map((tid) => {
            // find label across groups
            let label = tid;
            for (const g of groups) {
              const t = g.terms.find((tt) => tt.id === tid);
              if (t) {
                label = t.label;
                break;
              }
            }
            return (
              <span
                key={tid}
                className="inline-flex items-center gap-1 rounded-full bg-cyan-700/30 px-2 py-0.5 text-[11px] font-medium text-cyan-200"
              >
                {label}
                <button
                  onClick={() => toggleTerm(tid)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-cyan-600/40"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Accordion per type */}
      <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-gray-700 bg-gray-950 p-2">
        {groups.map(({ type, terms }) => {
          const isOpen = expandedType === type.id;
          const countInType = terms.filter((t) => selectedSet.has(t.id)).length;

          return (
            <div key={type.id}>
              <button
                type="button"
                onClick={() => setExpandedType(isOpen ? null : type.id)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <span>
                  {type.label}
                  {countInType > 0 && (
                    <span className="ml-1 text-[10px] text-cyan-400">({countInType})</span>
                  )}
                </span>
                <ChevronDown
                  size={13}
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="flex flex-wrap gap-1 px-2 pb-2 pt-1">
                  {terms.map((term) => {
                    const active = selectedSet.has(term.id);
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => toggleTerm(term.id)}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                        }`}
                      >
                        {active && <Check size={10} />}
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
    </div>
  );
}
