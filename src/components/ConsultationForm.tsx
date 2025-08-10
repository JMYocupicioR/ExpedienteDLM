import React, { useState, useEffect, useCallback } from 'react';
import { Save, X, Clock, AlertCircle, CheckCircle, FileText, Loader2, Mic, Upload, FlaskConical, Microscope, Pill, Plus, Trash2 } from 'lucide-react';
import UploadDropzone from './UploadDropzone';
import { useForm } from 'react-hook-form';
// ===== IMPORTACIONES DEL SISTEMA CENTRALIZADO =====
import { useValidation } from '../hooks/useValidation';
import { usePhysicalExam } from '../hooks/usePhysicalExam';
import { supabase } from '../lib/supabase';
import DynamicPhysicalExamForm from './DynamicPhysicalExamForm';
import PhysicalExamTemplates from './PhysicalExamTemplates';
import MedicalTranscription from './MedicalTranscription'; // ✅ NUEVO: Importar el componente de transcripción
import ScalePicker from './ScalePicker';
import ScaleStepper from './ScaleStepper';
import AppointmentQuickScheduler from './AppointmentQuickScheduler';
import MedicalScalesPanel from './MedicalScalesPanel';
import type { 
  Database 
} from '../lib/database.types';
import { calculatePrescriptionExpiry } from '../lib/medicalConfig';

type PhysicalExamTemplate = Database['public']['Tables']['physical_exam_templates']['Row'];

// ✅ NUEVO: Tipos para la definición de la plantilla
interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
  text?: string; // Para la vista previa
  validation?: {
    min?: number;
    max?: number;
  };
}

interface Section {
  id: string;
  title: string;
  description?: string;
  order?: number;
  questions?: Question[];
}

interface TemplateDefinition {
  version: string;
  sections: Section[];
}

interface ConsultationFormProps {
  patientId: string;
  doctorId: string;
  onClose: () => void;
  onSave: (data: any) => Promise<string | void> | string | void;
  patientName?: string;
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

interface ConsultationDraft extends ConsultationFormData {
  lastSaved: string;
  physicalExamData?: PhysicalExamFormData | null;
  validationWarnings?: string[];
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

// ===== Tipos para Escalas Médicas (simple draft integrado) =====
type ScaleOption = { label: string; value: number | string };
type ScaleItem = { id: string; text: string; type: 'select' | 'number' | 'text'; options?: ScaleOption[] };
type ScaleDefinition = { items?: ScaleItem[]; scoring?: { average?: boolean; ranges?: Array<{ min: number; max: number; severity: string }> } };
interface PendingScaleEntry { scaleId: string; scaleName: string; definition: ScaleDefinition; answers: Record<string, unknown>; }

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ConsultationForm({ patientId, doctorId, onClose, onSave, patientName }: ConsultationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PhysicalExamTemplate | null>(null);
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);
  const [physicalExamData, setPhysicalExamData] = useState<PhysicalExamFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTranscriptionModalOpen, setIsTranscriptionModalOpen] = useState(false); // ✅ NUEVO: Estado para el modal
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [savedConsultationId, setSavedConsultationId] = useState<string | null>(null);
  // Escalas médicas (draft antes de guardar la consulta)
  const [availableScales, setAvailableScales] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingScales, setPendingScales] = useState<PendingScaleEntry[]>([]);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperScale, setStepperScale] = useState<PendingScaleEntry | null>(null);
  // Archivos a adjuntar a estudios desde la consulta
  const [attachedFiles, setAttachedFiles] = useState<{ category: 'gabinete' | 'laboratorio' | 'otro'; files: File[] }[]>([]);
  // ===== Nuevo: Emisión rápida de receta al final =====
  const [showPrescriptionModule, setShowPrescriptionModule] = useState<boolean>(false);
  const [emitPrescriptionAfterSave, setEmitPrescriptionAfterSave] = useState<boolean>(false);
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState<string>('');
  const [prescriptionNotes, setPrescriptionNotes] = useState<string>('');
  type RxMedication = { name: string; dosage: string; frequency: string; duration: string; instructions?: string };
  const [rxMedications, setRxMedications] = useState<RxMedication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);

  // ===== USAR HOOK DE VALIDACIÓN CENTRALIZADO =====
  const { validateCompleteForm, validateVitalSignsField, validateMedicationsField } = useValidation();
  const { listActiveScales, saveScaleAssessment } = usePhysicalExam({ patientId, doctorId });

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
  // ===== Cargar listado de escalas activas =====
  useEffect(() => {
    (async () => {
      try {
        const data = await listActiveScales();
        setAvailableScales(data);
      } catch (e) {
        console.error('Error cargando escalas', e);
      }
    })();
  }, [listActiveScales]);

  // ===== Funciones de Escalas (Draft) =====
  const handleAddScale = async (scaleId: string) => {
    if (!scaleId || pendingScales.some(s => s.scaleId === scaleId)) return;
    try {
      const { data, error } = await supabase
        .from('medical_scales')
        .select('name, definition')
        .eq('id', scaleId)
        .single();
      if (error) throw error;
      setPendingScales(prev => [...prev, { scaleId, scaleName: data.name, definition: data.definition as ScaleDefinition, answers: {} }]);
    } catch (e) {
      console.error('Error agregando escala', e);
    }
  };

  const handleRemoveScale = (scaleId: string) => {
    setPendingScales(prev => prev.filter(s => s.scaleId !== scaleId));
  };

  const openStepper = (entry: PendingScaleEntry) => {
    setStepperScale(entry);
    setStepperOpen(true);
  };

  const computeScore = (def?: ScaleDefinition, answers?: Record<string, unknown>) => {
    if (!def?.items || !answers) return null;
    const vals: number[] = [];
    for (const item of def.items) {
      const v = answers[item.id];
      if (typeof v === 'number') vals.push(v);
      else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) vals.push(Number(v));
    }
    if (vals.length === 0) return 0;
    if (def.scoring?.average) return vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.reduce((a, b) => a + b, 0);
  };

  const computeSeverity = (def?: ScaleDefinition, score?: number | null) => {
    if (!def?.scoring?.ranges || typeof score !== 'number') return null;
    const r = def.scoring.ranges.find(x => score >= x.min && score <= x.max);
    return r?.severity || null;
  };

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
          const parsedDraft: ConsultationDraft = JSON.parse(draft);
          
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

  // ✅ FUNCIÓN: Convertir plantilla al formato esperado por DynamicPhysicalExamForm
  const convertTemplateDefinition = (template: PhysicalExamTemplate): { sections: any[] } => {
    const definition = template.definition as TemplateDefinition | null;

    if (!definition?.sections) {
      return {
        sections: []
      };
    }
    
    // ===== CONVERTIR DE QUESTIONS A FIELDS PARA DynamicPhysicalExamForm =====
    return {
      sections: definition.sections.map((section: Section) => ({
        id: section.id,
        title: section.title,
        description: section.description || '',
        order: section.order || 0,
        fields: section.questions?.map((question: Question) => ({
          id: question.id,
          label: question.label,
          type: question.type,
          required: question.required || false,
          placeholder: question.placeholder || '',
          options: question.options || [],
          defaultValue: question.defaultValue || '',
          helpText: question.helpText || ''
        })) || []
      }))
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

    } catch (err: unknown) {
      console.error('Error saving physical exam:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar el examen físico');
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
      
    } catch (err: unknown) {
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
        validation_warnings: validationResult.warnings
      };

      const maybeId = await onSave(consultationData);
      if (typeof maybeId === 'string') {
        setSavedConsultationId(maybeId);
        // Si se solicitó emitir receta, crearla y vincularla a la consulta
        if (emitPrescriptionAfterSave && showPrescriptionModule) {
          try {
            await createAndLinkPrescription(maybeId);
          } catch (e) {
            console.error('Error emitiendo receta desde consulta:', e);
            setError('La consulta se guardó, pero hubo un problema al emitir la receta.');
          } finally {
            setEmitPrescriptionAfterSave(false);
          }
        }
        // Guardar evaluaciones de escalas pendientes ahora que tenemos consultation_id
        if (pendingScales.length > 0) {
          for (const s of pendingScales) {
            const score = computeScore(s.definition, s.answers);
            const severity = computeSeverity(s.definition, score ?? null) || undefined;
            try {
              await saveScaleAssessment({
                consultationId: maybeId,
                scaleId: s.scaleId,
                answers: s.answers,
                score: typeof score === 'number' ? score : undefined,
                severity
              });
            } catch (e) {
              console.error('Error guardando evaluación de escala', s.scaleId, e);
            }
          }
        }

        // Subir archivos adjuntos como estudios automáticamente
        if (attachedFiles.length > 0) {
          for (const group of attachedFiles) {
            for (const file of group.files) {
              try {
                // Crear registro del estudio
                const { data: newStudy, error: insertError } = await supabase
                  .from('medical_tests')
                  .insert({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    category: group.category,
                    test_name: file.name,
                    status: 'completed',
                    ordered_date: new Date().toISOString().slice(0,10),
                    result_date: new Date().toISOString().slice(0,10),
                    notes: 'Archivo subido desde Nueva Consulta'
                  })
                  .select('id')
                  .single();
                if (insertError || !newStudy) throw insertError;

                // Subir archivo a storage y registrar en medical_test_files
                const path = `studies/${patientId}/${newStudy.id}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                  .from('medical-files')
                  .upload(path, file);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('medical-files').getPublicUrl(path);
                await supabase.from('medical_test_files').insert({
                  medical_test_id: newStudy.id,
                  file_name: file.name,
                  file_path: path,
                  file_url: urlData.publicUrl,
                  file_type: file.type,
                  file_size: file.size,
                  uploaded_by: doctorId
                });
              } catch (e) {
                console.error('Error subiendo estudio desde consulta', e);
              }
            }
          }
        }
      }
      
      // Clear draft after successful save
      localStorage.removeItem(`consultation_draft_${patientId}`);
      
      // Marcar como guardada y mostrar opción de agendar cita
      setConsultationSaved(true);
      
    } catch (err: unknown) {
      console.error('Error saving consultation:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la consulta');
    } finally {
      setLoading(false);
    }
  };

  // ===== Nuevo: Crear receta y vincularla a la consulta guardada =====
  const createAndLinkPrescription = async (consultationId: string) => {
    const filledMeds = rxMedications.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (filledMeds.length === 0) {
      throw new Error('Debe agregar al menos un medicamento para emitir la receta');
    }

    const medsValidation = validateMedicationsField(filledMeds);
    if (!medsValidation.isValid) {
      throw new Error(`Errores en medicamentos: ${medsValidation.errors.join('; ')}`);
    }

    const finalDiagnosis = (prescriptionDiagnosis || '').trim() || (watchedData.diagnosis || '').trim();
    if (!finalDiagnosis) {
      throw new Error('El diagnóstico de la receta es requerido');
    }

    let visualLayoutToSave: any = null;
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: tpl } = await supabase
        .from('prescription_templates')
        .select('style_definition')
        .eq('user_id', authData.user.id)
        .single();
      if (tpl?.style_definition) visualLayoutToSave = tpl.style_definition;
    }

    const expires = calculatePrescriptionExpiry(filledMeds.map(m => m.name)).toISOString();

    const { data: inserted, error: rxError } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        consultation_id: consultationId,
        medications: filledMeds,
        diagnosis: finalDiagnosis,
        notes: (prescriptionNotes || watchedData.treatment || '').toString(),
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: expires,
        visual_layout: visualLayoutToSave || null
      })
      .select('id')
      .single();

    if (rxError || !inserted) throw rxError || new Error('No se pudo crear la receta');

    const { error: linkError } = await supabase
      .from('consultation_prescriptions')
      .insert({ consultation_id: consultationId, prescription_id: inserted.id });
    if (linkError) console.warn('La receta fue creada pero no se pudo vincular a la consulta:', linkError.message);
  };

  // ✅ MEJORADO: Manejar el texto aplicado desde el modal de transcripción
  // Ahora integra el nuevo texto con el contenido existente en lugar de reemplazarlo
  const handleApplyTranscription = (text: string) => {
    const currentValue = watchedData.current_condition || '';
    const newValue = currentValue.trim() 
      ? `${currentValue.trim()}\n\n${text.trim()}` 
      : text.trim();
    
    setValue('current_condition', newValue, { shouldValidate: true, shouldDirty: true });
    setHasUnsavedChanges(true);
  };

  const handleAppointmentScheduled = () => {
    // Cerrar el formulario después de agendar la cita
    onClose();
  };

  const handleSkipAppointment = () => {
    // Cerrar sin agendar cita
    onClose();
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
      
    } catch (err: unknown) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'Error al generar el PDF');
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
      <div className="rounded-lg shadow-xl max-w-6xl w-full mx-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
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
    <>
      <div className="rounded-lg shadow-xl max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
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
            {/* ✅ MEJORADO: Padecimiento Actual con validación y botón de IA */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Padecimiento Actual *
                </label>
                <button
                  type="button"
                  onClick={() => setIsTranscriptionModalOpen(true)}
                  className="flex items-center px-3 py-1 text-xs font-medium text-cyan-300 bg-cyan-900/50 rounded-md hover:bg-cyan-800/70 transition-colors"
                  title="Usar Asistente de Transcripción con IA"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Asistente IA
                </button>
              </div>
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
                      {(selectedTemplate.definition as TemplateDefinition)?.sections?.map((section: Section) => (
                        <div key={section.id} className="border border-gray-600 rounded-lg p-3 bg-gray-800/50">
                          <h5 className="font-medium text-white mb-2">{section.title}</h5>
                          {section.description && (
                            <p className="text-sm text-gray-400 mb-3">{section.description}</p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {section.questions?.map((question: Question) => (
                              <div key={question.id} className="text-sm">
                                <span className="text-gray-300">• {question.text || question.label}</span>
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
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <input
                        type="text"
                        {...register('vital_signs.blood_pressure', {
                          pattern: {
                            value: /^\d{2,3}\/\d{2,3}$/,
                            message: 'Formato: 120/80'
                          }
                        })}
                        className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        placeholder="120/80"
                        title="Puede escribir 120/80 y se derivará sistólica/diastólica"
                      />
                      <input
                        type="number"
                        {...register('vital_signs.systolic_pressure', {
                          min: { value: 60, message: 'Sistólica muy baja' },
                          max: { value: 250, message: 'Sistólica muy alta' }
                        })}
                        className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        placeholder="Sistólica"
                        title="Sistólica"
                      />
                      <input
                        type="number"
                        {...register('vital_signs.diastolic_pressure', {
                          min: { value: 30, message: 'Diastólica muy baja' },
                          max: { value: 150, message: 'Diastólica muy alta' }
                        })}
                        className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                        placeholder="Diastólica"
                        title="Diastólica"
                      />
                    </div>
                    {errors.vital_signs?.blood_pressure && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.blood_pressure.message}</p>
                    )}
                    {errors.vital_signs?.systolic_pressure && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.systolic_pressure.message}</p>
                    )}
                    {errors.vital_signs?.diastolic_pressure && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.diastolic_pressure.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Saturación O₂ (%)
                    </label>
                    <input
                      type="number"
                      {...register('vital_signs.oxygen_saturation', {
                        min: { value: 50, message: 'Saturación muy baja' },
                        max: { value: 100, message: 'Saturación inválida' }
                      })}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      placeholder="98"
                    />
                    {errors.vital_signs?.oxygen_saturation && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.oxygen_saturation.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('vital_signs.weight', {
                        min: { value: 2, message: 'Peso inválido' },
                        max: { value: 400, message: 'Peso inválido' }
                      })}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      placeholder="70.0"
                    />
                    {errors.vital_signs?.weight && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.weight.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('vital_signs.height', {
                        min: { value: 30, message: 'Altura inválida' },
                        max: { value: 250, message: 'Altura inválida' }
                      })}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                      placeholder="170"
                    />
                    {errors.vital_signs?.height && (
                      <p className="mt-1 text-xs text-red-400">{errors.vital_signs.height.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ NUEVO: Escalas médicas (antes de Diagnóstico) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white">Escalas médicas</h3>
                <div className="flex items-center space-x-2">
                  <select
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                    defaultValue=""
                    onChange={(e) => {
                      handleAddScale(e.target.value);
                      e.currentTarget.value = '';
                    }}
                  >
                    <option value="">Agregar escala...</option>
                    {availableScales.filter(s => !pendingScales.some(p => p.scaleId === s.id)).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {pendingScales.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Selecciona una escala para agregarla a esta consulta o ábrela para capturarla en una ventana dedicada.</p>
                  <ScalePicker
                    patientId={patientId}
                    doctorId={doctorId}
                    consultationId={savedConsultationId || null}
                    onAddScale={(scale) => handleAddScale(scale.id)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingScales.map((entry) => {
                    const score = computeScore(entry.definition, entry.answers);
                    const severity = computeSeverity(entry.definition, score ?? null);
                    return (
                      <div key={entry.scaleId} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{entry.scaleName}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveScale(entry.scaleId)}
                            className="text-sm text-gray-300 hover:text-white"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="space-y-3">
                          {entry.definition.items?.map(item => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                              <label className="text-sm text-gray-300">{item.text}</label>
                              {item.type === 'select' ? (
                                <select
                                  value={(entry.answers[item.id] as string | number | undefined) ?? ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const num = Number(raw);
                                    setPendingScales(prev => prev.map(p => p.scaleId === entry.scaleId ? ({
                                      ...p,
                                      answers: { ...p.answers, [item.id]: isNaN(num) ? raw : num }
                                    }) : p));
                                  }}
                                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                                >
                                  <option value="">Seleccionar...</option>
                                  {item.options?.map(opt => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : item.type === 'number' ? (
                                <input
                                  type="number"
                                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                                  value={(entry.answers[item.id] as number | undefined) ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPendingScales(prev => prev.map(p => p.scaleId === entry.scaleId ? ({
                                      ...p,
                                      answers: { ...p.answers, [item.id]: v === '' ? '' : Number(v) }
                                    }) : p));
                                  }}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                                  value={(entry.answers[item.id] as string | undefined) ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPendingScales(prev => prev.map(p => p.scaleId === entry.scaleId ? ({
                                      ...p,
                                      answers: { ...p.answers, [item.id]: v }
                                    }) : p));
                                  }}
                                />
                              )}
                            </div>
                          ))}
                          <div className="text-sm text-gray-300">
                            Puntuación: <span className="font-semibold text-white">{typeof score === 'number' ? score.toFixed(2) : '-'}</span>
                            {severity && <span className="ml-3">Severidad: <span className="font-semibold text-white">{severity}</span></span>}
                          </div>
                          <div className="pt-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
                              onClick={() => {
                                setStepperScale(entry);
                                setStepperOpen(true);
                              }}
                            >
                              Capturar en modo paso a paso
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

            {/* ✅ NUEVO: Escalas médicas integradas */}
            {savedConsultationId && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Escalas Médicas</h3>
                <MedicalScalesPanel
                  patientId={patientId}
                  doctorId={doctorId}
                  consultationId={savedConsultationId}
                />
              </div>
            )}

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

          {/* ✅ NUEVO: Adjuntar estudios desde la consulta */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-3">Adjuntar archivos a Estudios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                { id: 'gabinete', label: 'Gabinete', icon: FlaskConical },
                { id: 'laboratorio', label: 'Laboratorio', icon: Microscope },
                { id: 'otro', label: 'Otros', icon: Upload }
              ] as const).map(({ id, label, icon: Icon }) => (
                <div key={id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-gray-200">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <UploadDropzone
                    onFilesSelected={(files) => setAttachedFiles(prev => {
                      const current = prev.find(p => p.category === (id as any));
                      if (current) {
                        return prev.map(p => p.category === (id as any) ? ({ ...p, files: [...p.files, ...files] }) : p);
                      }
                      return [...prev, { category: id as any, files }];
                    })}
                  />
                </div>
              ))}
            </div>
            {attachedFiles.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">Los archivos se subirán automáticamente al guardar la consulta y aparecerán en la sección de Estudios.</p>
            )}
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
            <button
              type="button"
              onClick={() => {
                setEmitPrescriptionAfterSave(true);
                (document.activeElement as HTMLElement)?.blur();
                // @ts-ignore invoke submit programmatically
                handleSubmit(onSubmit)();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                loading || !selectedTemplate || !physicalExamData || !showPrescriptionModule ||
                rxMedications.filter(m => m.name && m.dosage && m.frequency && m.duration).length === 0
              }
              title={!showPrescriptionModule ? 'Activa el módulo de receta abajo' : 'Guardar consulta y emitir receta'}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar y Emitir Receta
            </button>
          </div>
        </form>
      </div>

      {/* ===== Nuevo: Módulo de Emisión de Receta Rápida ===== */}
      <div className="max-w-4xl w-full mx-auto mt-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-200">
              <Pill className="h-5 w-5 text-cyan-400" />
              <span className="font-medium">Emitir receta al finalizar</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={showPrescriptionModule} onChange={(e) => setShowPrescriptionModule(e.target.checked)} />
              Activar módulo
            </label>
          </div>

          {showPrescriptionModule && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Diagnóstico para receta</label>
                  <input
                    type="text"
                    value={prescriptionDiagnosis}
                    onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                    placeholder={watchedData.diagnosis || 'Usará el diagnóstico de la consulta si se deja vacío'}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Notas/Indicaciones</label>
                  <input
                    type="text"
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder={watchedData.treatment || 'Opcional'}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-300">Medicamentos</label>
                  <button
                    type="button"
                    onClick={() => setRxMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }])}
                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {rxMedications.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                      <input
                        placeholder="Nombre"
                        value={m.name}
                        onChange={(e) => setRxMedications(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-gray-200"
                      />
                      <input
                        placeholder="Dosis"
                        value={m.dosage}
                        onChange={(e) => setRxMedications(prev => prev.map((x, i) => i === idx ? { ...x, dosage: e.target.value } : x))}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-gray-200"
                      />
                      <input
                        placeholder="Frecuencia"
                        value={m.frequency}
                        onChange={(e) => setRxMedications(prev => prev.map((x, i) => i === idx ? { ...x, frequency: e.target.value } : x))}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-gray-200"
                      />
                      <input
                        placeholder="Duración"
                        value={m.duration}
                        onChange={(e) => setRxMedications(prev => prev.map((x, i) => i === idx ? { ...x, duration: e.target.value } : x))}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-gray-200"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Instrucciones (opcional)"
                          value={m.instructions || ''}
                          onChange={(e) => setRxMedications(prev => prev.map((x, i) => i === idx ? { ...x, instructions: e.target.value } : x))}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-gray-200"
                        />
                        {rxMedications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRxMedications(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300"
                            title="Quitar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Para habilitar el botón "Guardar y Emitir Receta", ingresa al menos un medicamento completo.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Éxito con Opción de Agendar Cita */}
      {consultationSaved && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                ¡Consulta Guardada!
              </h3>
              <p className="text-gray-400">
                La consulta se ha guardado correctamente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4 border border-cyan-500">
                <h4 className="text-white font-medium mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                  ¿Deseas programar la próxima cita?
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  Programa fácilmente la siguiente cita para {patientName || 'este paciente'}.
                </p>
                
                {patientName && (
                  <AppointmentQuickScheduler
                    patientId={patientId}
                    patientName={patientName}
                    onScheduled={handleAppointmentScheduled}
                  />
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSkipAppointment}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Omitir por Ahora
                </button>
                <button
                  onClick={() => setShowAppointmentScheduler(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-colors"
                >
                  Más Opciones
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MedicalTranscription
          isOpen={isTranscriptionModalOpen}
          onClose={() => setIsTranscriptionModalOpen(false)}
          onApplyText={handleApplyTranscription}
        />

      {stepperScale && (
        <ScaleStepper
          isOpen={stepperOpen}
          onClose={() => setStepperOpen(false)}
          scaleId={stepperScale.scaleId}
          scaleName={stepperScale.scaleName}
          definition={{ items: (stepperScale.definition.items || []).map(it => ({ ...it, type: 'select' })), scoring: stepperScale.definition.scoring }}
          initialAnswers={stepperScale.answers}
          onComplete={({ answers }) => {
            setPendingScales(prev => prev.map(p => p.scaleId === stepperScale.scaleId ? ({ ...p, answers }) : p));
          }}
        />
      )}
    </>
  );
}