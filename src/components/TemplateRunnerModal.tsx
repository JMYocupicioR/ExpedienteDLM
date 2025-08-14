import React, { useState, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Check, AlertCircle, 
  FileText, Clock, Progress, Save, SkipForward 
} from 'lucide-react';
import { MedicalTemplate, TemplateField, TemplateSection } from '../lib/database.types';

interface TemplateRunnerModalProps {
  template: MedicalTemplate;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (responses: TemplateResponses) => void;
  initialResponses?: TemplateResponses;
}

export interface TemplateResponses {
  [sectionId: string]: {
    [fieldId: string]: string | number | boolean | string[];
  };
}

interface FieldError {
  fieldId: string;
  sectionId: string;
  message: string;
}

export default function TemplateRunnerModal({
  template,
  isOpen,
  onClose,
  onComplete,
  initialResponses = {}
}: TemplateRunnerModalProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [responses, setResponses] = useState<TemplateResponses>(initialResponses);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Reset state when template changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSectionIndex(0);
      setCurrentFieldIndex(0);
      setResponses(initialResponses);
      setErrors([]);
      setShowSummary(false);
    }
  }, [isOpen, template.id, initialResponses]);

  const sections = template.content.sections || [];
  const currentSection = sections[currentSectionIndex];
  const currentFields = currentSection?.fields || [];
  const currentField = currentFields[currentFieldIndex];

  // Validar campo actual
  const validateField = (field: TemplateField, value: any): string | null => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} es requerido`;
    }

    if (field.validation) {
      const validation = field.validation;
      
      if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
        return `${field.label} debe ser mayor o igual a ${validation.min}`;
      }
      
      if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
        return `${field.label} debe ser menor o igual a ${validation.max}`;
      }
      
      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return validation.message || `${field.label} tiene un formato inválido`;
        }
      }
    }

    return null;
  };

  // Obtener valor actual del campo
  const getFieldValue = (sectionId: string, fieldId: string) => {
    return responses[sectionId]?.[fieldId] || getDefaultValue(currentField);
  };

  // Obtener valor por defecto según el tipo de campo
  const getDefaultValue = (field: TemplateField) => {
    if (field.defaultValue !== undefined) return field.defaultValue;
    
    switch (field.type) {
      case 'checkbox':
        return [];
      case 'number':
        return '';
      default:
        return '';
    }
  };

  // Actualizar respuesta
  const updateResponse = (sectionId: string, fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value
      }
    }));

    // Limpiar error si existe
    setErrors(prev => prev.filter(e => !(e.sectionId === sectionId && e.fieldId === fieldId)));
  };

  // Navegar al siguiente campo/sección
  const goNext = () => {
    if (!currentField) return;

    // Validar campo actual
    const value = getFieldValue(currentSection.id, currentField.id);
    const error = validateField(currentField, value);
    
    if (error) {
      setErrors(prev => [
        ...prev.filter(e => !(e.sectionId === currentSection.id && e.fieldId === currentField.id)),
        { sectionId: currentSection.id, fieldId: currentField.id, message: error }
      ]);
      return;
    }

    // Mover al siguiente campo
    if (currentFieldIndex < currentFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      // Mover a la siguiente sección
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentFieldIndex(0);
    } else {
      // Último campo, mostrar resumen
      setShowSummary(true);
    }
  };

  // Navegar al campo anterior
  const goPrevious = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentFieldIndex((prevSection.fields || []).length - 1);
    }
  };

  // Completar el interrogatorio
  const handleComplete = () => {
    setIsCompleting(true);
    
    // Validar todos los campos requeridos
    const allErrors: FieldError[] = [];
    
    sections.forEach(section => {
      section.fields?.forEach(field => {
        if (field.required) {
          const value = getFieldValue(section.id, field.id);
          const error = validateField(field, value);
          if (error) {
            allErrors.push({
              sectionId: section.id,
              fieldId: field.id,
              message: error
            });
          }
        }
      });
    });

    if (allErrors.length > 0) {
      setErrors(allErrors);
      setIsCompleting(false);
      setShowSummary(false);
      
      // Navegar al primer error
      const firstError = allErrors[0];
      const errorSectionIndex = sections.findIndex(s => s.id === firstError.sectionId);
      const errorFieldIndex = sections[errorSectionIndex].fields?.findIndex(f => f.id === firstError.fieldId) || 0;
      
      setCurrentSectionIndex(errorSectionIndex);
      setCurrentFieldIndex(errorFieldIndex);
      return;
    }

    onComplete(responses);
    setIsCompleting(false);
  };

  // Calcular progreso
  const totalFields = sections.reduce((sum, section) => sum + (section.fields?.length || 0), 0);
  const completedFields = sections.slice(0, currentSectionIndex).reduce((sum, section) => sum + (section.fields?.length || 0), 0) + currentFieldIndex;
  const progressPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  // Renderizar campo según su tipo
  const renderField = (field: TemplateField) => {
    const value = getFieldValue(currentSection.id, field.id);
    const hasError = errors.some(e => e.sectionId === currentSection.id && e.fieldId === field.id);
    const errorMessage = errors.find(e => e.sectionId === currentSection.id && e.fieldId === field.id)?.message;

    const commonClasses = `w-full rounded-md border ${
      hasError ? 'border-red-500 bg-red-900/20' : 'border-gray-600 bg-gray-700'
    } text-white focus:border-cyan-500 focus:ring-cyan-500`;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={commonClasses}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={commonClasses}
          />
        );

      case 'select':
        return (
          <select
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            className={commonClasses}
          >
            <option value="">Selecciona una opción...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 text-gray-300">
                <input
                  type="radio"
                  name={`${currentSection.id}_${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      updateResponse(currentSection.id, field.id, [...currentValues, option]);
                    } else {
                      updateResponse(currentSection.id, field.id, currentValues.filter(v => v !== option));
                    }
                  }}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            className={commonClasses}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            className={commonClasses}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => updateResponse(currentSection.id, field.id, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
          />
        );
    }
  };

  // Renderizar resumen
  const renderSummary = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Interrogatorio Completado</h3>
        <p className="text-gray-400">Revisa las respuestas antes de aplicarlas a la consulta</p>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-4">
        {sections.map(section => {
          const sectionResponses = responses[section.id];
          if (!sectionResponses) return null;

          return (
            <div key={section.id} className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">{section.title}</h4>
              <div className="space-y-2">
                {section.fields?.map(field => {
                  const response = sectionResponses[field.id];
                  if (!response && response !== 0) return null;

                  return (
                    <div key={field.id} className="flex justify-between items-start">
                      <span className="text-sm text-gray-400">{field.label}:</span>
                      <span className="text-sm text-white max-w-xs text-right">
                        {Array.isArray(response) ? response.join(', ') : String(response)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setShowSummary(false)}
          className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Revisar Respuestas
        </button>
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          {isCompleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Aplicando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Aplicar a Consulta
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-cyan-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                <p className="text-sm text-gray-400">Interrogatorio Guiado</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar */}
          {!showSummary && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">
                  Pregunta {currentFieldIndex + 1} de {currentFields.length} 
                  (Sección {currentSectionIndex + 1}/{sections.length})
                </span>
                <span className="text-sm text-gray-400">
                  {Math.round(progressPercentage)}% completado
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Section info */}
          {!showSummary && currentSection && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <h4 className="font-medium text-blue-300 mb-1">{currentSection.title}</h4>
              {currentSection.description && (
                <p className="text-sm text-blue-200">{currentSection.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {showSummary ? renderSummary() : (
            currentField && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {currentField.label}
                    {currentField.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {renderField(currentField)}
                  
                  {errors.some(e => e.sectionId === currentSection.id && e.fieldId === currentField.id) && (
                    <div className="mt-2 flex items-center text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.find(e => e.sectionId === currentSection.id && e.fieldId === currentField.id)?.message}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {!showSummary && (
          <div className="p-6 border-t border-gray-700 bg-gray-800/50">
            <div className="flex justify-between items-center">
              <button
                onClick={goPrevious}
                disabled={currentSectionIndex === 0 && currentFieldIndex === 0}
                className="flex items-center px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSummary(true)}
                  className="flex items-center px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Ver Resumen
                </button>
                
                <button
                  onClick={goNext}
                  className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  {(currentSectionIndex === sections.length - 1 && currentFieldIndex === currentFields.length - 1) ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Finalizar
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
