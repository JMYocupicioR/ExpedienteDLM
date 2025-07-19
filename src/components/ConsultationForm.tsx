import React, { useState, useEffect, useCallback } from 'react';
import { Save, X, Clock, AlertCircle, CheckCircle, Eye, History, FileText, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
// ===== IMPORTACIONES DEL SISTEMA CENTRALIZADO =====
import { 
  VITAL_SIGNS_RANGES, 
  validateVitalSign, 
  SYSTEM_LIMITS 
} from '../lib/medicalConfig';
import { validateJSONBSchema } from '../lib/validation';
import { useValidation } from '../hooks/useValidation';
import DynamicPhysicalExamForm from './DynamicPhysicalExamForm';
import PhysicalExamTemplates from './PhysicalExamTemplates';
import type { 
  Database 
} from '../lib/database.types';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

interface ConsultationFormProps {
  patientId: string;
  doctorId: string;
  onClose: () => void;
  onSave: () => void;
}

interface ConsultationFormData {
  current_condition: string;
  vital_signs: {
    temperature: string;
    heart_rate: string;
    blood_pressure: string;
    respiratory_rate: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
  };
  physical_examination: any;
  diagnosis: string;
  prognosis: string;
  treatment: string;
}

interface PhysicalExamFormData {
  examDate: string;
  examTime: string;
  vitalSigns: {
    systolic_pressure: string;
    diastolic_pressure: string;
    heart_rate: string;
    respiratory_rate: string;
    temperature: string;
    oxygen_saturation: string;
    weight: string;
    height: string;
    bmi: string;
  };
  sections: Record<string, any>;
  generalObservations: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ConsultationForm({ patientId, doctorId, onClose, onSave }: ConsultationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PhysicalExamTemplate | null>(null);
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);
  const [physicalExamData, setPhysicalExamData] = useState<PhysicalExamFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ===== USAR HOOK DE VALIDACIÓN CENTRALIZADO =====
  const { validateCompleteForm, validateVitalSignsField } = useValidation();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<ConsultationFormData>({
    defaultValues: {
      current_condition: '',
      vital_signs: {
        temperature: '',
        heart_rate: '',
        blood_pressure: '',
        respiratory_rate: '',
        oxygen_saturation: '',
        weight: '',
        height: ''
      },
      physical_examination: {},
      diagnosis: '',
      prognosis: '',
      treatment: ''
    }
  });

  const watchedData = watch();

  // ===== AUTO-SAVE MEJORADO CON VALIDACIÓN CENTRALIZADA =====
  const performAutoSave = useCallback(async (data: ConsultationFormData) => {
    try {
      setSaveState('saving');
      
      // Validar usando sistema centralizado antes de guardar
      const validationResult = validateCompleteForm(data, 'consultation');
      
      // Si hay errores críticos, no auto-guardar
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        console.warn('Auto-save cancelado debido a errores de validación:', validationResult.errors);
        setSaveState('error');
        return;
      }
      
      // Save to localStorage as backup
      localStorage.setItem(`consultation_draft_${patientId}`, JSON.stringify({
        ...data,
        lastSaved: new Date().toISOString(),
        physicalExamData,
        validationWarnings: validationResult.warnings
      }));
      
      setLastAutoSave(new Date());
      setSaveState('saved');
      setHasUnsavedChanges(false);
      
      // Clear saved state after 3 seconds
      setTimeout(() => setSaveState('idle'), 3000);
      
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveState('error');
    }
  }, [patientId, physicalExamData, validateCompleteForm]);

  // ✅ NUEVO: Auto-save effect with debounce
  useEffect(() => {
    // Skip if form is empty
    if (!watchedData.current_condition && !watchedData.diagnosis && !watchedData.treatment) {
      return;
    }

    setHasUnsavedChanges(true);

    const timer = setTimeout(() => {
      performAutoSave(watchedData);
    }, 3000); // 3 second debounce

    return () => clearTimeout(timer);
  }, [watchedData, performAutoSave]);

  // ✅ NUEVO: Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const draft = localStorage.getItem(`consultation_draft_${patientId}`);
        if (draft) {
          const parsedDraft = JSON.parse(draft);
          
          // Check if draft is recent (within 24 hours)
          const draftAge = new Date().getTime() - new Date(parsedDraft.lastSaved).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (draftAge < maxAge) {
            reset(parsedDraft);
            if (parsedDraft.physicalExamData) {
              setPhysicalExamData(parsedDraft.physicalExamData);
            }
            setLastAutoSave(new Date(parsedDraft.lastSaved));
          } else {
            // Remove old draft
            localStorage.removeItem(`consultation_draft_${patientId}`);
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    loadDraft();
  }, [patientId, reset]);

  // ✅ NUEVO: Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ✅ MEJORADO: Handle template selection
  const handleTemplateSelect = (template: PhysicalExamTemplate) => {
    setSelectedTemplate(template);
    setShowPhysicalExam(true);
  };

  // ✅ NUEVO: Render dynamic fields from template
  const renderTemplateField = (field: any, sectionId: string) => {
    const fieldName = `physicalExam.${sectionId}.${field.id}`;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              placeholder={field.placeholder}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <textarea
              rows={3}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option: string) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={option}
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
        );

      case 'radio':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option: string) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={fieldName}
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
        );

      case 'number':
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <input
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
        );

      default:
        return null;
    }
  };

  // ✅ FUNCIÓN: Convertir plantilla al formato esperado por DynamicPhysicalExamForm
  const convertTemplateDefinition = (template: PhysicalExamTemplate): any => {
    if (!template?.definition?.sections) {
      return {
        sections: []
      };
    }

    // ===== CONVERTIR DE QUESTIONS A FIELDS PARA DynamicPhysicalExamForm =====
    return {
      sections: template.definition.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
        fields: section.questions?.map((question: any) => ({
          id: question.id,
          label: question.text,
          type: question.type,
          required: question.required || false,
          placeholder: question.placeholder || '',
          options: question.options || [],
          defaultValue: question.defaultValue || '',
          helpText: question.helpText || '',
          validation: question.validation || {}
        })) || [],
        order: section.order || 0
      }))
    };
  };

  // ===== NUEVO: Crear plantilla vacía para nueva plantilla =====
  const createEmptyTemplate = (): PhysicalExamTemplate => {
    return {
      id: 'new',
      name: 'Nueva Plantilla',
      doctor_id: doctorId,
      definition: {
        version: '1.0',
        sections: [{
          id: 'main_section',
          title: 'Exploración General',
          description: 'Sección principal de exploración física',
          order: 0,
                     questions: [
             {
               id: 'general_observation',
               label: 'Observación General',
               type: 'textarea',
               required: false,
               placeholder: 'Escriba sus observaciones...',
               options: []
             }
           ]
        }]
      },
             created_at: new Date().toISOString(),
       is_active: true
    };
  };

  // ✅ MEJORADO: Handle physical exam save
  const handlePhysicalExamSave = async (data: PhysicalExamFormData) => {
    try {
      setPhysicalExamData(data);
      setShowPhysicalExam(false);
      
      // Update consultation form with vital signs from physical exam
      setValue('vital_signs', {
        temperature: data.vitalSigns.temperature,
        heart_rate: data.vitalSigns.heart_rate,
        blood_pressure: `${data.vitalSigns.systolic_pressure}/${data.vitalSigns.diastolic_pressure}`,
        respiratory_rate: data.vitalSigns.respiratory_rate,
        oxygen_saturation: data.vitalSigns.oxygen_saturation,
        weight: data.vitalSigns.weight,
        height: data.vitalSigns.height
      });

      // Store detailed physical examination data
      setValue('physical_examination', {
        template_id: selectedTemplate?.id,
        template_name: selectedTemplate?.name,
        exam_date: data.examDate,
        exam_time: data.examTime,
        vital_signs: data.vitalSigns,
        sections: data.sections,
        general_observations: data.generalObservations
      });

    } catch (err) {
      console.error('Error saving physical exam:', err);
      setError('Error al guardar el examen físico');
    }
  };

  // ✅ MEJORADO: Handle physical exam auto-save
  const handlePhysicalExamAutoSave = async (data: PhysicalExamFormData) => {
    try {
      // Store physical exam data for auto-save
      setPhysicalExamData(data);
      
      // Update localStorage
      const currentDraft = localStorage.getItem(`consultation_draft_${patientId}`);
      const draft = currentDraft ? JSON.parse(currentDraft) : watchedData;
      
      localStorage.setItem(`consultation_draft_${patientId}`, JSON.stringify({
        ...draft,
        physicalExamData: data,
        lastSaved: new Date().toISOString()
      }));
      
    } catch (err) {
      console.error('Error in auto-save:', err);
    }
  };

  // ===== FUNCIÓN MEJORADA: Submit con validación robusta
  const onSubmit = async (data: ConsultationFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Validación completa usando sistema centralizado
      const validationResult = validateCompleteForm(data, 'consultation');
      
      if (!validationResult.isValid) {
        setError(`Errores de validación: ${validationResult.errors.join('; ')}`);
        return;
      }

      // Mostrar advertencias si las hay (no bloquear)
      if (validationResult.warnings.length > 0) {
        console.warn('Advertencias de consulta:', validationResult.warnings);
      }

      // Validar signos vitales específicamente si están presentes
      if (data.vital_signs) {
        const vitalSignsValidation = validateVitalSignsField(data.vital_signs, false);
        if (!vitalSignsValidation.isValid) {
          setError(`Errores en signos vitales: ${vitalSignsValidation.errors.join('; ')}`);
          return;
        }
      }

      const consultationData = {
        patient_id: patientId,
        doctor_id: doctorId,
        current_condition: data.current_condition,
        vital_signs: data.vital_signs || null,
        physical_examination: data.physical_examination || null,
        diagnosis: data.diagnosis,
        prognosis: data.prognosis || null,
        treatment: data.treatment,
        physical_exam_data: physicalExamData,
        created_at: new Date().toISOString(),
        validation_warnings: validationResult.warnings
      };

      await onSave(consultationData);
      
      // Clear draft after successful save
      localStorage.removeItem(`consultation_draft_${patientId}`);
      
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(err.message || 'Error al guardar la consulta');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Clear draft
  const clearDraft = () => {
    localStorage.removeItem(`consultation_draft_${patientId}`);
    reset();
    setPhysicalExamData(null);
    setSelectedTemplate(null);
    setLastAutoSave(null);
    setHasUnsavedChanges(false);
  };

  // ✅ NUEVO: Generate PDF
  const generatePDF = async () => {
    try {
      // This would integrate with a PDF generation library
      const consultationData = watch();
      
      // Basic PDF generation simulation
      const content = `
        CONSULTA MÉDICA
        ================
        
        Padecimiento Actual: ${consultationData.current_condition}
        Diagnóstico: ${consultationData.diagnosis}
        Pronóstico: ${consultationData.prognosis}
        Tratamiento: ${consultationData.treatment}
        
        Generado el: ${new Date().toLocaleString('es-ES')}
      `;
      
      // Create and download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consulta_${patientId}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Error al generar el PDF');
    }
  };

  // ✅ NUEVO: Render save status
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
            Guardado: {lastAutoSave?.toLocaleTimeString()}
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
        return lastAutoSave ? (
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            Última copia: {lastAutoSave.toLocaleTimeString()}
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            Auto-guardado activo
          </div>
        );
    }
  };

  if (showPhysicalExam && selectedTemplate) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-auto max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Exploración Física - {selectedTemplate.name}</h2>
          <div className="flex items-center space-x-4">
            {renderSaveStatus()}
            <button
              onClick={() => setShowPhysicalExam(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <DynamicPhysicalExamForm
            templateName={selectedTemplate.name}
            templateSections={convertTemplateDefinition(selectedTemplate).sections}
            onSave={handlePhysicalExamSave}
            onAutoSave={handlePhysicalExamAutoSave}
            initialData={physicalExamData || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto border border-gray-700">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Nueva Consulta</h2>
          {hasUnsavedChanges && (
            <p className="text-sm text-yellow-400 mt-1">• Hay cambios sin guardar</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {renderSaveStatus()}
          <button
            onClick={generatePDF}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar PDF
          </button>
          <button
            onClick={clearDraft}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* ✅ MEJORADO: Padecimiento Actual con validación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Padecimiento Actual *
            </label>
            <textarea
              {...register('current_condition', { 
                required: 'El padecimiento actual es requerido',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                maxLength: { value: 1000, message: 'Máximo 1000 caracteres' }
              })}
              rows={4}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
              placeholder="Describe el motivo de consulta y síntomas principales..."
            />
            {errors.current_condition && (
              <p className="mt-1 text-sm text-red-400">{errors.current_condition.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {watchedData.current_condition?.length || 0}/1000 caracteres
            </p>
          </div>

          {/* ✅ MEJORADO: Exploración Física */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Exploración Física</h3>
            
            {!selectedTemplate ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 bg-gray-750">
                <PhysicalExamTemplates
                  onSelectTemplate={handleTemplateSelect}
                  doctorId={doctorId}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-green-300">Plantilla Seleccionada:</h4>
                      <p className="text-green-200">{selectedTemplate.name}</p>
                      {physicalExamData && (
                        <p className="text-sm text-green-400 mt-1">
                          ✓ Examen físico completado - {physicalExamData.examDate} {physicalExamData.examTime}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowPhysicalExam(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        {physicalExamData ? 'Editar Examen' : 'Realizar Examen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(null);
                          setPhysicalExamData(null);
                        }}
                        className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors text-sm"
                      >
                        Cambiar Plantilla
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vista previa de campos de la plantilla */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="font-medium text-blue-300 mb-3">Vista Previa de la Exploración:</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedTemplate.definition?.sections?.map((section: any) => (
                      <div key={section.id} className="border border-gray-600 rounded-lg p-3 bg-gray-800/50">
                        <h5 className="font-medium text-white mb-2">{section.title}</h5>
                        {section.description && (
                          <p className="text-sm text-gray-400 mb-3">{section.description}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {section.questions?.map((question: any) => (
                            <div key={question.id} className="text-sm">
                              <span className="text-gray-300">• {question.text}</span>
                              {question.required && <span className="text-red-400"> *</span>}
                              <span className="text-gray-500 ml-2">({question.type})</span>
                              {question.options && question.options.length > 0 && (
                                <div className="ml-4 text-xs text-gray-400 mt-1">
                                  Opciones: {question.options.slice(0, 3).join(', ')}{question.options.length > 3 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-400 py-4">
                        No hay campos configurados en esta plantilla
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    💡 Haz clic en "Realizar Examen" para completar todos estos campos de forma interactiva
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ MEJORADO: Signos Vitales */}
          {physicalExamData ? (
            <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-4">Signos Vitales (del Examen Físico)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm text-gray-400">Presión Arterial</dt>
                  <dd className="text-sm font-medium text-white">
                    {physicalExamData.vitalSigns.systolic_pressure}/{physicalExamData.vitalSigns.diastolic_pressure} mmHg
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-400">Frecuencia Cardíaca</dt>
                  <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.heart_rate} lpm</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-400">Temperatura</dt>
                  <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.temperature} °C</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-400">Frecuencia Respiratoria</dt>
                  <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.respiratory_rate} rpm</dd>
                </div>
                {physicalExamData.vitalSigns.oxygen_saturation && (
                  <div>
                    <dt className="text-sm text-gray-400">Saturación O₂</dt>
                    <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.oxygen_saturation}%</dd>
                  </div>
                )}
                {physicalExamData.vitalSigns.weight && (
                  <div>
                    <dt className="text-sm text-gray-400">Peso</dt>
                    <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.weight} kg</dd>
                  </div>
                )}
                {physicalExamData.vitalSigns.height && (
                  <div>
                    <dt className="text-sm text-gray-400">Altura</dt>
                    <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.height} cm</dd>
                  </div>
                )}
                {physicalExamData.vitalSigns.bmi && (
                  <div>
                    <dt className="text-sm text-gray-400">IMC</dt>
                    <dd className="text-sm font-medium text-white">{physicalExamData.vitalSigns.bmi}</dd>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Signos Vitales Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Temperatura (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('vital_signs.temperature', {
                      min: { value: 30, message: 'Temperatura muy baja' },
                      max: { value: 45, message: 'Temperatura muy alta' }
                    })}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="36.5"
                  />
                  {errors.vital_signs?.temperature && (
                    <p className="mt-1 text-xs text-red-400">{errors.vital_signs.temperature.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Frecuencia Cardíaca (lpm)
                  </label>
                  <input
                    type="number"
                    {...register('vital_signs.heart_rate', {
                      min: { value: 30, message: 'Frecuencia muy baja' },
                      max: { value: 220, message: 'Frecuencia muy alta' }
                    })}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="70"
                  />
                  {errors.vital_signs?.heart_rate && (
                    <p className="mt-1 text-xs text-red-400">{errors.vital_signs.heart_rate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Presión Arterial (mmHg)
                  </label>
                  <input
                    type="text"
                    {...register('vital_signs.blood_pressure', {
                      pattern: {
                        value: /^\d{2,3}\/\d{2,3}$/,
                        message: 'Formato: 120/80'
                      }
                    })}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                    placeholder="120/80"
                  />
                  {errors.vital_signs?.blood_pressure && (
                    <p className="mt-1 text-xs text-red-400">{errors.vital_signs.blood_pressure.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ MEJORADO: Diagnóstico con validación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Diagnóstico *
            </label>
            <textarea
              {...register('diagnosis', { 
                required: 'El diagnóstico es requerido',
                minLength: { value: 5, message: 'Mínimo 5 caracteres' },
                maxLength: { value: 500, message: 'Máximo 500 caracteres' }
              })}
              rows={3}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
              placeholder="Diagnóstico principal y diferenciales..."
            />
            {errors.diagnosis && (
              <p className="mt-1 text-sm text-red-400">{errors.diagnosis.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {watchedData.diagnosis?.length || 0}/500 caracteres
            </p>
          </div>

          {/* ✅ MEJORADO: Pronóstico con validación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pronóstico *
            </label>
            <textarea
              {...register('prognosis', { 
                required: 'El pronóstico es requerido',
                minLength: { value: 5, message: 'Mínimo 5 caracteres' },
                maxLength: { value: 300, message: 'Máximo 300 caracteres' }
              })}
              rows={2}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
              placeholder="Pronóstico esperado..."
            />
            {errors.prognosis && (
              <p className="mt-1 text-sm text-red-400">{errors.prognosis.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {watchedData.prognosis?.length || 0}/300 caracteres
            </p>
          </div>

          {/* ✅ MEJORADO: Tratamiento con validación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tratamiento *
            </label>
            <textarea
              {...register('treatment', { 
                required: 'El tratamiento es requerido',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                maxLength: { value: 1000, message: 'Máximo 1000 caracteres' }
              })}
              rows={4}
              className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
              placeholder="Plan de tratamiento, medicamentos, recomendaciones..."
            />
            {errors.treatment && (
              <p className="mt-1 text-sm text-red-400">{errors.treatment.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {watchedData.treatment?.length || 0}/1000 caracteres
            </p>
          </div>
        </div>

        {/* ✅ MEJORADO: Submit buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !selectedTemplate || !physicalExamData}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Consulta
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}