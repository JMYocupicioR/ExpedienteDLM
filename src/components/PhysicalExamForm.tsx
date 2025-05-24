import React, { useState, useEffect, useCallback } from 'react';
import { Save, Clock, Heart, FileText, CheckCircle, AlertCircle, Camera, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

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

interface PhysicalExamFormData {
  examDate: string;
  examTime: string;
  vitalSigns: VitalSigns;
  sections: Record<string, ExaminationSection>;
  generalObservations: string;
}

interface PhysicalExamFormProps {
  templateId: string;
  templateName: string;
  onSave: (data: PhysicalExamFormData) => void;
  onAutoSave: (data: PhysicalExamFormData) => void;
  initialData?: Partial<PhysicalExamFormData>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Validaciones médicas
const VITAL_SIGNS_RANGES = {
  systolic_pressure: { min: 70, max: 250, unit: 'mmHg' },
  diastolic_pressure: { min: 40, max: 150, unit: 'mmHg' },
  heart_rate: { min: 30, max: 220, unit: 'lpm' },
  respiratory_rate: { min: 8, max: 50, unit: 'rpm' },
  temperature: { min: 30, max: 45, unit: '°C' },
  oxygen_saturation: { min: 70, max: 100, unit: '%' },
  weight: { min: 1, max: 300, unit: 'kg' },
  height: { min: 30, max: 250, unit: 'cm' }
};

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
  onSave, 
  onAutoSave, 
  initialData 
}: PhysicalExamFormProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [criticalAlerts, setCriticalAlerts] = useState<string[]>([]);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PhysicalExamFormData>({
    defaultValues: {
      examDate: new Date().toISOString().split('T')[0],
      examTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      vitalSigns: {
        systolic_pressure: '',
        diastolic_pressure: '',
        heart_rate: '',
        respiratory_rate: '',
        temperature: '',
        oxygen_saturation: '',
        weight: '',
        height: '',
        bmi: ''
      },
      sections: {},
      generalObservations: '',
      ...initialData
    }
  });

  const watchedData = watch();
  const template = EXAMINATION_TEMPLATES[templateId as keyof typeof EXAMINATION_TEMPLATES] || EXAMINATION_TEMPLATES.general;

  // ✅ CORREGIDO: Auto-save con cleanup apropiado
  const stableAutoSave = useCallback((data: PhysicalExamFormData) => {
    onAutoSave(data);
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
    }, 3000); // Reducido a 3 segundos para mejor UX

    return () => clearTimeout(timer); // ✅ Cleanup correcto
  }, [watchedData, stableAutoSave]);

  // ✅ NUEVO: Validación de signos vitales en tiempo real
  const validateVitalSign = (field: keyof VitalSigns, value: string): string | null => {
    if (!value) return null;
    
    const numValue = parseFloat(value);
    const range = VITAL_SIGNS_RANGES[field];
    
    if (isNaN(numValue)) {
      return 'Valor inválido';
    }
    
    if (numValue < range.min || numValue > range.max) {
      return `Valor fuera del rango normal (${range.min}-${range.max} ${range.unit})`;
    }
    
    return null;
  };

  // ✅ NUEVO: Alertas críticas automáticas
  const checkCriticalAlerts = useCallback((vitalSigns: VitalSigns) => {
    const alerts: string[] = [];
    
    const systolic = parseFloat(vitalSigns.systolic_pressure);
    const diastolic = parseFloat(vitalSigns.diastolic_pressure);
    const heartRate = parseFloat(vitalSigns.heart_rate);
    const temperature = parseFloat(vitalSigns.temperature);
    const oxygenSat = parseFloat(vitalSigns.oxygen_saturation);
    
    // Alertas críticas
    if (systolic > 180 || diastolic > 110) alerts.push('🚨 CRISIS HIPERTENSIVA');
    if (systolic < 90 || diastolic < 60) alerts.push('⚠️ HIPOTENSIÓN SEVERA');
    if (heartRate > 120) alerts.push('🚨 TAQUICARDIA SEVERA');
    if (heartRate < 50) alerts.push('⚠️ BRADICARDIA SEVERA');
    if (temperature > 39.5) alerts.push('🚨 FIEBRE ALTA');
    if (temperature < 35) alerts.push('🚨 HIPOTERMIA');
    if (oxygenSat < 90) alerts.push('🚨 SATURACIÓN CRÍTICA');
    
    setCriticalAlerts(alerts);
  }, []);

  // Initialize sections
  useEffect(() => {
    const initialSections: Record<string, ExaminationSection> = {};
    template.sections.forEach(section => {
      initialSections[section.id] = {
        id: section.id,
        title: section.title,
        normalFindings: section.normalFindings,
        commonAbnormalFindings: section.commonAbnormalFindings,
        observations: '',
        isNormal: null,
        selectedFindings: [],
        attachments: []
      };
    });
    setValue('sections', initialSections);
  }, [templateId, setValue, template.sections]);

  // ✅ MEJORADO: Calculate BMI with validation
  useEffect(() => {
    const weight = parseFloat(watchedData.vitalSigns?.weight || '0');
    const height = parseFloat(watchedData.vitalSigns?.height || '0') / 100;
    
    if (weight > 0 && height > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      setValue('vitalSigns.bmi', bmi);
    }
  }, [watchedData.vitalSigns?.weight, watchedData.vitalSigns?.height, setValue]);

  // ✅ NUEVO: Check vital signs alerts
  useEffect(() => {
    if (watchedData.vitalSigns) {
      checkCriticalAlerts(watchedData.vitalSigns);
    }
  }, [watchedData.vitalSigns, checkCriticalAlerts]);

  const handleSectionChange = (sectionId: string, field: string, value: any) => {
    setValue(`sections.${sectionId}.${field}`, value);
  };

  const handleFindingToggle = (sectionId: string, finding: string) => {
    const currentSection = watchedData.sections?.[sectionId];
    if (!currentSection) return;

    const currentFindings = currentSection.selectedFindings || [];
    const newFindings = currentFindings.includes(finding)
      ? currentFindings.filter(f => f !== finding)
      : [...currentFindings, finding];

    handleSectionChange(sectionId, 'selectedFindings', newFindings);
  };

  const handleFileUpload = (sectionId: string, files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const currentSection = watchedData.sections?.[sectionId];
    const currentAttachments = currentSection?.attachments || [];
    
    handleSectionChange(sectionId, 'attachments', [...currentAttachments, ...newFiles]);
  };

  // ✅ MEJORADO: Validation with better error handling
  const onSubmit = async (data: PhysicalExamFormData) => {
    try {
      setSaveState('saving');
      setValidationErrors({});
      
      // Validate vital signs
      const errors: Record<string, string> = {};
      Object.entries(data.vitalSigns).forEach(([key, value]) => {
        if (key !== 'bmi' && value) {
          const error = validateVitalSign(key as keyof VitalSigns, value);
          if (error) {
            errors[key] = error;
          }
        }
      });
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setSaveState('error');
        return;
      }
      
      await onSave(data);
      setSaveState('saved');
      
    } catch (error) {
      console.error('Error saving physical exam:', error);
      setSaveState('error');
    }
  };

  const isVitalSignsComplete = () => {
    const vs = watchedData.vitalSigns;
    return vs?.systolic_pressure && vs?.diastolic_pressure && vs?.heart_rate && 
           vs?.respiratory_rate && vs?.temperature;
  };

  // ✅ NUEVO: Render save status indicator
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

      {/* ✅ NUEVO: Critical Alerts */}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha del Examen *
            </label>
            <input
              type="date"
              {...register('examDate', { required: 'La fecha es requerida' })}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
            />
            {errors.examDate && (
              <p className="mt-1 text-sm text-red-400">{errors.examDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hora del Examen *
            </label>
            <input
              type="time"
              {...register('examTime', { required: 'La hora es requerida' })}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
            />
            {errors.examTime && (
              <p className="mt-1 text-sm text-red-400">{errors.examTime.message}</p>
            )}
          </div>
        </div>

        {/* ✅ MEJORADO: Signos Vitales con validación */}
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
              const validationError = fieldValue ? validateVitalSign(fieldKey, fieldValue) : null;
              
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

        {/* Sections */}
        {template.sections.map((section) => (
          <div key={section.id} className="border border-gray-600 rounded-lg p-6 bg-gray-750">
            <h3 className="text-lg font-medium text-white mb-4">{section.title}</h3>
            
            {/* Normal/Abnormal Toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estado General
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleSectionChange(section.id, 'isNormal', true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    watchedData.sections?.[section.id]?.isNormal === true
                      ? 'bg-green-600 text-white border-green-500'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  } border`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionChange(section.id, 'isNormal', false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    watchedData.sections?.[section.id]?.isNormal === false
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  } border`}
                >
                  Anormal
                </button>
              </div>
            </div>

            {/* Pre-defined Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hallazgos Normales
                </label>
                <div className="space-y-2">
                  {section.normalFindings.map((finding, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={watchedData.sections?.[section.id]?.selectedFindings?.includes(finding) || false}
                        onChange={() => handleFindingToggle(section.id, finding)}
                        className="rounded border-gray-500 text-green-600 focus:ring-green-500 bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-300">{finding}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hallazgos Anormales Comunes
                </label>
                <div className="space-y-2">
                  {section.commonAbnormalFindings.map((finding, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={watchedData.sections?.[section.id]?.selectedFindings?.includes(finding) || false}
                        onChange={() => handleFindingToggle(section.id, finding)}
                        className="rounded border-gray-500 text-red-600 focus:ring-red-500 bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-300">{finding}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observaciones Detalladas
              </label>
              <textarea
                value={watchedData.sections?.[section.id]?.observations || ''}
                onChange={(e) => handleSectionChange(section.id, 'observations', e.target.value)}
                rows={4}
                className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                placeholder="Describa hallazgos específicos, técnicas utilizadas, y observaciones detalladas..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Adjuntar Imágenes/Diagramas
              </label>
              <div className="flex items-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(section.id, e.target.files)}
                  className="hidden"
                  id={`file-${section.id}`}
                />
                <label
                  htmlFor={`file-${section.id}`}
                  className="flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Seleccionar Archivos
                </label>
                {watchedData.sections?.[section.id]?.attachments?.length > 0 && (
                  <span className="ml-3 text-sm text-gray-400">
                    {watchedData.sections[section.id].attachments.length} archivo(s) seleccionado(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* General Observations */}
        <div className="border border-gray-600 rounded-lg p-6 bg-gray-750">
          <h3 className="text-lg font-medium text-white mb-4">Observaciones Generales</h3>
          <textarea
            {...register('generalObservations')}
            rows={6}
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
            placeholder="Comentarios generales sobre el examen físico, impresión clínica global, y cualquier observación adicional relevante..."
          />
        </div>

        {/* ✅ MEJORADO: Submit Button con estados */}
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