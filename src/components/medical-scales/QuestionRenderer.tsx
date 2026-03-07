import React, { useState } from 'react';
import { Controller, Control } from 'react-hook-form';
import { ScaleQuestion } from '@/features/medical-records/types/medical-scale.types';
import { getScaleImageUrl } from '@/lib/services/medical-scales-service';
import { Info, ZoomIn, CheckCircle2 } from 'lucide-react';

interface QuestionRendererProps {
  question: ScaleQuestion;
  control: Control<Record<string, unknown>>;
  readOnly?: boolean;
  onAutoAdvance?: () => void;
}

// Full-screen image lightbox
const ImageLightbox = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute -top-8 right-0 text-white/80 hover:text-white text-sm font-medium flex items-center gap-1 z-10"
      >
        ✕ Cerrar
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
    </div>
  </div>
);

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  control,
  readOnly = false,
  onAutoAdvance,
}) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const imageUrl = getScaleImageUrl(question.image_url);
  const hasImage = !!imageUrl;

  return (
    <div className={`w-full transition-all ${readOnly ? 'opacity-75' : ''}`}>
      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt={question.text} onClose={() => setLightboxSrc(null)} />
      )}

      {/* On desktop with image: two-column layout. Without image: single column full-width */}
      <div className={`flex ${hasImage ? 'flex-col lg:flex-row lg:gap-6' : 'flex-col'} gap-4`}>

        {/* LEFT: Question header + image */}
        <div className={hasImage ? 'lg:w-1/2 lg:flex-shrink-0 flex flex-col' : 'w-full'}>
          {/* Question header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {question.order_index}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                {question.text}
                {question.validation?.required && (
                  <span className="text-red-500 ml-1 text-sm">*</span>
                )}
              </p>
            </div>
          </div>

          {/* Description */}
          {question.description && (
            <div className="mb-3 flex gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{question.description}</p>
            </div>
          )}

          {/* Image — shown in left column on desktop, full-width on mobile */}
          {imageUrl && (
            <div
              className="group relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-zoom-in flex-1"
              onClick={() => setLightboxSrc(imageUrl)}
            >
              <img
                src={imageUrl}
                alt={question.text}
                className="w-full h-full object-contain max-h-72 lg:max-h-none lg:h-full transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ minHeight: '160px' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 bg-gradient-to-t from-black/30 via-transparent to-transparent">
                <div className="flex items-center gap-1 text-white text-xs font-medium bg-black/40 rounded-lg px-2 py-1 backdrop-blur-sm">
                  <ZoomIn className="h-3 w-3" />
                  <span>Ampliar</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Answer options */}
        <div className={hasImage ? 'lg:w-1/2 lg:overflow-y-auto lg:max-h-[65vh]' : 'w-full'}>
          <Controller
            control={control}
            name={question.id}
            rules={{ required: question.validation?.required }}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
              const renderChoices = (type: 'single' | 'multi') => {
                const hasOptImages = question.options?.some(o => o.image_url);
                const hasLongText = question.options?.some(o => (o.label?.length ?? 0) > 45);

                // Grid layout logic:
                // - If options have images: 2-col on any screen
                // - If in split layout (has main image) and long text: 1-col
                // - Otherwise: 1-col on mobile, 2-col on sm+
                const gridClass = hasOptImages
                  ? 'grid grid-cols-2 gap-3'
                  : hasImage || hasLongText
                  ? 'flex flex-col gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5';

                return (
                  <div className={gridClass}>
                    {question.options?.map((opt, idx) => {
                      const isSelected = type === 'single'
                        ? value === opt.value
                        : Array.isArray(value) && value.includes(opt.value);
                      const optImg = getScaleImageUrl(opt.image_url as string | undefined);

                      return (
                        <label
                          key={opt.value?.toString() ?? idx}
                          className={`
                            relative cursor-pointer rounded-xl border-2 transition-all duration-200 active:scale-[0.98] select-none overflow-hidden
                            ${isSelected
                              ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 shadow-md shadow-cyan-500/10'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-sm'
                            }
                          `}
                        >
                          <input
                            type={type === 'single' ? 'radio' : 'checkbox'}
                            name={question.id}
                            value={opt.value}
                            checked={isSelected}
                            onChange={(e) => {
                              if (type === 'single') {
                                onChange(opt.value);
                                if (onAutoAdvance && !isSelected) {
                                  setTimeout(onAutoAdvance, 350);
                                }
                              } else {
                                const current = Array.isArray(value) ? value : [];
                                const next = e.target.checked
                                  ? [...current, opt.value]
                                  : current.filter(v => v !== opt.value);
                                onChange(next);
                              }
                            }}
                            disabled={readOnly}
                            className="sr-only"
                          />

                          {/* Option image */}
                          {optImg && (
                            <div
                              className="w-full h-28 bg-gray-100 dark:bg-gray-900 overflow-hidden"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLightboxSrc(optImg);
                              }}
                            >
                              <img
                                src={optImg}
                                alt={opt.label}
                                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {/* Option content */}
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            {/* Indicator */}
                            <div className={`
                              flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                              ${isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-gray-300 dark:border-gray-600'}
                            `}>
                              {isSelected && (
                                type === 'single'
                                  ? <div className="w-2 h-2 rounded-full bg-white" />
                                  : <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium leading-snug ${
                                isSelected
                                  ? 'text-cyan-700 dark:text-cyan-300'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}>
                                {opt.label}
                              </span>
                              {opt.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                              )}
                            </div>

                            {/* Score badge */}
                            {typeof opt.value === 'number' && (
                              <div className={`
                                flex-shrink-0 min-w-[28px] h-7 px-1.5 rounded-lg flex items-center justify-center text-xs font-bold
                                ${isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}
                              `}>
                                {opt.value}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              };

              const switchRender = () => {
                switch (question.type) {
                  case 'single_choice':
                  case 'select':
                    return renderChoices('single');
                  case 'multi_choice':
                    return renderChoices('multi');

                  case 'slider': {
                    const min = question.validation?.min ?? 0;
                    const max = question.validation?.max ?? 10;
                    const step = question.validation?.step ?? 1;
                    const current = (value as number) ?? min;
                    const pct = ((current - min) / (max - min)) * 100;
                    return (
                      <div className="py-4 px-2">
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={current}
                          onChange={(e) => onChange(Number(e.target.value))}
                          disabled={readOnly}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none"
                          style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${pct}%, #374151 ${pct}%, #374151 100%)` }}
                        />
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs text-gray-500">{min}</span>
                          <div className="flex flex-col items-center">
                            <span className="text-3xl font-bold text-cyan-500 tabular-nums">{current}</span>
                            <span className="text-xs text-gray-400">/ {max}</span>
                          </div>
                          <span className="text-xs text-gray-500">{max}</span>
                        </div>
                      </div>
                    );
                  }

                  case 'text':
                    return (
                      <textarea
                        value={(value as string) || ''}
                        onChange={onChange}
                        disabled={readOnly}
                        placeholder="Escribe tu respuesta aquí..."
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white resize-none"
                        rows={4}
                      />
                    );

                  case 'number':
                    return (
                      <input
                        type="number"
                        value={(value as number) ?? ''}
                        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={readOnly}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
                      />
                    );

                  case 'info':
                    return null;

                  default:
                    return (
                      <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400 italic">Tipo de pregunta no soportado: {question.type}</p>
                      </div>
                    );
                }
              };

              return (
                <div>
                  {switchRender()}
                  {error && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <span>⚠️</span> {error.message || 'Este campo es obligatorio'}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>

      </div>
    </div>
  );
};
