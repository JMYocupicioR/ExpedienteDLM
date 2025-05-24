import React, { useState, useEffect } from 'react';
import { Save, Clock, Heart, FileText, CheckCircle, AlertCircle, Camera } from 'lucide-react';
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
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isValidationEnabled, setIsValidationEnabled] = useState(false);

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
  }, [templateId, setValue]);

  // Calculate BMI automatically
  useEffect(() => {
    const weight = parseFloat(watchedData.vitalSigns?.weight || '0');
    const height = parseFloat(watchedData.vitalSigns?.height || '0') / 100; // convert cm to m
    
    if (weight > 0 && height > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      setValue('vitalSigns.bmi', bmi);
    }
  }, [watchedData.vitalSigns?.weight, watchedData.vitalSigns?.height, setValue]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      onAutoSave(watchedData);
      setLastSaved(new Date());
    }, 5000); // Auto-save every 5 seconds

    setAutoSaveTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [watchedData, onAutoSave]);

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

  const onSubmit = (data: PhysicalExamFormData) => {
    setIsValidationEnabled(true);
    onSave(data);
  };

  const isVitalSignsComplete = () => {
    const vs = watchedData.vitalSigns;
    return vs?.systolic_pressure && vs?.diastolic_pressure && vs?.heart_rate && 
           vs?.respiratory_rate && vs?.temperature;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{templateName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fecha y hora del examen: {watchedData.examDate} {watchedData.examTime}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {lastSaved && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Guardado: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              Auto-guardado activo
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Examen *
            </label>
            <input
              type="date"
              {...register('examDate', { required: true })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.examDate && (
              <p className="mt-1 text-sm text-red-600">Campo requerido</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora del Examen *
            </label>
            <input
              type="time"
              {...register('examTime', { required: true })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.examTime && (
              <p className="mt-1 text-sm text-red-600">Campo requerido</p>
            )}
          </div>
        </div>

        {/* Signos Vitales */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <Heart className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Signos Vitales *</h3>
            {!isVitalSignsComplete() && isValidationEnabled && (
              <AlertCircle className="h-5 w-5 text-red-500 ml-2" />
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presión Sistólica (mmHg) *
              </label>
              <input
                type="number"
                {...register('vitalSigns.systolic_pressure', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presión Diastólica (mmHg) *
              </label>
              <input
                type="number"
                {...register('vitalSigns.diastolic_pressure', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frecuencia Cardíaca (lpm) *
              </label>
              <input
                type="number"
                {...register('vitalSigns.heart_rate', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frecuencia Respiratoria (rpm) *
              </label>
              <input
                type="number"
                {...register('vitalSigns.respiratory_rate', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperatura (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                {...register('vitalSigns.temperature', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="36.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saturación O2 (%)
              </label>
              <input
                type="number"
                {...register('vitalSigns.oxygen_saturation')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="98"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('vitalSigns.weight')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="70.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                {...register('vitalSigns.height')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="170"
              />
            </div>
            {watchedData.vitalSigns?.bmi && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMC
                </label>
                <input
                  type="text"
                  value={watchedData.vitalSigns.bmi}
                  readOnly
                  className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        {template.sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{section.title}</h3>
            
            {/* Normal/Abnormal Toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado General
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleSectionChange(section.id, 'isNormal', true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    watchedData.sections?.[section.id]?.isNormal === true
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  } border`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionChange(section.id, 'isNormal', false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    watchedData.sections?.[section.id]?.isNormal === false
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  } border`}
                >
                  Anormal
                </button>
              </div>
            </div>

            {/* Pre-defined Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hallazgos Normales
                </label>
                <div className="space-y-2">
                  {section.normalFindings.map((finding, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={watchedData.sections?.[section.id]?.selectedFindings?.includes(finding) || false}
                        onChange={() => handleFindingToggle(section.id, finding)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{finding}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hallazgos Anormales Comunes
                </label>
                <div className="space-y-2">
                  {section.commonAbnormalFindings.map((finding, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={watchedData.sections?.[section.id]?.selectedFindings?.includes(finding) || false}
                        onChange={() => handleFindingToggle(section.id, finding)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{finding}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Detalladas
              </label>
              <textarea
                value={watchedData.sections?.[section.id]?.observations || ''}
                onChange={(e) => handleSectionChange(section.id, 'observations', e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describa hallazgos específicos, técnicas utilizadas, y observaciones detalladas..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Seleccionar Archivos
                </label>
                {watchedData.sections?.[section.id]?.attachments?.length > 0 && (
                  <span className="ml-3 text-sm text-gray-500">
                    {watchedData.sections[section.id].attachments.length} archivo(s) seleccionado(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* General Observations */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Observaciones Generales</h3>
          <textarea
            {...register('generalObservations')}
            rows={6}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Comentarios generales sobre el examen físico, impresión clínica global, y cualquier observación adicional relevante..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Guardar como Borrador
          </button>
          <button
            type="submit"
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Completar Examen
          </button>
        </div>
      </form>
    </div>
  );
} 