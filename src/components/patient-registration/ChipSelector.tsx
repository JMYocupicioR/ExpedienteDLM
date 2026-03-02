import { useMemo } from 'react';
import type { CatalogOption } from '@/lib/patient-registration-catalogs';

type ChipSelectorProps = {
  label: string;
  helpText?: string;
  options: CatalogOption[];
  values: string[];
  onChange: (values: string[]) => void;
  noneValue?: string;
  otherValue?: string;
  otherText?: string;
  onOtherTextChange?: (value: string) => void;
};

export default function ChipSelector({
  label,
  helpText,
  options,
  values,
  onChange,
  noneValue = 'Ninguna',
  otherValue = 'Otra',
  otherText = '',
  onOtherTextChange,
}: ChipSelectorProps) {
  const selectedSet = useMemo(() => new Set(values), [values]);
  const showOtherInput = selectedSet.has(otherValue);

  const toggleOption = (value: string) => {
    const isSelected = selectedSet.has(value);
    const next = new Set(selectedSet);

    if (isSelected) {
      next.delete(value);
      if (value === otherValue && otherText && onOtherTextChange) {
        onOtherTextChange('');
      }
      onChange(Array.from(next));
      return;
    }

    if (value === noneValue) {
      onChange([noneValue]);
      if (onOtherTextChange) onOtherTextChange('');
      return;
    }

    next.delete(noneValue);
    next.add(value);
    onChange(Array.from(next));
  };

  const applyOther = (rawValue: string) => {
    if (!onOtherTextChange) return;
    onOtherTextChange(rawValue);
  };

  return (
    <div>
      <label className="text-base text-gray-200 font-medium">{label}</label>
      {helpText && <p className="text-sm text-gray-400 mt-1">{helpText}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedSet.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              onClick={() => toggleOption(option.value)}
              className={`min-h-[44px] px-4 rounded-lg border text-sm transition-colors ${
                selected
                  ? 'bg-cyan-700 border-cyan-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showOtherInput && (
        <div className="mt-3">
          <label className="text-sm text-gray-300">Escriba la opcion</label>
          <input
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white"
            value={otherText}
            onChange={(event) => applyOther(event.target.value)}
            placeholder="Escriba aqui"
          />
        </div>
      )}
    </div>
  );
}

