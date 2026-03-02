import type { CatalogOption } from '@/lib/patient-registration-catalogs';

type SelectSimpleProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: CatalogOption[];
  otherValue?: string;
  otherText?: string;
  onOtherTextChange?: (value: string) => void;
  placeholder?: string;
};

export default function SelectSimple({
  label,
  value,
  onChange,
  options,
  otherValue = 'Otra',
  otherText = '',
  onOtherTextChange,
  placeholder = 'Seleccione una opcion',
}: SelectSimpleProps) {
  const showOtherInput = value === otherValue || value === 'Otro';

  return (
    <div>
      <label className="text-base text-gray-200 font-medium">{label}</label>
      <select
        className="mt-1 w-full min-h-[44px] bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showOtherInput && onOtherTextChange && (
        <div className="mt-2">
          <label className="text-sm text-gray-300">Escriba su opcion</label>
          <input
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white"
            value={otherText}
            onChange={(event) => onOtherTextChange(event.target.value)}
            placeholder="Escriba aqui"
          />
        </div>
      )}
    </div>
  );
}

