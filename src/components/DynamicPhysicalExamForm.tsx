import React, { useState, useEffect, useCallback } from 'react';
import { Save, Clock, Heart, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
// ===== IMPORTACIONES DEL SISTEMA CENTRALIZADO =====
import { 
  VITAL_SIGNS_RANGES, 
  validateVitalSign, 
  SYSTEM_LIMITS 
} from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
  order: number;
}

interface VitalSigns {
  systolic_pressure: string;
  diastolic_pressure: string;
  heart_rate: string;
  respiratory_rate: string;
  temperature: string;
  oxygen_saturation: string;
  weight: string;
  height: string;
  bmi: string;
}

interface PhysicalExamFormData {
  examDate: string;
  examTime: string;
  vitalSigns: VitalSigns;
  sections: Record<string, any>;
  generalObservations: string;
}

interface DynamicPhysicalExamFormProps {
  templateName: string;
  templateSections: TemplateSection[];
  onSave: (data: PhysicalExamFormData) => Promise<void>;
  onAutoSave: (data: PhysicalExamFormData) => Promise<void>;
  initialData?: Partial<PhysicalExamFormData>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ===== USAR RANGOS CENTRALIZADOS EN LUGAR DE HARDCODED =====
// ELIMINADO: const VITAL_SIGNS_RANGES hardcoded - ahora usa el centralizado

export default function DynamicPhysicalExamForm({
  templateName,
  templateSections,
  onSave,
  onAutoSave,
  initialData
}: DynamicPhysicalExamFormProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [criticalAlerts, setCriticalAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PhysicalExamFormData>({
    defaultValues: {
      examDate: initialData?.examDate || new Date().toISOString().split('T')[0],
      examTime: initialData?.examTime || new Date().toTimeString().slice(0, 5),
      vitalSigns: {
        systolic_pressure: initialData?.vitalSigns?.systolic_pressure || '',
        diastolic_pressure: initialData?.vitalSigns?.diastolic_pressure || '',
        heart_rate: initialData?.vitalSigns?.heart_rate || '',
        respiratory_rate: initialData?.vitalSigns?.respiratory_rate || '',
        temperature: initialData?.vitalSigns?.temperature || '',
        oxygen_saturation: initialData?.vitalSigns?.oxygen_saturation || '',
        weight: initialData?.vitalSigns?.weight || '',
        height: initialData?.vitalSigns?.height || '',
        bmi: initialData?.vitalSigns?.bmi || ''
      },
      sections: initialData?.sections || {},
      generalObservations: initialData?.generalObservations || ''
    }
  });

  const watchedData = watch();

  // ===== VALIDACIÓN DE SIGNOS VITALES USANDO SISTEMA CENTRALIZADO =====
  const validateVitalSignField = (field: keyof VitalSigns, value: string): string | null => {
    if (!value) return null;
    
    // Usar función centralizada de validación
    const validation = validateVitalSign(field, value);
    if (!validation.isValid) {
      return validation.message || 'Valor inválido';
    }
    
    return null;
  };

  // ===== ALERTAS CRÍTICAS MEJORADAS =====
  const checkCriticalAlerts = useCallback((vitalSigns: VitalSigns) => {
    const alerts: string[] = [];
    
    // Usar validaciones centralizadas para detectar valores críticos
    Object.entries(vitalSigns).forEach(([field, value]) => {
      if (field === 'bmi' || !value) return;
      
      const validation = validateVitalSign(field, value as string | number);
      
      if (validation.level === 'critical') {
        if (validation.isValid) {
          // Valor crítico pero válido (dentro de límites, pero alarmante)
          alerts.push(`🚨 CRÍTICO - ${field.replace('_', ' ')}: ${validation.message}`);
        } else {
          // Valor inválido y crítico
          alerts.push(`❌ INVÁLIDO - ${field.replace('_', ' ')}: ${validation.message}`);
        }
      }
    });
    
    setCriticalAlerts(alerts);
  }, []);

  // ===== AUTO-SAVE MEJORADO CON VALIDACIÓN =====
  const stableAutoSave = useCallback(async (data: PhysicalExamFormData) => {
    try {
      // Validar datos antes del auto-save usando esquemas JSONB
      const vitalSignsValidation = validateJSONBSchema(data.vitalSigns, 'vital_signs');
      const physicalExamValidation = validateJSONBSchema({
        exam_date: data.examDate,
        exam_time: data.examTime,
        sections: data.sections,
        generalObservations: data.generalObservations,
        vital_signs: data.vitalSigns
      }, 'physical_examination');

      if (vitalSignsValidation.isValid && physicalExamValidation.isValid) {
        onAutoSave(data);
      }
    } catch (error) {
      console.error('Error en auto-save:', error);
    }
  }, [onAutoSave]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSaveState('saving');
      try {
        stableAutoSave(watchedData);
        setLastSaved(new Date());
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch (error) {
        setSaveState('error');
        console.error('Auto-save error:', error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [watchedData, stableAutoSave]);

  // ===== CÁLCULO AUTOMÁTICO DE IMC =====
  useEffect(() => {
    const weight = parseFloat(watchedData.vitalSigns?.weight || '0');
    const height = parseFloat(watchedData.vitalSigns?.height || '0') / 100;
    
    if (weight > 0 && height > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      setValue('vitalSigns.bmi', bmi);
    }
  }, [watchedData.vitalSigns?.weight, watchedData.vitalSigns?.height, setValue]);

  // ===== VALIDACIÓN EN TIEMPO REAL DE SIGNOS VITALES =====
  useEffect(() => {
    if (watchedData.vitalSigns) {
      checkCriticalAlerts(watchedData.vitalSigns);
    }
  }, [watchedData.vitalSigns, checkCriticalAlerts]);

  // Verificar alertas de signos vitales
  useEffect(() => {
    if (watchedData.vitalSigns) {
      checkCriticalAlerts(watchedData.vitalSigns);
    }
  }, [watchedData.vitalSigns, checkCriticalAlerts]);

  // Renderizar campo dinámico basado en tipo
  const renderDynamicField = (field: TemplateField, sectionId: string) => {
    const fieldName = `sections.${sectionId}.${field.id}`;
    const isRequired = field.required;

    switch (field.type) {
      case 'text':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: isRequired ? `${field.label} es requerido` : false }}
            render={({ field: formField }) => (
              <div>
                <input
                  {...formField}
                  type="text"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: isRequired ? `${field.label} es requerido` : false }}
            render={({ field: formField }) => (
              <div>
                <textarea
                  {...formField}
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: isRequired ? `${field.label} es requerido` : false }}
            render={({ field: formField }) => (
              <div>
                <select
                  {...formField}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field: formField }) => (
              <div>
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option}
                        checked={(formField.value || []).includes(option)}
                        onChange={(e) => {
                          const currentValues = formField.value || [];
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter((v: string) => v !== option);
                          formField.onChange(newValues);
                        }}
                        className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                      />
                      <span className="text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'radio':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: isRequired ? `${field.label} es requerido` : false }}
            render={({ field: formField }) => (
              <div>
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        {...formField}
                        value={option}
                        className="rounded-full border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                      />
                      <span className="text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'number':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ 
              required: isRequired ? `${field.label} es requerido` : false,
              min: field.validation?.min ? { value: field.validation.min, message: `Mínimo ${field.validation.min}` } : undefined,
              max: field.validation?.max ? { value: field.validation.max, message: `Máximo ${field.validation.max}` } : undefined
            }}
            render={({ field: formField }) => (
              <div>
                <input
                  {...formField}
                  type="number"
                  min={field.validation?.min}
                  max={field.validation?.max}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      case 'date':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: isRequired ? `${field.label} es requerido` : false }}
            render={({ field: formField }) => (
              <div>
                <input
                  {...formField}
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {field.helpText && (
                  <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                )}
              </div>
            )}
          />
        );

      default:
        return null;
    }
  };

  // Submit del formulario
  const onSubmit = async (data: PhysicalExamFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await onSave(data);
      setSaveState('saved');
      
    } catch (err: any) {
      console.error('Error saving physical exam:', err);
      setError(err.message);
      setSaveState('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si signos vitales están completos
  const isVitalSignsComplete = () => {
    const vs = watchedData.vitalSigns;
    return vs?.systolic_pressure && vs?.diastolic_pressure && vs?.heart_rate && 
           vs?.respiratory_rate && vs?.temperature;
  };

  // Render save status indicator
  const renderSaveStatus = () => {
    switch (saveState) {
      case 'saving':
        return (
          <div className="flex items-center text-sm text-blue-400">
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Guardando...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-sm text-green-400">
            <CheckCircle className="h-4 w-4 mr-1" />
            Guardado: {lastSaved?.toLocaleTimeString()}
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mr-1" />
            Error al guardar
          </div>
        );
      default:
        return (
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            Auto-guardado activo
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">{templateName}</h2>
            <p className="text-sm text-gray-300 mt-1">
              Fecha y hora del examen: {watchedData.examDate} {watchedData.examTime}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {renderSaveStatus()}
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <h3 className="text-lg font-semibold text-red-300 mb-2">⚠️ Alertas Críticas</h3>
          <ul className="space-y-1">
            {criticalAlerts.map((alert, index) => (
              <li key={index} className="text-red-200 text-sm">{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha del Examen *
            </label>
            <Controller
              name="examDate"
              control={control}
              rules={{ required: 'La fecha es requerida' }}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            />
            {errors.examDate && (
              <p className="mt-1 text-sm text-red-400">{errors.examDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hora del Examen *
            </label>
            <Controller
              name="examTime"
              control={control}
              rules={{ required: 'La hora es requerida' }}
              render={({ field }) => (
                <input
                  {...field}
                  type="time"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            />
            {errors.examTime && (
              <p className="mt-1 text-sm text-red-400">{errors.examTime.message}</p>
            )}
          </div>
        </div>

        {/* Signos Vitales */}
        <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-700">
          <div className="flex items-center mb-4">
            <Heart className="h-5 w-5 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-white">Signos Vitales *</h3>
            {!isVitalSignsComplete() && (
              <AlertCircle className="h-5 w-5 text-yellow-500 ml-2" />
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(VITAL_SIGNS_RANGES).map(([field, range]) => {
              if (field === 'bmi') return null;
              
              const fieldKey = field as keyof VitalSigns;
              const isRequired = ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'].includes(field);
              const fieldValue = watchedData.vitalSigns?.[fieldKey] || '';
              const validationError = fieldValue ? validateVitalSignField(fieldKey, fieldValue) : null;
              
              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {field === 'systolic_pressure' ? 'Presión Sistólica' :
                     field === 'diastolic_pressure' ? 'Presión Diastólica' :
                     field === 'heart_rate' ? 'Frecuencia Cardíaca' :
                     field === 'respiratory_rate' ? 'Frecuencia Respiratoria' :
                     field === 'temperature' ? 'Temperatura' :
                     field === 'oxygen_saturation' ? 'Saturación O₂' :
                     field === 'weight' ? 'Peso' :
                     'Altura'} ({range.unit}) {isRequired && '*'}
                  </label>
                  <input
                    type="number"
                    step={field === 'temperature' ? '0.1' : field === 'weight' ? '0.1' : '1'}
                    {...register(`vitalSigns.${fieldKey}`, {
                      required: isRequired ? 'Este campo es requerido' : false,
                      min: { value: range.min, message: `Mínimo ${range.min} ${range.unit}` },
                      max: { value: range.max, message: `Máximo ${range.max} ${range.unit}` }
                    })}
                    className={`w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600 ${
                      validationError ? 'border-red-500' : ''
                    }`}
                    placeholder={`${range.min}-${range.max}`}
                  />
                  {validationError && (
                    <p className="mt-1 text-xs text-red-400">{validationError}</p>
                  )}
                  {errors.vitalSigns?.[fieldKey] && (
                    <p className="mt-1 text-xs text-red-400">{errors.vitalSigns[fieldKey]?.message}</p>
                  )}
                </div>
              );
            })}
            
            {watchedData.vitalSigns?.bmi && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IMC
                </label>
                <input
                  type="text"
                  value={`${watchedData.vitalSigns.bmi} kg/m²`}
                  readOnly
                  className="w-full rounded-md border-gray-600 bg-gray-600 text-gray-200 shadow-sm"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {parseFloat(watchedData.vitalSigns.bmi) < 18.5 ? 'Bajo peso' :
                   parseFloat(watchedData.vitalSigns.bmi) < 25 ? 'Normal' :
                   parseFloat(watchedData.vitalSigns.bmi) < 30 ? 'Sobrepeso' : 'Obesidad'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Secciones Dinámicas de la Plantilla */}
        {templateSections
          .sort((a, b) => a.order - b.order)
          .map((section) => (
          <div key={section.id} className="border border-gray-600 rounded-lg p-6 bg-gray-750">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-gray-400 mt-1">{section.description}</p>
              )}
            </div>
            
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {renderDynamicField(field, section.id)}
                  {errors.sections?.[section.id]?.[field.id] && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.sections[section.id][field.id]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Observaciones Generales */}
        <div className="border border-gray-600 rounded-lg p-6 bg-gray-750">
          <h3 className="text-lg font-medium text-white mb-4">Observaciones Generales</h3>
          <textarea
            {...register('generalObservations')}
            rows={6}
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
            placeholder="Comentarios generales sobre el examen físico, impresión clínica global, y cualquier observación adicional relevante..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
            disabled={saveState === 'saving'}
          >
            Guardar como Borrador
          </button>
          <button
            type="submit"
            disabled={saveState === 'saving' || !isVitalSignsComplete()}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {saveState === 'saving' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveState === 'saving' ? 'Guardando...' : 'Completar Examen'}
          </button>
        </div>
      </form>
    </div>
  );
} 