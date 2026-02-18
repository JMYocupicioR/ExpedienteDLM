import type { ScaleDefinition } from '@/lib/types/app';
import { useMemo, useState } from 'react';

type Props = {
  scale: ScaleDefinition;
  onSubmit: (result: {
    answers: Record<string, string | number>;
    score: number;
    severity: string | null;
  }) => Promise<void> | void;
};

export default function ScaleForm({ scale, onSubmit }: Props) {
  const items = scale.definition.items || [];
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);

  const score = useMemo(() => {
    const values = items
      .map((item) => answers[item.id])
      .filter((v): v is number | string => v !== undefined)
      .map((v) => (typeof v === 'number' ? v : Number(v)))
      .filter((v) => !Number.isNaN(v));

    if (!values.length) return 0;
    if (scale.definition.scoring?.average) {
      return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
    }
    return values.reduce((a, b) => a + b, 0);
  }, [answers, items, scale.definition.scoring]);

  const severity = useMemo(() => {
    const ranges = scale.definition.scoring?.ranges || [];
    const found = ranges.find((range) => score >= range.min && score <= range.max);
    return found?.severity || null;
  }, [score, scale.definition.scoring]);

  const allAnswered = items.every((item) => answers[item.id] !== undefined);

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-base font-semibold">{scale.name}</h2>
      {items.map((item) => (
        <div key={item.id} className="space-y-2">
          <p className="text-sm text-slate-200">{item.text}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {item.options.map((option) => (
              <button
                key={`${item.id}-${String(option.value)}`}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [item.id]: option.value,
                  }))
                }
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  answers[item.id] === option.value
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-md bg-slate-800 p-3 text-sm">
        <p className="text-slate-300">Puntaje: <strong>{score}</strong></p>
        <p className="text-slate-300">Severidad: <strong>{severity || 'N/A'}</strong></p>
      </div>

      <button
        disabled={!allAnswered || saving}
        type="button"
        onClick={async () => {
          setSaving(true);
          await onSubmit({ answers, score, severity });
          setSaving(false);
        }}
        className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Enviar escala'}
      </button>
    </div>
  );
}
