import React, { useMemo, useState } from 'react';
import { X, Printer, Download, CheckCircle } from 'lucide-react';

type ScaleOption = { label: string; value: number | string };
type ScaleItem = { id: string; text: string; type: 'select'; options: ScaleOption[] };

export interface ScaleDefinition {
  items?: ScaleItem[];
  scoring?: {
    average?: boolean;
    ranges?: Array<{ min: number; max: number; severity: string }>;
  };
}

interface ScaleStepperProps {
  isOpen: boolean;
  onClose: () => void;
  scaleId: string;
  scaleName: string;
  definition: ScaleDefinition;
  initialAnswers?: Record<string, unknown>;
  onComplete: (result: {
    answers: Record<string, unknown>;
    score: number | null;
    severity: string | null;
  }) => void;
}

export default function ScaleStepper({ isOpen, onClose, scaleId, scaleName, definition, initialAnswers, onComplete }: ScaleStepperProps) {
  const items = definition.items || [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers || {});

  const allAnswered = useMemo(() => items.every(it => answers[it.id] !== undefined && answers[it.id] !== ''), [items, answers]);

  const score = useMemo(() => {
    if (!items || items.length === 0) return 0;
    const values: number[] = [];
    items.forEach(item => {
      const v = answers[item.id];
      if (typeof v === 'number') values.push(v);
      else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) values.push(Number(v));
    });
    if (values.length === 0) return 0;
    if (definition.scoring?.average) return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
    return values.reduce((a, b) => a + b, 0);
  }, [answers, items, definition.scoring]);

  const severity = useMemo(() => {
    const ranges = definition.scoring?.ranges;
    if (!ranges) return null;
    const val = typeof score === 'number' ? score : null;
    if (val === null) return null;
    const r = ranges.find(rr => val >= rr.min && val <= rr.max);
    return r?.severity || null;
  }, [score, definition.scoring]);

  const handleSelect = (itemId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [itemId]: typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : value }));
    if (index < items.length - 1) {
      setIndex(index + 1);
    }
  };

  const handleFinish = () => {
    onComplete({ answers, score: typeof score === 'number' ? score : null, severity });
    onClose();
  };

  const handlePrint = () => {
    const html = `
      <html>
        <head><title>${scaleName}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>${scaleName}</h2>
          <p><strong>Resultado:</strong> ${score}${severity ? ` — ${severity}` : ''}</p>
          <h3>Respuestas</h3>
          <ul>
            ${items.map(it => `<li><strong>${it.text}:</strong> ${answers[it.id] ?? '-'}</li>`).join('')}
          </ul>
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 100); };</script>
        </body>
      </html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (!isOpen) return null;

  const current = items[index];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">{scaleName}</h3>
            <p className="text-xs text-gray-400">Pregunta {Math.min(index + 1, items.length)} de {items.length}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Panel deslizante */}
        <div className="relative h-56 sm:h-64 overflow-hidden">
          <div
            className="absolute inset-0 flex transition-transform duration-300"
            style={{ transform: `translateX(-${index * 100}%)`, width: `${items.length * 100}%` }}
          >
            {items.map((it, idx) => (
              <div key={it.id} className="w-full flex-shrink-0 p-4">
                <div className="text-white text-base sm:text-lg mb-4">{it.text}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {it.type === 'select' && it.options.map(opt => (
                    <button
                      key={`${it.id}-${String(opt.value)}`}
                      className="px-3 py-2 text-left rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200"
                      onClick={() => handleSelect(it.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {allAnswered ? (
              <span className="text-green-400 inline-flex items-center"><CheckCircle className="h-4 w-4 mr-1" /> Completa</span>
            ) : (
              <span>Responde tocando una opción; avanza automáticamente</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </button>
            <button
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
              onClick={handleFinish}
              disabled={!allAnswered}
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


