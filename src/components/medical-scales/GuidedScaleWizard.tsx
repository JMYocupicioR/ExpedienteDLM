import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ScaleDefinition } from '@/features/medical-records/types/medical-scale.types';
import { QuestionRenderer } from './QuestionRenderer';
import { ChevronLeft, ChevronRight, Save, X, ClipboardList } from 'lucide-react';

interface GuidedScaleWizardProps {
  definition: ScaleDefinition;
  onSave: (answers: Record<string, unknown>) => void;
  onCancel: () => void;
  initialAnswers?: Record<string, unknown>;
}

export const GuidedScaleWizard: React.FC<GuidedScaleWizardProps> = ({
  definition,
  onSave,
  onCancel,
  initialAnswers = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { control, handleSubmit, trigger, watch } = useForm({
    defaultValues: initialAnswers,
  });

  const formValues = watch();

  const questions = [...(definition.items || [])]
    .filter(q => {
      if (!q.logic?.dependency_id) return true;
      const depValue = formValues[q.logic.dependency_id];
      if (depValue === undefined || depValue === '') return false;

      switch(q.logic.show_if) {
        case 'equals': return String(depValue) === String(q.logic.dependency_value);
        case 'not_equals': return String(depValue) !== String(q.logic.dependency_value);
        case 'contains': return Array.isArray(depValue)
          ? depValue.includes(q.logic.dependency_value)
          : String(depValue).includes(String(q.logic.dependency_value));
        default: return true;
      }
    })
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // Clamp current step if questions array shrank due to logic changes
  const validStep = Math.min(currentStep, Math.max(0, questions.length - 1));
  if (validStep !== currentStep && questions.length > 0) {
    setCurrentStep(validStep);
  }

  const currentQuestion = questions[validStep];
  const isFirstStep = validStep === 0;
  const isLastStep = validStep === questions.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(currentQuestion.id);
    if (isValid && !isLastStep) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
    }
  };

  const onSubmit = (data: Record<string, unknown>) => {
    // Only save answers for questions that are visible
    const visibleData: Record<string, unknown> = {};
    questions.forEach(q => {
      visibleData[q.id] = data[q.id];
    });
    onSave(visibleData);
  };

  // Progress
  const progress = questions.length > 0 ? ((validStep + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.values(formValues).filter(v => v !== undefined && v !== '').length;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900">
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-xl max-w-sm">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Sin preguntas disponibles</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Esta escala no tiene preguntas configuradas.</p>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Header */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Scale name */}
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
              {definition.name || 'Evaluación Médica'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                Paso {validStep + 1} de {questions.length}
              </span>
              {answeredCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  · {answeredCount} respondidas
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 ml-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          title="Cerrar"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Dot navigation (up to 20 questions) */}
      {questions.length <= 20 && (
        <div className="flex justify-center py-2 gap-1.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          {questions.map((_, idx) => {
            const isAnswered = formValues[questions[idx].id] !== undefined && formValues[questions[idx].id] !== '';
            const isCurrent = idx === validStep;
            return (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`transition-all rounded-full ${
                  isCurrent
                    ? 'w-6 h-2.5 bg-cyan-500'
                    : isAnswered
                    ? 'w-2.5 h-2.5 bg-emerald-400'
                    : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Question Content — main scroll area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-6 px-4 md:px-8 h-full">
          {currentQuestion && (
            <QuestionRenderer
              key={currentQuestion.id}
              question={currentQuestion}
              control={control}
              onAutoAdvance={isLastStep ? undefined : handleNext}
            />
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`
              flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isFirstStep
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }
            `}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="flex items-center px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Evaluación
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
