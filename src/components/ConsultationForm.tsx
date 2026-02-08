import React, { useState, useEffect, useCallback } from 'react';
import { Save, X, Clock, AlertCircle, CheckCircle, FileText, Loader2, Upload, FlaskConical, Microscope, Pill, Plus, Trash2, FileEdit, Calendar } from 'lucide-react';
import UploadDropzone from '@/components/UploadDropzone';
import { useForm } from 'react-hook-form';
// ===== IMPORTACIONES DEL SISTEMA CENTRALIZADO =====
import { useValidation } from '@/features/medical-records/hooks/useValidation';
import { usePhysicalExam } from '@/features/medical-records/hooks/usePhysicalExam';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';
import { supabase } from '@/lib/supabase';
import DynamicPhysicalExamForm from '@/components/DynamicPhysicalExamForm';
import MedicalTranscription from '@/components/MedicalTranscription';
import ScalePicker from '@/components/ScalePicker';
import ScaleStepper from '@/components/ScaleStepper';
import AppointmentQuickScheduler from '@/components/AppointmentQuickScheduler';
import MedicalScalesPanel from '@/components/MedicalScalesPanel';
// ===== NUEVAS IMPORTACIONES PARA SISTEMA AVANZADO =====
import TemplateAssistant from '@/components/TemplateAssistant';
import TemplateRunnerModal, { TemplateResponses } from '@/components/TemplateRunnerModal';
import SmartSymptomAnalyzer from '@/components/SmartSymptomAnalyzer';
import MedicalRecommendationsEngine from '@/components/MedicalRecommendationsEngine';
import MedicalWidgets from '@/components/MedicalWidgets';
import AdvancedPrescriptionSystem from '@/components/AdvancedPrescriptionSystem';
import MedicalSafetyValidator from '@/components/MedicalSafetyValidator';
import CIE10Integration from '@/components/CIE10Integration';
import DeepSeekMedicalAssistant from '@/components/DeepSeekMedicalAssistant';
import RealTimeMedicalGuidance from '@/components/RealTimeMedicalGuidance';
// ===== NUEVOS COMPONENTES DE PESTAÑAS =====
import InterrogatorioTabsPanel from '@/components/InterrogatorioTabsPanel';
import ExploracionTabsPanel from '@/components/ExploracionTabsPanel';
import ClassicConsultationForm from '@/components/ClassicConsultationForm';
import type {
  Database,
  MedicalTemplate,
  InterrogatorioStructuredData,
  PhysicalExaminationData
} from '@/lib/database.types';
import { ConsultationConfig } from '@/features/medical-templates/hooks/useConsultationConfig';
import { calculatePrescriptionExpiry } from '@/lib/medicalConfig';

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
  config?: ConsultationConfig;
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
  medications?: any[];
  cie10_code?: string;
  cie10_description?: string;
  recommendations?: any;
  validation_score?: number;
  quality_metrics?: any;
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

export default function ConsultationForm({ patientId, doctorId, onClose, onSave, patientName, config }: ConsultationFormProps) {
  // Get clinic context
  const { activeClinic: contextClinic } = useClinic();
  const { activeClinic: simpleClinic } = useSimpleClinic();
  const activeClinic = contextClinic || simpleClinic;
  
  const [selectedTemplate, setSelectedTemplate] = useState<PhysicalExamTemplate | null>(null);
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);

  useEffect(() => {
    if (config?.general_config) {
      setShowPhysicalExam(!config.general_config.hide_physical_exam);
    }
    if (config?.hpi_config) {
      setShowSmartAnalyzer(config.hpi_config.enable_autocomplete);
      // Voice is handled via prop to InterrogatorioTabsPanel
    }
  }, [config]);



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
  
  // ===== NUEVOS ESTADOS PARA PLANTILLAS INTELIGENTES =====
  const [showTemplateAssistant, setShowTemplateAssistant] = useState(false);
  const [templateRunnerModal, setTemplateRunnerModal] = useState<{
    isOpen: boolean;
    template: MedicalTemplate | null;
    responses?: TemplateResponses;
  }>({ isOpen: false, template: null });
  const [treatmentTemplates, setTreatmentTemplates] = useState<MedicalTemplate[]>([]);
  const [showTreatmentTemplates, setShowTreatmentTemplates] = useState(false);

  // ===== NUEVOS ESTADOS PARA SISTEMA AVANZADO =====
  const [showSmartAnalyzer, setShowSmartAnalyzer] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showMedicalWidgets, setShowMedicalWidgets] = useState(true);
  const [showAdvancedPrescription, setShowAdvancedPrescription] = useState(false);
  const [showSafetyValidator, setShowSafetyValidator] = useState(true);
  const [showCIE10Integration, setShowCIE10Integration] = useState(true);
  const [symptomAnalysis, setSymptomAnalysis] = useState<any>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<any[]>([]);
  const [medicalRecommendations, setMedicalRecommendations] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [selectedCIE10Code, setSelectedCIE10Code] = useState<any>(null);
  const [prescriptionMedications, setPrescriptionMedications] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  const [showMedicalAssistant, setShowMedicalAssistant] = useState(true);
  const [assistantSuggestions, setAssistantSuggestions] = useState<any[]>([]);
  const [showRealTimeGuidance, setShowRealTimeGuidance] = useState(true);
  const [guidanceActions, setGuidanceActions] = useState<any[]>([]);

  // ===== NUEVOS ESTADOS PARA PESTAÑAS DE INTERROGATORIO Y EXPLORACIÓN =====
  const [interrogatorioStructured, setInterrogatorioStructured] = useState<InterrogatorioStructuredData | null>(null);
  const [exploracionFreeText, setExploracionFreeText] = useState<string>('');

  // ===== USAR HOOK DE VALIDACIÓN CENTRALIZADO =====
  const { validateCompleteForm, validateVitalSignsField, validateMedicationsField } = useValidation();
  const { listActiveScales, saveScaleAssessment } = usePhysicalExam({ patientId, doctorId });

  // ===== CARGAR DATOS DEL PACIENTE =====
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('full_name, birth_date, gender')
          .eq('id', patientId)
          .single();

        if (error) throw error;

        const age = data.birth_date ? new Date().getFullYear() - new Date(data.birth_date).getFullYear() : undefined;

        setPatientData({
          ...data,
          age,
          allergies: [], // Las alergias se obtienen de pathological_histories
          conditions: [] // Las condiciones se obtienen de pathological_histories
        });
      } catch (error) {
        console.error('Error loading patient data:', error);
      }
    };

    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

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
      treatment: '',
      medications: [],
      cie10_code: '',
      cie10_description: '',
      recommendations: null,
      validation_score: 0,
      quality_metrics: null
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
        // Error log removed for security;
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
      // Error log removed for security;
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
        // Warning log removed for security;
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
      // Error log removed for security;
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
        // Error log removed for security;
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
      // Error log removed for security;
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
      // Error log removed for security;
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
        // Warning log removed for security;
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
        // ✅ NUEVO: Guardar datos estructurados de interrogatorio
        interrogatorio_structured: interrogatorioStructured || null,
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
            // Error log removed for security;
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
              // Error log removed for security;
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
                // Error log removed for security;
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
      // Error log removed for security;
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
    if (linkError) {
      // Link error occurred but continuing execution
      throw linkError;
    }
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

  // ===== NUEVAS FUNCIONES PARA PLANTILLAS INTELIGENTES =====
  
  // Manejar selección de plantilla desde el asistente
  const handleTemplateAssistantSelect = (template: MedicalTemplate, templateType: 'interrogatorio' | 'exploracion' | 'prescripcion') => {
    if (templateType === 'interrogatorio') {
      setTemplateRunnerModal({ isOpen: true, template });
    } else if (templateType === 'exploracion') {
      handleTemplateSelect(template as any); // Convertir a PhysicalExamTemplate
    } else if (templateType === 'prescripcion') {
      handleTreatmentTemplateSelect(template);
    }
    setShowTemplateAssistant(false);
  };

  // Completar interrogatorio guiado
  const handleInterrogatorioComplete = (responses: TemplateResponses) => {
    // Generar texto formateado desde las respuestas
    const formattedText = formatTemplateResponses(responses, templateRunnerModal.template!);
    
    // Agregar al padecimiento actual
    const currentValue = watchedData.current_condition || '';
    const newValue = currentValue.trim() 
      ? `${currentValue.trim()}\n\n=== ${templateRunnerModal.template!.name} ===\n${formattedText}`
      : `=== ${templateRunnerModal.template!.name} ===\n${formattedText}`;
    
    setValue('current_condition', newValue, { shouldValidate: true, shouldDirty: true });
    setHasUnsavedChanges(true);
    setTemplateRunnerModal({ isOpen: false, template: null });
  };

  // Formatear respuestas de plantilla
  const formatTemplateResponses = (responses: TemplateResponses, template: MedicalTemplate): string => {
    const sections = template.content.sections || [];
    let formattedText = '';

    sections.forEach(section => {
      const sectionResponses = responses[section.id];
      if (!sectionResponses) return;

      formattedText += `\n${section.title}:\n`;
      
      section.fields?.forEach(field => {
        const response = sectionResponses[field.id];
        if (!response && response !== 0) return;

        const responseText = Array.isArray(response) ? response.join(', ') : String(response);
        formattedText += `• ${field.label}: ${responseText}\n`;
      });
    });

    return formattedText.trim();
  };

  // Manejar selección de plantilla de tratamiento
  const handleTreatmentTemplateSelect = (template: MedicalTemplate) => {
    // Extraer contenido de la plantilla y aplicarlo al tratamiento
    let treatmentText = '';
    
    template.content.sections.forEach(section => {
      if (section.content) {
        treatmentText += `${section.title}:\n${section.content}\n\n`;
      }
      
      // Si tiene ejercicios (para fisioterapia)
      if (section.exercises) {
        treatmentText += `${section.title}:\n`;
        section.exercises.forEach(exercise => {
          treatmentText += `• ${exercise.name}: ${exercise.description}\n`;
          treatmentText += `  Repeticiones: ${exercise.repetitions}, Frecuencia: ${exercise.frequency}\n`;
          if (exercise.precautions) {
            treatmentText += `  Precauciones: ${exercise.precautions.join(', ')}\n`;
          }
          treatmentText += '\n';
        });
      }
      
      // Si tiene categorías de dieta
      if (section.categories) {
        treatmentText += `${section.title}:\n`;
        section.categories.forEach(category => {
          treatmentText += `• ${category.category}: ${category.servings}\n`;
          treatmentText += `  Ejemplos: ${category.examples}\n`;
          if (category.notes) {
            treatmentText += `  Notas: ${category.notes}\n`;
          }
          treatmentText += '\n';
        });
      }
    });

    // Aplicar al campo de tratamiento
    const currentTreatment = watchedData.treatment || '';
    const newTreatment = currentTreatment.trim()
      ? `${currentTreatment.trim()}\n\n=== ${template.name} ===\n${treatmentText.trim()}`
      : `=== ${template.name} ===\n${treatmentText.trim()}`;
    
    setValue('treatment', newTreatment, { shouldValidate: true, shouldDirty: true });
    setHasUnsavedChanges(true);
    setShowTreatmentTemplates(false);
  };

  // Cargar plantillas de tratamiento
  const loadTreatmentTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_templates')
        .select('*')
        .eq('type', 'prescripcion')
        .eq('is_active', true)
        .or(`user_id.eq.${doctorId},is_public.eq.true`)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTreatmentTemplates(data || []);
    } catch (error) {
      // Error log removed for security;
    }
  };

  // Cargar plantillas cuando se abre el panel
  useEffect(() => {
    if (showTreatmentTemplates && treatmentTemplates.length === 0) {
      loadTreatmentTemplates();
    }
  }, [showTreatmentTemplates]);

  // Combinar múltiples plantillas de examen físico
  const combinePhysicalExamTemplates = (templates: PhysicalExamTemplate[]): PhysicalExamTemplate => {
    if (templates.length === 1) return templates[0];

    const combinedSections: any[] = [];
    let sectionOrder = 0;

    templates.forEach((template, templateIndex) => {
      if (template.definition?.sections) {
        template.definition.sections.forEach(section => {
          combinedSections.push({
            ...section,
            id: `${section.id}_${templateIndex}`,
            title: `${template.name} - ${section.title}`,
            order: sectionOrder++
          });
        });
      }
    });

    return {
      id: `combined_${Date.now()}`,
      name: `Combinada: ${templates.map(t => t.name).join(' + ')}`,
      doctor_id: doctorId,
      definition: {
        sections: combinedSections,
        version: '1.0',
        metadata: {
          lastModified: new Date().toISOString(),
          author: doctorId,
          description: `Plantilla combinada de: ${templates.map(t => t.name).join(', ')}`
        }
      },
      created_at: new Date().toISOString(),
      is_active: true
    };
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
      // Error log removed for security;
      setError(err instanceof Error ? err.message : 'Error al generar el PDF');
    }
  };

  // ===== FUNCIONES DEL ASISTENTE MÉDICO =====
  const handleAssistantSuggestion = (suggestion: any) => {
    setAssistantSuggestions(prev => [...prev, suggestion]);

    // Apply suggestion based on type
    if (suggestion.type === 'diagnosis' && suggestion.content) {
      setValue('diagnosis', suggestion.content, { shouldValidate: true });
      setHasUnsavedChanges(true);
    } else if (suggestion.type === 'treatment' && suggestion.content) {
      setValue('treatment', suggestion.content, { shouldValidate: true });
      setHasUnsavedChanges(true);
    } else if (suggestion.type === 'text' && suggestion.content) {
      // Generic text suggestion can be applied to current focus or clipboard
      navigator.clipboard?.writeText(suggestion.content);
    }
  };

  const handleDiagnosisFromAssistant = (diagnosis: string) => {
    const currentDiagnosis = watchedData.diagnosis || '';
    const newDiagnosis = currentDiagnosis.trim()
      ? `${currentDiagnosis.trim()}\n\n${diagnosis.trim()}`
      : diagnosis.trim();

    setValue('diagnosis', newDiagnosis, { shouldValidate: true });
    setHasUnsavedChanges(true);
  };

  const handleTreatmentFromAssistant = (treatment: string) => {
    const currentTreatment = watchedData.treatment || '';
    const newTreatment = currentTreatment.trim()
      ? `${currentTreatment.trim()}\n\n${treatment.trim()}`
      : treatment.trim();

    setValue('treatment', newTreatment, { shouldValidate: true });
    setHasUnsavedChanges(true);
  };

  // Generate medical context for the assistant
  const getMedicalContext = () => {
    return {
      patientAge: patientData?.age,
      patientGender: patientData?.gender,
      currentCondition: watchedData.current_condition || '',
      vitalSigns: watchedData.vital_signs || {},
      diagnosis: watchedData.diagnosis || '',
      treatment: watchedData.treatment || '',
      allergies: patientData?.allergies || [],
      medications: prescriptionMedications || [],
      physicalExam: physicalExamData || {}
    };
  };

  // ===== FUNCIONES DE GUÍAS MÉDICAS EN TIEMPO REAL =====
  const handleGuidanceAction = (action: string, data: any) => {
    setGuidanceActions(prev => [...prev, { action, data, timestamp: new Date() }]);

    // Apply guidance action based on type
    if (action.includes('ECG')) {
      // Suggest adding ECG to studies
      setAttachedFiles(prev => {
        const current = prev.find(p => p.category === 'gabinete');
        if (current) {
          return prev;
        }
        return [...prev, { category: 'gabinete' as any, files: [] }];
      });
    } else if (action.includes('medicación') || action.includes('Antipiréticos')) {
      // Open prescription system
      setShowAdvancedPrescription(true);
    } else if (action.includes('diagnóstico')) {
      // Focus on diagnosis field
      const diagnosisField = document.querySelector('textarea[name="diagnosis"]') as HTMLTextAreaElement;
      if (diagnosisField) {
        diagnosisField.focus();
      }
    }

    // Log action for audit trail
    console.log('Guidance action executed:', { action, data });
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

  // ===== CLASSIC MODE RENDERING =====
  if (config?.general_config?.start_mode === 'classic') {
    const handleClassicSave = async (classicData: any) => {
      // Adapt Classic Data to ConsultationFormData for compatibility
      const formData: any = {
        current_condition: classicData.evolution,
        vital_signs: classicData.vital_signs,
        physical_examination: {
           capture_method: 'classic',
           free_text: classicData.physical_exam,
           // Keep structured vital signs in physical_exam data as well if needed by schema
           vitalSigns: classicData.vital_signs
        }, 
        diagnosis: classicData.clinical_diagnosis,
        prognosis: classicData.prognosis,
        treatment: `PLAN TERAPÉUTICO:
${classicData.therapeutic_plan.indications}

MEDICAMENTOS:
${classicData.therapeutic_plan.medications.map((m: any) => `- ${m.name} ${m.dose} (${m.frequency} x ${m.duration})`).join('\n')}

TERAPIA FÍSICA Y REHABILITACIÓN:
${classicData.therapeutic_plan.physical_therapy}`,
        // Store the full structured data in notes for retrieval
        notes: JSON.stringify(classicData),
        cie10_code: classicData.cie10_codes?.[0]?.code || '',
        cie10_description: classicData.cie10_codes?.[0]?.description || '',
        
        // Default values for other fields
        validation_score: 0,
        recommendations: null,
        quality_metrics: null,
        medications: classicData.therapeutic_plan.medications // Map medications if compatible
      };

      await onSubmit(formData);
    };

    return (
      <ClassicConsultationForm
        patientId={patientId}
        patientName={patientName}
        patientData={patientData}
        doctorId={doctorId}
        onSave={handleClassicSave}
        onClose={onClose}
        initialData={undefined} // Could load draft here if implemented
        isSaving={loading}
      />
    );
  }

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
            {/* ✅ NUEVO: Interrogatorio con Pestañas (Plantillas vs Estilo Libre) */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Interrogatorio / Padecimiento Actual</h3>
              <InterrogatorioTabsPanel
                freeText={watchedData.current_condition || ''}
                onFreeTextChange={(text) => {
                  setValue('current_condition', text, { shouldValidate: true, shouldDirty: true });
                  setHasUnsavedChanges(true);
                }}
                structuredData={interrogatorioStructured}
                onStructuredDataChange={setInterrogatorioStructured}
                doctorId={doctorId}
                clinicId={activeClinic?.id}
                currentCondition={watchedData.current_condition}
                diagnosis={watchedData.diagnosis}
                onOpenTranscription={config?.hpi_config?.enable_voice ? () => setIsTranscriptionModalOpen(true) : undefined}
                className="bg-gray-800/50 rounded-lg p-4"
                unifyView={config?.general_config?.unify_hpi}
                defaultTab={config?.general_config?.consultation_start_mode === 'free_text' ? 'free' : 'template'}
              />
              {errors.current_condition && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.current_condition.message}
                </p>
              )}
            </div>

            {/* ===== NUEVO: SMART SYMPTOM ANALYZER ===== */}
            <SmartSymptomAnalyzer
              currentCondition={watchedData.current_condition || ''}
              onAnalysisUpdate={setSymptomAnalysis}
              onSuggestedQuestionsUpdate={setSuggestedQuestions}
              isVisible={showSmartAnalyzer && !!watchedData.current_condition}
            />

            {/* ===== NUEVO: REAL-TIME MEDICAL GUIDANCE ===== */}
            <RealTimeMedicalGuidance
              medicalContext={getMedicalContext()}
              onGuidanceAction={handleGuidanceAction}
              isVisible={showRealTimeGuidance}
              enableAI={true}
              className="mb-4"
            />

            {/* ===== NUEVO: MEDICAL WIDGETS ===== */}
            <MedicalWidgets
              vitalSigns={{
                ...watchedData.vital_signs,
                age: patientData?.age,
                weight: watchedData.vital_signs?.weight
              }}
              currentCondition={watchedData.current_condition || ''}
              diagnosis={watchedData.diagnosis || ''}
              onWidgetResult={(widget, result) => {
                console.log('Widget result:', widget, result);
              }}
              isVisible={showMedicalWidgets && (!!watchedData.current_condition || !!watchedData.diagnosis)}
            />

            {/* ✅ NUEVO: Exploración Física con Pestañas (Plantillas vs Estilo Libre) */}
            <div>
              <ExploracionTabsPanel
                freeText={exploracionFreeText}
                onFreeTextChange={(text) => {
                  setExploracionFreeText(text);
                  // Si usa texto libre, actualizar el objeto de exploración física
                  setValue('physical_examination', {
                    capture_method: 'free_text',
                    free_text: text,
                    metadata: {
                      completed_at: new Date().toISOString()
                    }
                  } as PhysicalExaminationData, { shouldValidate: true, shouldDirty: true });
                  setHasUnsavedChanges(true);
                }}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
                onTemplateDeselect={() => {
                  setSelectedTemplate(null);
                  setPhysicalExamData(null);
                }}
                physicalExamData={physicalExamData}
                onOpenPhysicalExam={() => setShowPhysicalExam(true)}
                doctorId={doctorId}
                className="bg-gray-800/50 rounded-lg p-4"
              />
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

            {/* ===== NUEVO: DIAGNÓSTICO CON CIE-10 ===== */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Diagnóstico *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCIE10Integration(!showCIE10Integration)}
                  className="flex items-center px-3 py-1 text-xs font-medium text-purple-300 bg-purple-900/50 rounded-md hover:bg-purple-800/70 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CIE-10 {showCIE10Integration ? '✅' : '❌'}
                </button>
              </div>
              <textarea
                {...register('diagnosis', {
                  required: 'El diagnóstico es requerido',
                  minLength: { value: 5, message: 'Mínimo 5 caracteres' },
                  maxLength: { value: 500, message: 'Máximo 500 caracteres' }
                })}
                rows={3}
                className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:bg-gray-600"
                placeholder="Diagnóstico principal..."
              />
              {errors.diagnosis && (
                <p className="mt-1 text-sm text-red-400">{errors.diagnosis.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {watchedData.diagnosis?.length || 0}/500 caracteres
              </p>

              {/* Mostrar código CIE-10 seleccionado */}
              {selectedCIE10Code && (
                <div className="mt-2 p-2 bg-green-900/30 border border-green-600/50 rounded">
                  <span className="text-sm text-green-300">
                    CIE-10: {selectedCIE10Code.code} - {selectedCIE10Code.description}
                  </span>
                </div>
              )}
            </div>

            {/* ===== NUEVO: CIE-10 INTEGRATION ===== */}
            <CIE10Integration
              diagnosis={watchedData.diagnosis || ''}
              currentCondition={watchedData.current_condition || ''}
              patientAge={patientData?.age}
              patientGender={patientData?.gender}
              onCodeSelect={(code) => {
                setSelectedCIE10Code(code);
                setValue('cie10_code', code.code);
                setValue('cie10_description', code.description);
              }}
              onCodeSuggestions={(suggestions) => {
                console.log('CIE-10 suggestions:', suggestions);
              }}
              isVisible={showCIE10Integration}
              doctorId={doctorId}
            />

            {/* ===== NUEVO: MEDICAL RECOMMENDATIONS ENGINE ===== */}
            <MedicalRecommendationsEngine
              currentCondition={watchedData.current_condition || ''}
              diagnosis={watchedData.diagnosis || ''}
              vitalSigns={watchedData.vital_signs}
              patientAge={patientData?.age}
              patientGender={patientData?.gender}
              allergies={patientData?.allergies}
              currentMedications={prescriptionMedications.map(m => m.name || '')}
              patientId={patientId}
              doctorId={doctorId}
              onRecommendationsUpdate={setMedicalRecommendations}
              isVisible={showRecommendations && (!!watchedData.current_condition || !!watchedData.diagnosis)}
            />

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

            {/* ✅ MEJORADO: Tratamiento con validación y plantillas */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Tratamiento *
                </label>
                <button
                  type="button"
                  onClick={() => setShowTreatmentTemplates(true)}
                  className="flex items-center px-3 py-1 text-xs font-medium text-green-300 bg-green-900/50 rounded-md hover:bg-green-800/70 transition-colors"
                  title="Usar Plantilla de Tratamiento"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Plantillas
                </button>
              </div>
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

              {/* Panel de plantillas de tratamiento */}
              {showTreatmentTemplates && (
                <div className="mt-3 bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-white">Plantillas de Tratamiento</h4>
                    <button
                      onClick={() => setShowTreatmentTemplates(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {treatmentTemplates.length === 0 ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Cargando plantillas...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {treatmentTemplates.map(template => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-3 bg-gray-600/50 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                          onClick={() => handleTreatmentTemplateSelect(template)}
                        >
                          <div>
                            <h5 className="text-sm font-medium text-white">{template.name}</h5>
                            <p className="text-xs text-gray-400">{template.description}</p>
                            {template.specialty && (
                              <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded mt-1 inline-block">
                                {template.specialty}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Usado {template.usage_count} veces
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== NUEVO: ADVANCED PRESCRIPTION SYSTEM ===== */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Sistema de Prescripción</h3>
              <button
                type="button"
                onClick={() => setShowAdvancedPrescription(!showAdvancedPrescription)}
                className="flex items-center px-3 py-2 text-sm font-medium text-green-300 bg-green-900/50 rounded-md hover:bg-green-800/70 transition-colors"
              >
                <Pill className="h-4 w-4 mr-2" />
                {showAdvancedPrescription ? 'Ocultar' : 'Mostrar'} Prescripción Avanzada
              </button>
            </div>

            <AdvancedPrescriptionSystem
              diagnosis={watchedData.diagnosis || ''}
              patientAge={patientData?.age}
              patientWeight={parseFloat(watchedData.vital_signs?.weight || '70')}
              patientAllergies={patientData?.allergies}
              currentMedications={prescriptionMedications.map(m => m.name)}
              patientConditions={patientData?.conditions}
              onPrescriptionUpdate={(medications) => {
                setPrescriptionMedications(medications);
                setValue('medications', medications);
              }}
              onTemplateSelect={(template) => {
                console.log('Prescription template selected:', template);
              }}
              isVisible={showAdvancedPrescription}
            />
          </div>

          {/* ===== NUEVO: MEDICAL SAFETY VALIDATOR ===== */}
          <MedicalSafetyValidator
            consultationData={{
              current_condition: watchedData.current_condition || '',
              vital_signs: watchedData.vital_signs,
              physical_examination: watchedData.physical_examination,
              diagnosis: watchedData.diagnosis || '',
              prognosis: watchedData.prognosis || '',
              treatment: watchedData.treatment || '',
              medications: prescriptionMedications,
              patient_age: patientData?.age,
              patient_allergies: patientData?.allergies,
              patient_conditions: patientData?.conditions
            }}
            onValidationUpdate={(result) => {
              setValidationResult(result);
              setValue('validation_score', result.score);
              setValue('quality_metrics', result);
            }}
            realTimeValidation={true}
            isVisible={showSafetyValidator}
          />

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

      {/* ===== NUEVOS MODALES PARA PLANTILLAS INTELIGENTES ===== */}
      <TemplateAssistant
        currentCondition={watchedData.current_condition || ''}
        diagnosis={watchedData.diagnosis || ''}
        doctorId={doctorId}
        onSelectTemplate={handleTemplateAssistantSelect}
        isOpen={showTemplateAssistant}
        onClose={() => setShowTemplateAssistant(false)}
      />

      {templateRunnerModal.template && (
        <TemplateRunnerModal
          template={templateRunnerModal.template}
          isOpen={templateRunnerModal.isOpen}
          onClose={() => setTemplateRunnerModal({ isOpen: false, template: null })}
          onComplete={handleInterrogatorioComplete}
          initialResponses={templateRunnerModal.responses}
        />
      )}

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

      {/* ===== ASISTENTE MÉDICO DEEPSEEK R1 ===== */}
      <DeepSeekMedicalAssistant
        medicalContext={getMedicalContext()}
        patientId={patientId}
        doctorId={doctorId}
        consultationId={savedConsultationId}
        onSuggestionApply={handleAssistantSuggestion}
        onDiagnosisUpdate={handleDiagnosisFromAssistant}
        onTreatmentUpdate={handleTreatmentFromAssistant}
        isVisible={showMedicalAssistant}
      />
    </>
  );
}
