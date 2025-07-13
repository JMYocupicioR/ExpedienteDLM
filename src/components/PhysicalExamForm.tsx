import React, { useState, useEffect, useCallback } from 'react';
import { Save, Clock, Heart, AlertCircle, CheckCircle, Loader2, Activity, Thermometer } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { 
  VITAL_SIGNS_RANGES, 
  validateVitalSign, 
  SYSTEM_LIMITS,
  VitalSignRange 
} from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';
import DynamicPhysicalExamForm from './DynamicPhysicalExamForm';
import type { 
  PhysicalExamFormData, 
  PhysicalExamTemplateDefinition,
  ExamSection,
  ExamQuestion 
} from '../lib/database.types';

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

interface ExaminationSection {
  id: string;
  title: string;
  normalFindings: string[];
  commonAbnormalFindings: string[];
  observations: string;
  isNormal: boolean | null;
  selectedFindings: string[];
  attachments: File[];
}

interface PhysicalExamFormProps {
  templateId: string;
  templateName: string;
  templateDefinition: PhysicalExamTemplateDefinition;
  onSave: (data: PhysicalExamFormData) => Promise<void>;
  onAutoSave: (data: PhysicalExamFormData) => Promise<void>;
  initialData?: Partial<PhysicalExamFormData>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Validaciones médicas
const EXAMINATION_TEMPLATES = {
  general: {
    name: 'Exploración Física General',
    sections: [
      {
        id: 'head_neck',
        title: 'Cabeza y Cuello',
        normalFindings: [
          'Normocéfalo, sin deformidades',
          'Cuello simétrico, sin masas palpables',
          'Tiroides no palpable',
          'Ganglios no palpables',
          'Pulsos carotídeos simétricos'
        ],
        commonAbnormalFindings: [
          'Adenopatías cervicales',
          'Bocio',
          'Ingurgitación yugular',
          'Rigidez nucal',
          'Asimetría facial'
        ]
      },
      {
        id: 'chest_lungs',
        title: 'Tórax y Pulmones',
        normalFindings: [
          'Tórax simétrico',
          'Expansibilidad conservada',
          'Murmullo vesicular presente bilateral',
          'Sin ruidos agregados',
          'Percusión resonante'
        ],
        commonAbnormalFindings: [
          'Estertores',
          'Sibilancias',
          'Soplos',
          'Matidez',
          'Disminución del murmullo vesicular'
        ]
      },
      {
        id: 'cardiovascular',
        title: 'Corazón y Sistema Cardiovascular',
        normalFindings: [
          'Ruidos cardíacos rítmicos',
          'Sin soplos',
          'Pulsos periféricos presentes',
          'Sin edema',
          'Llenado capilar < 2 segundos'
        ],
        commonAbnormalFindings: [
          'Soplo sistólico',
          'Soplo diastólico',
          'Arritmia',
          'Edema en extremidades',
          'Pulsos débiles'
        ]
      },
      {
        id: 'abdomen',
        title: 'Abdomen',
        normalFindings: [
          'Blando, depresible',
          'Sin dolor a la palpación',
          'Ruidos intestinales presentes',
          'Sin masas palpables',
          'Sin organomegalias'
        ],
        commonAbnormalFindings: [
          'Dolor abdominal',
          'Distensión',
          'Hepatomegalia',
          'Esplenomegalia',
          'Masas abdominales'
        ]
      },
      {
        id: 'extremities',
        title: 'Extremidades',
        normalFindings: [
          'Movilidad conservada',
          'Sin deformidades',
          'Fuerza muscular 5/5',
          'Sin edema',
          'Pulsos periféricos presentes'
        ],
        commonAbnormalFindings: [
          'Limitación del movimiento',
          'Deformidades',
          'Debilidad muscular',
          'Edema',
          'Ausencia de pulsos'
        ]
      },
      {
        id: 'musculoskeletal',
        title: 'Sistema Músculo-esquelético',
        normalFindings: [
          'Articulaciones sin inflamación',
          'Movilidad completa',
          'Sin dolor articular',
          'Tono muscular normal',
          'Marcha normal'
        ],
        commonAbnormalFindings: [
          'Artritis',
          'Rigidez articular',
          'Atrofia muscular',
          'Contracturas',
          'Alteraciones de la marcha'
        ]
      },
      {
        id: 'skin',
        title: 'Piel y Anexos',
        normalFindings: [
          'Piel íntegra',
          'Color normal',
          'Sin lesiones',
          'Hidratación adecuada',
          'Uñas normales'
        ],
        commonAbnormalFindings: [
          'Palidez',
          'Ictericia',
          'Cianosis',
          'Erupciones',
          'Lesiones cutáneas'
        ]
      },
      {
        id: 'neurological',
        title: 'Sistema Neurológico',
        normalFindings: [
          'Consciente, orientado',
          'Reflejos normales',
          'Fuerza muscular 5/5',
          'Sensibilidad conservada',
          'Coordinación normal'
        ],
        commonAbnormalFindings: [
          'Alteración del estado mental',
          'Reflejos alterados',
          'Debilidad muscular',
          'Pérdida sensorial',
          'Incoordinación'
        ]
      }
    ]
  }
};

export default function PhysicalExamForm({
  templateId,
  templateName,
  templateDefinition,
  onSave,
  onAutoSave,
  initialData
}: PhysicalExamFormProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [criticalAlerts, setCriticalAlerts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitalSignsAlerts, setVitalSignsAlerts] = useState<Record<string, { level: 'normal' | 'warning' | 'critical'; message?: string }>>({});

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
  const template = EXAMINATION_TEMPLATES[templateId as keyof typeof EXAMINATION_TEMPLATES] || EXAMINATION_TEMPLATES.general;

  // ===== VALIDACIÓN EN TIEMPO REAL DE SIGNOS VITALES =====
  useEffect(() => {
    const validateAllVitalSigns = () => {
      const alerts: Record<string, { level: 'normal' | 'warning' | 'critical'; message?: string }> = {};
      const criticalMessages: string[] = [];

      Object.entries(watchedData.vitalSigns).forEach(([field, value]) => {
        if (field === 'bmi' || !value) return;

                 const validation = validateVitalSign(field, value as string | number);
         alerts[field] = validation;

         if (validation.level === 'critical' && !validation.isValid) {
           criticalMessages.push(`${field}: ${validation.message}`);
         } else if (validation.level === 'critical' && validation.message) {
           criticalMessages.push(`⚠️ CRÍTICO - ${field}: ${validation.message}`);
         }
      });

      setVitalSignsAlerts(alerts);
      setCriticalAlerts(criticalMessages);
    };

    validateAllVitalSigns();
  }, [watchedData.vitalSigns]);

  // ===== CÁLCULO AUTOMÁTICO DE IMC =====
  useEffect(() => {
    const weight = parseFloat(watchedData.vitalSigns?.weight || '0');
    const height = parseFloat(watchedData.vitalSigns?.height || '0') / 100;
    
    if (weight > 0 && height > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      setValue('vitalSigns.bmi', bmi);
    }
  }, [watchedData.vitalSigns?.weight, watchedData.vitalSigns?.height, setValue]);

  // ===== AUTO-SAVE MEJORADO CON VALIDACIÓN =====
  const stableAutoSave = useCallback(async (data: PhysicalExamFormData) => {
    try {
      // Validar datos antes del auto-save
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

  // ===== VALIDACIÓN MEJORADA DE SIGNOS VITALES =====
  const validateVitalSignField = (field: string, value: string): string | null => {
    if (!value) return null;
    
    const validation = validateVitalSign(field, value);
    if (!validation.isValid) {
      return validation.message || 'Valor inválido';
    }
    
    return null;
  };

  // ===== VALIDACIÓN COMPLETA DEL FORMULARIO =====
  const validateCompleteForm = (data: PhysicalExamFormData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validar campos requeridos
    if (!data.examDate) errors.push('Fecha del examen es requerida');
    if (!data.examTime) errors.push('Hora del examen es requerida');
    
    // Validar signos vitales requeridos
    const requiredVitalSigns = ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'];
    requiredVitalSigns.forEach(field => {
      if (!data.vitalSigns[field as keyof VitalSigns]) {
        errors.push(`${field.replace('_', ' ')} es requerido`);
      }
    });

    // Validar rangos de signos vitales
    Object.entries(data.vitalSigns).forEach(([field, value]) => {
      if (field !== 'bmi' && value) {
        const validation = validateVitalSign(field, value);
        if (!validation.isValid) {
          errors.push(`${field}: ${validation.message}`);
        }
      }
    });

    // Validar que al menos una sección tenga datos
    const hasAnySection = Object.values(data.sections || {}).some(section => 
      section.observations || (section.selectedFindings && section.selectedFindings.length > 0)
    );
    
    if (!hasAnySection && !data.generalObservations) {
      errors.push('Debe completar al menos una sección del examen físico o agregar observaciones generales');
    }

    // Validar longitud de observaciones generales
    if (data.generalObservations && data.generalObservations.length > SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH) {
      errors.push(`Observaciones generales demasiado largas (máximo ${SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH} caracteres)`);
    }

    return { isValid: errors.length === 0, errors };
  };

  // ===== VALIDACIÓN EN SUBMIT =====
  const onSubmit = async (data: PhysicalExamFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});
      
      // Validación completa
      const validation = validateCompleteForm(data);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors.reduce((acc, error, index) => {
          acc[`error_${index}`] = error;
          return acc;
        }, {} as Record<string, string>));
        setSaveState('error');
        return;
      }

      // Verificar alertas críticas
      if (criticalAlerts.length > 0) {
        const proceed = window.confirm(
          'Se detectaron valores críticos en signos vitales:\n' + 
          criticalAlerts.join('\n') + 
          '\n\n¿Desea continuar guardando?'
        );
        if (!proceed) {
          return;
        }
      }
      
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

  const isVitalSignsComplete = () => {
    const vs = watchedData.vitalSigns;
    return vs?.systolic_pressure && vs?.diastolic_pressure && vs?.heart_rate && 
           vs?.respiratory_rate && vs?.temperature;
  };

  // ===== RENDER HELPER PARA CAMPO DE SIGNOS VITALES =====
  const renderVitalSignField = (field: string, range: VitalSignRange, isRequired: boolean = true) => {
    const fieldKey = field as keyof VitalSigns;
    const value = watchedData.vitalSigns?.[fieldKey] || '';
    const alert = vitalSignsAlerts[field];
    const validationError = validateVitalSignField(field, value);

    const getFieldLabel = (field: string) => {
      const labels: Record<string, string> = {
        'systolic_pressure': 'Presión Sistólica',
        'diastolic_pressure': 'Presión Diastólica',
        'heart_rate': 'Frecuencia Cardíaca',
        'respiratory_rate': 'Frecuencia Respiratoria',
        'temperature': 'Temperatura',
        'oxygen_saturation': 'Saturación O₂',
        'weight': 'Peso',
        'height': 'Altura'
      };
      return labels[field] || field;
    };

    const getAlertColor = (level: 'normal' | 'warning' | 'critical') => {
      switch (level) {
        case 'critical': return 'border-red-500 bg-red-900/20';
        case 'warning': return 'border-yellow-500 bg-yellow-900/20';
        default: return 'border-gray-600';
      }
    };

    return (
      <div key={field} className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          {getFieldLabel(field)} ({range.unit}) {isRequired && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          <input
            type="number"
            step={field === 'temperature' ? '0.1' : field === 'weight' ? '0.1' : '1'}
            {...register(`vitalSigns.${fieldKey}`, {
              required: isRequired ? 'Este campo es requerido' : false,
              min: { value: range.min, message: `Mínimo ${range.min} ${range.unit}` },
              max: { value: range.max, message: `Máximo ${range.max} ${range.unit}` }
            })}
            className={`w-full rounded-md bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600 ${
              alert ? getAlertColor(alert.level) : 'border-gray-600'
            }`}
            placeholder={`${range.min}-${range.max}`}
          />
          {alert?.level === 'critical' && (
            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-400" />
          )}
          {alert?.level === 'warning' && (
            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-yellow-400" />
          )}
        </div>
        
        {/* Mostrar rangos de referencia */}
        <div className="text-xs text-gray-500 flex justify-between">
          <span>Normal: {range.warningMin}-{range.warningMax} {range.unit}</span>
          {alert?.level !== 'normal' && alert?.message && (
            <span className={alert.level === 'critical' ? 'text-red-400' : 'text-yellow-400'}>
              {alert.message}
            </span>
          )}
        </div>
        
        {validationError && (
          <p className="text-xs text-red-400">{validationError}</p>
        )}
        {errors.vitalSigns?.[fieldKey] && (
          <p className="text-xs text-red-400">{errors.vitalSigns[fieldKey]?.message}</p>
        )}
      </div>
    );
  };

  // ===== RENDER ALERTAS CRÍTICAS =====
  const renderCriticalAlerts = () => {
    if (criticalAlerts.length === 0) return null;

    return (
      <div className="mb-4 bg-red-900/20 border border-red-500 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <h3 className="text-red-300 font-medium">¡VALORES CRÍTICOS DETECTADOS!</h3>
        </div>
        <ul className="text-red-200 text-sm space-y-1">
          {criticalAlerts.map((alert, index) => (
            <li key={index} className="flex items-start">
              <span className="w-2 h-2 bg-red-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
              {alert}
            </li>
          ))}
        </ul>
        <p className="text-red-300 text-xs mt-2 font-medium">
          Se recomienda atención médica inmediata para valores críticos.
        </p>
      </div>
    );
  };

  // ===== RENDER ERRORES DE VALIDACIÓN =====
  const renderValidationErrors = () => {
    if (Object.keys(validationErrors).length === 0) return null;

    return (
      <div className="mb-4 bg-red-900/20 border border-red-500 rounded-lg p-3">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
          <span className="text-red-300 font-medium">Errores de validación:</span>
        </div>
        {Object.values(validationErrors).map((error, index) => (
          <div key={index} className="text-red-300 text-sm ml-6">
            • {error}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alertas críticas */}
      {renderCriticalAlerts()}
      
      {/* Errores de validación */}
      {renderValidationErrors()}

      {/* Estado del formulario */}
      <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Estado de guardado */}
          <div className="flex items-center">
            {/* {saveState === 'saving' && <Loader2 className="h-4 w-4 text-blue-400 mr-2 animate-spin" />} */}
            {saveState === 'saved' && <CheckCircle className="h-4 w-4 text-green-400 mr-2" />}
            {saveState === 'error' && <AlertCircle className="h-4 w-4 text-red-400 mr-2" />}
            <span className="text-sm text-gray-300">
              {saveState === 'saving' && 'Guardando...'}
              {saveState === 'saved' && `Guardado: ${lastSaved?.toLocaleTimeString()}`}
              {saveState === 'error' && 'Error al guardar'}
              {saveState === 'idle' && 'Auto-guardado activo'}
            </span>
          </div>

          {/* Indicador de completitud */}
          <div className="flex items-center">
            <Activity className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-400">
              Signos vitales: {isVitalSignsComplete() ? 'Completos' : 'Incompletos'}
            </span>
          </div>
        </div>

        {/* Fecha y hora */}
        <div className="text-xs text-gray-500">
          {watchedData.examDate} {watchedData.examTime}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información básica */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            Información del Examen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fecha del examen <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                {...register('examDate', { required: 'Fecha es requerida' })}
                className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.examDate && (
                <p className="mt-1 text-xs text-red-400">{errors.examDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Hora del examen <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                {...register('examTime', { required: 'Hora es requerida' })}
                className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.examTime && (
                <p className="mt-1 text-xs text-red-400">{errors.examTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Signos vitales */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-400" />
            Signos Vitales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(VITAL_SIGNS_RANGES).map(([field, range]) => {
              const isRequired = ['systolic_pressure', 'diastolic_pressure', 'heart_rate', 'respiratory_rate', 'temperature'].includes(field);
              return renderVitalSignField(field, range, isRequired);
            })}

            {/* IMC calculado automáticamente */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                IMC (calculado)
              </label>
              <input
                type="text"
                {...register('vitalSigns.bmi')}
                readOnly
                className="w-full rounded-md bg-gray-600 border-gray-500 text-gray-300 shadow-sm cursor-not-allowed"
                placeholder="Se calcula automáticamente"
              />
              <div className="text-xs text-gray-500">
                Calculado automáticamente con peso y altura
              </div>
            </div>
          </div>
        </div>

                 {/* Plantilla dinámica de exploración */}
         {templateDefinition ? (
           <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
             <h3 className="text-lg font-medium text-white mb-4">Plantilla Personalizada</h3>
             <p className="text-gray-400 text-sm">
               Plantilla "{templateName}" cargada. Funcionalidad completa disponible próximamente.
             </p>
           </div>
         ) : (
          /* Formulario de exploración estática */
          <div className="space-y-4">
            {template.sections.map((section) => (
              <div key={section.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">{section.title}</h3>
                
                {/* Hallazgos normales */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hallazgos normales (seleccione los aplicables):
                  </label>
                  <div className="space-y-2">
                    {section.normalFindings.map((finding, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="checkbox"
                          {...register(`sections.${section.id}.selectedFindings.${index}`)}
                          className="rounded border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-700"
                        />
                        <span className="ml-2 text-sm text-gray-300">{finding}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observaciones adicionales:
                  </label>
                  <textarea
                    {...register(`sections.${section.id}.observations`)}
                    rows={3}
                    className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describa hallazgos anormales o observaciones específicas..."
                    maxLength={2000}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Máximo 2000 caracteres
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Observaciones generales */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Observaciones Generales</h3>
          <textarea
            {...register('generalObservations', {
              maxLength: { 
                value: SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH, 
                message: `Máximo ${SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH} caracteres` 
              }
            })}
            rows={6}
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Impresión clínica general, hallazgos relevantes, recomendaciones..."
            maxLength={SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Máximo {SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH} caracteres</span>
            <span>{watchedData.generalObservations?.length || 0} / {SYSTEM_LIMITS.MAX_GENERAL_OBSERVATIONS_LENGTH}</span>
          </div>
          {errors.generalObservations && (
            <p className="mt-1 text-xs text-red-400">{errors.generalObservations.message}</p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Examen
              </>
            )}
          </button>

          {onAutoSave && (
            <button
              type="button"
              onClick={() => onAutoSave(watchedData)}
              className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Guardar Borrador
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-300 font-medium">Error:</span>
          </div>
          <p className="text-red-200 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
} 