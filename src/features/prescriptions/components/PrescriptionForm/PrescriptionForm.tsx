// =====================================================
// FORMULARIO DE NUEVA RECETA (extraído de PrescriptionDashboard)
// =====================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, Printer, Shield, History, Wifi, WifiOff, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { validateMedication, checkDrugInteractions, MEDICATION_CONSTRAINTS, SYSTEM_LIMITS } from '@/lib/medicalConfig';
import VisualPrescriptionRenderer from '@/components/VisualPrescriptionRenderer';
import type { TemplateElement } from '@/components/VisualPrescriptionRenderer';
import type { PrescriptionTemplateData } from '@/lib/prescriptionTemplates';
import PrescriptionPrintService from '@/utils/prescriptionPrint';

export interface PrescriptionFormMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionFormPatient {
  id: string;
  full_name: string;
}

export interface PrescriptionFormPreviousRx {
  created_at: string;
  diagnosis: string;
  notes?: string;
  medications: PrescriptionFormMedication[];
}

export interface DoctorProfileFallback {
  full_name?: string;
  medical_license?: string;
  specialty?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  clinic?: { name?: string; address?: string; phone?: string; email?: string };
  logo_url?: string | null;
}

export interface PrescriptionFormProps {
  patientId: string;
  patientName: string;
  onSave: (prescription: {
    patient_id: string;
    medications: PrescriptionFormMedication[];
    diagnosis: string;
    notes?: string;
    created_at: string;
    expires_at: string;
  }) => void;
  previousPrescriptions?: PrescriptionFormPreviousRx[];
  patients?: PrescriptionFormPatient[];
  onPatientChange?: (patientId: string) => void;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveMessage?: string;
  visualTemplate?: PrescriptionTemplateData | null;
  onOpenVisualEditor?: () => void;
  /** Perfil del médico cargado en el dashboard (fallback si el form no carga el suyo) */
  doctorProfileFallback?: DoctorProfileFallback | null;
}

const commonMedications = Object.keys(MEDICATION_CONSTRAINTS).map((name) => {
  const constraint = MEDICATION_CONSTRAINTS[name];
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    dosages: [`${constraint.minDosage}mg`, `${constraint.maxDosage}mg`],
    frequencies: constraint.allowedFrequencies.map((freq) =>
      freq.charAt(0).toUpperCase() + freq.slice(1)
    ),
    maxDuration: constraint.maxDurationDays,
    controlled: constraint.controlledSubstance || false,
    requiresSpecialist: constraint.requiresSpecialist || false,
    category:
      name.includes('amoxicilina') || name.includes('ciprofloxacino')
        ? 'antibiótico'
        : name.includes('ibuprofeno') || name.includes('paracetamol')
          ? 'analgésico'
          : name.includes('losartan') || name.includes('atorvastatina')
            ? 'cardiovascular'
            : name.includes('tramadol')
              ? 'controlado'
              : 'general',
  };
});

export function PrescriptionForm({
  patientId,
  patientName,
  onSave,
  previousPrescriptions = [],
  patients = [],
  onPatientChange,
  saveStatus = 'idle',
  saveMessage = '',
  visualTemplate = null,
  onOpenVisualEditor,
  doctorProfileFallback = null,
}: PrescriptionFormProps) {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<PrescriptionFormMedication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [drugAlerts, setDrugAlerts] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [suggestions, setSuggestions] = useState<typeof commonMedications>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<{
    full_name?: string;
    medical_license?: string;
    specialty?: string;
    clinic?: { name?: string; address?: string; phone?: string; email?: string };
  } | null>(null);
  const [medicationTemplates, setMedicationTemplates] = useState<Record<string, any>[]>([]);
  const [formTopErrors, setFormTopErrors] = useState<string[]>([]);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, specialty, additional_info')
            .eq('id', user.id)
            .single();
          if (profile) {
            const addInfo = (profile.additional_info || {}) as Record<string, any>;
            const clinicInfo = addInfo.clinic_info || addInfo.clinic || {};
            setDoctorProfile({
              full_name: profile.full_name,
              medical_license: addInfo.medical_license ?? addInfo.cedula_profesional,
              specialty: profile.specialty ?? addInfo.specialty,
              clinic: typeof clinicInfo === 'object' ? clinicInfo : {},
            });
          }
          const { data: tplRows } = await supabase
            .from('medical_templates')
            .select('*')
            .eq('type', 'prescripcion')
            .or(`is_public.eq.true,usage_count.gt.0`)
            .order('usage_count', { ascending: false });

          const transformedTpl = (tplRows || []).map(row => {
            const content = row.content as any;
            const prescSection = content?.sections?.find((s: any) => s.id === 'medications');
            
            return {
              id: row.id,
              name: row.name,
              diagnosis: prescSection?.diagnosis || content?.diagnosis || undefined,
              medications: prescSection?.medications || content?.medications || [],
              notes: prescSection?.notes || content?.notes || '',
              usage_count: row.usage_count
            };
          });

          setMedicationTemplates(transformedTpl);
        }
      } catch {
        // no-op
      }
    })();
  }, []);

  useEffect(() => {
    const errs: string[] = [];
    if (!patientId) errs.push('Seleccione un paciente');
    if (!diagnosis) errs.push('Ingrese un diagnóstico');
    if (medications.filter((m) => m.name).length === 0) errs.push('Agregue al menos un medicamento');
    setFormTopErrors(errs);
  }, [patientId, diagnosis, medications]);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const key = `rx_draft_${user?.id || 'anon'}_${patientId || 'none'}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft?.diagnosis) setDiagnosis(draft.diagnosis);
          if (Array.isArray(draft?.medications)) setMedications(draft.medications);
          if (typeof draft?.notes === 'string') setNotes(draft.notes);
          setDraftRecovered(true);
        } else {
          setDraftRecovered(false);
        }
      } catch {}
    };
    loadDraft();
  }, [patientId]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        setDraftSaving(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const key = `rx_draft_${user?.id || 'anon'}_${patientId || 'none'}`;
        localStorage.setItem(
          key,
          JSON.stringify({ diagnosis, medications, notes, updated_at: Date.now() })
        );
      } finally {
        setDraftSaving(false);
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [patientId, diagnosis, medications, notes]);

  const clearDraft = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const key = `rx_draft_${user?.id || 'anon'}_${patientId || 'none'}`;
      localStorage.removeItem(key);
      setDraftRecovered(false);
    } catch {}
  };

  // QR generation logic removed as it was unused and replaced by VisualPrescriptionRenderer handling

  useEffect(() => {
    const alerts: string[] = [];
    const medicationNames = medications
      .filter((med) => med.name?.trim())
      .map((med) => med.name.trim());
    if (medicationNames.length >= 2) {
      checkDrugInteractions(medicationNames).forEach((interaction) => {
        alerts.push(`⚠️ ${interaction}`);
      });
    }
    medications.forEach((med) => {
      if (!med.name || !med.dosage || !med.frequency || !med.duration) return;
      const dosageMatch = med.dosage.match(/(\d+(?:\.\d+)?)/);
      const dosageNum = dosageMatch ? parseFloat(dosageMatch[1]) : 0;
      const durationMatch = med.duration.match(/(\d+)/);
      const durationNum = durationMatch ? parseInt(durationMatch[1], 10) : 0;
      const validation = validateMedication(
        med.name.toLowerCase(),
        dosageNum,
        med.frequency.toLowerCase(),
        durationNum
      );
      if (!validation.isValid) {
        validation.errors.forEach((error) => alerts.push(`❌ ${med.name}: ${error}`));
      }
      validation.warnings.forEach((warning) => alerts.push(`⚠️ ${med.name}: ${warning}`));
    });
    if (medications.filter((m) => m.name).length > SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION) {
      alerts.push(
        `❌ Excede el límite máximo de ${SYSTEM_LIMITS.MAX_MEDICATIONS_PER_PRESCRIPTION} medicamentos por receta`
      );
    }
    setDrugAlerts(Array.from(new Set(alerts)));
  }, [medications]);

  const handleMedicationNameChange = (index: number, value: string) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = value;
    setMedications(updatedMeds);
    if (value.length > 2) {
      const filtered = commonMedications.filter((med) =>
        med.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setActiveSuggestionIndex(index);
    } else {
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: (typeof commonMedications)[number], index: number) => {
    const updatedMeds = [...medications];
    updatedMeds[index].name = suggestion.name;
    if (suggestion.dosages.length > 0) updatedMeds[index].dosage = suggestion.dosages[0];
    if (suggestion.frequencies.length > 0) updatedMeds[index].frequency = suggestion.frequencies[0];
    setMedications(updatedMeds);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (
    index: number,
    field: keyof PrescriptionFormMedication,
    value: string
  ) => {
    const updatedMeds = [...medications];
    updatedMeds[index][field] = value;
    setMedications(updatedMeds);
  };

  // Drawing logic removed as it was unused

  const handleSave = () => {
    const prescriptionData = {
      patient_id: patientId,
      medications: medications.filter((m) => m.name),
      diagnosis,
      notes,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    if (isOffline) {
      const offlinePrescriptions = JSON.parse(
        localStorage.getItem('offline_prescriptions') || '[]'
      );
      offlinePrescriptions.push(prescriptionData);
      localStorage.setItem('offline_prescriptions', JSON.stringify(offlinePrescriptions));
    }
    onSave(prescriptionData);
  };

  const handlePrint = () => window.print();

  const displayDoctorName =
    doctorProfile?.full_name || doctorProfileFallback?.full_name || 'Dr.';
  const displayDoctorLicense =
    doctorProfile?.medical_license || doctorProfileFallback?.medical_license || '';

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3 flex items-center">
          <WifiOff className="h-5 w-5 text-yellow-400 mr-2" />
          <span className="text-yellow-300 text-sm">Modo offline: Las recetas se guardarán localmente</span>
        </div>
      )}

      {saveMessage && (
        <div
          className={`p-3 rounded-md text-sm
            ${saveStatus === 'success' ? 'bg-green-900/30 border border-green-500 text-green-300' : ''}
            ${saveStatus === 'error' ? 'bg-red-900/30 border border-red-500 text-red-300' : ''}
            ${saveStatus === 'saving' ? 'bg-blue-900/30 border border-blue-500 text-blue-300' : ''}
          `}
        >
          {saveMessage}
        </div>
      )}

      {formTopErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 text-sm text-red-300 mb-2">
          <ul className="list-disc pl-5 space-y-1">
            {formTopErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {(draftRecovered || draftSaving) && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-2 text-xs text-yellow-200 mb-2 flex items-center justify-between">
          <span>{draftRecovered ? 'Borrador recuperado automáticamente.' : 'Guardando borrador...'}</span>
          <button type="button" onClick={clearDraft} className="text-yellow-300 hover:text-yellow-100">
            Limpiar
          </button>
        </div>
      )}

      <div className="dark-card p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paciente <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
          <select
            value={patientId}
            onChange={(e) => onPatientChange?.(e.target.value)}
            className="flex-1 dark-input"
            required
          >
            <option value="">Seleccione un paciente</option>
            {(patients || []).map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate('/patients?action=new')}
            className="px-4 py-2 dark-button-secondary text-sm"
            title="Registrar nuevo paciente"
          >
            + Nuevo
          </button>
        </div>
        {!patientId && (
          <p className="mt-1 text-xs text-yellow-400">Debe seleccionar un paciente para continuar</p>
        )}
      </div>

      {drugAlerts.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-red-300 font-medium mb-2">Alertas de Interacciones</h4>
              <ul className="text-red-200 text-sm space-y-1">
                {drugAlerts.map((alert, index) => (
                  <li key={index}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {previousPrescriptions.length > 0 && (
        <div className="dark-card p-4">
          <div className="flex items-center mb-3">
            <History className="h-5 w-5 text-cyan-400 mr-2" />
            <h3 className="text-gray-100 font-medium">Recetas Anteriores del Paciente</h3>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {previousPrescriptions.slice(0, 3).map((rx, index) => (
              <div key={index} className="text-sm text-gray-300 bg-gray-800/30 p-2 rounded">
                <span className="text-gray-400">
                  {format(new Date(rx.created_at), 'dd/MM/yyyy')}
                </span>
                <span className="mx-2">•</span>
                <span>{rx.diagnosis}</span>
                <button
                  type="button"
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                  onClick={() => {
                    setDiagnosis(rx.diagnosis);
                    setNotes(rx.notes ?? '');
                    setMedications(rx.medications?.length ? rx.medications : medications);
                  }}
                >
                  Usar como base
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">Plantillas de medicamentos</label>
            <div className="flex gap-2">
              <select
                className="dark-input"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const tpl = medicationTemplates.find((t) => t.id === id);
                  if (tpl) {
                    if (Array.isArray(tpl.medications)) setMedications(tpl.medications);
                    if (tpl.diagnosis) setDiagnosis(tpl.diagnosis);
                    if (tpl.notes) setNotes(tpl.notes);
                  }
                  e.currentTarget.value = '';
                }}
              >
                <option value="">Usar plantilla…</option>
                {medicationTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {previousPrescriptions.length > 0 && (
                <button
                  type="button"
                  className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 hover:text-cyan-300"
                  title="Duplicar última receta"
                  onClick={() => {
                    const last = previousPrescriptions[0];
                    if (!last) return;
                    if (Array.isArray(last.medications)) setMedications(last.medications);
                    if (last.diagnosis) setDiagnosis(last.diagnosis);
                    if (last.notes) setNotes(last.notes ?? '');
                  }}
                >
                  Duplicar última
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Diagnóstico <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full dark-input"
              placeholder="Ingrese el diagnóstico"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Medicamentos <span className="text-red-400">*</span>
            </label>
            {medications.map((medication, index) => (
              <div
                key={index}
                className="relative mb-4 p-4 border border-gray-700 rounded-lg bg-gray-800/30"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={medication.name}
                      onChange={(e) => handleMedicationNameChange(index, e.target.value)}
                      className="w-full dark-input"
                      placeholder="Nombre del medicamento"
                      required
                    />
                    {suggestions.length > 0 && activeSuggestionIndex === index && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectSuggestion(suggestion, index)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-cyan-400"
                          >
                            {suggestion.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={medication.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Dosis (ej. 500mg)"
                    required
                  />
                  <input
                    type="text"
                    value={medication.frequency}
                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Frecuencia"
                    required
                  />
                  <input
                    type="text"
                    value={medication.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    className="w-full dark-input"
                    placeholder="Duración"
                    required
                  />
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      className="w-full dark-input"
                      placeholder="Instrucciones especiales"
                    />
                  </div>
                </div>
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMedication}
              className="w-full py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400 rounded-lg transition-colors"
            >
              + Agregar otro medicamento
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full dark-input"
              placeholder="Recomendaciones adicionales"
            />
          </div>

          {/* Signature canvas removed as it was unused */}
        </div>

        <div className="lg:sticky lg:top-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-200 font-medium">Vista previa</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 hover:text-cyan-300"
                title="Alternar vista previa"
              >
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </button>
              <button
                type="button"
                onClick={onOpenVisualEditor}
                className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 hover:text-cyan-300"
                title="Editar plantilla visual"
              >
                Editor Visual
              </button>
              {visualTemplate?.template_elements?.length ? (
                <button
                  type="button"
                  onClick={async () => {
                    const cs = (visualTemplate.canvas_settings || {}) as Record<string, unknown>;
                    const layout = {
                      template_elements: (visualTemplate.template_elements || []).map((el: Record<string, unknown>) => ({
                        ...el,
                        isLocked: (el.isLocked as boolean) ?? false
                      })),
                      canvas_settings: {
                        backgroundColor: (cs.backgroundColor as string) ?? '#ffffff',
                        backgroundImage: (cs.backgroundImage as string | null) ?? null,
                        canvasSize: (cs.canvasSize as { width: number; height: number }) ?? { width: 794, height: 1123 },
                        pageSize: (cs.pageSize as string) ?? 'A4',
                        margin: (cs.margin as string) ?? '20mm',
                        showGrid: (cs.showGrid as boolean) ?? false,
                        zoom: (cs.zoom as number) ?? 1
                      },
                    };
                    const rawPaper = (visualTemplate.print_settings?.paperSize || visualTemplate.paperSize || 'a4').toString().toLowerCase();
                    const orientation = (visualTemplate.print_settings?.orientation || visualTemplate.orientation || 'portrait').toString().toLowerCase();
                    const margins = visualTemplate.print_settings?.margins || visualTemplate.margins || 'normal';
                    const marginObj =
                      typeof margins === 'string'
                        ? margins === 'narrow'
                          ? { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
                          : margins === 'wide'
                            ? { top: '1.5in', right: '1.5in', bottom: '1.5in', left: '1.5in' }
                            : { top: '1in', right: '1in', bottom: '1in', left: '1in' }
                        : (margins as { top: string; right: string; bottom: string; left: string });
                    await PrescriptionPrintService.printPrescription(
                      layout as import('@/utils/prescriptionPrint').PrintLayout,
                      {
                        patientName: patientName || 'Por seleccionar',
                        doctorName: doctorProfile?.full_name || doctorProfileFallback?.full_name || 'Dr.',
                        doctorLicense: doctorProfile?.medical_license || doctorProfileFallback?.medical_license || '',
                        doctorSpecialty: doctorProfile?.specialty || doctorProfileFallback?.specialty || '',
                        clinicName: doctorProfile?.clinic?.name || doctorProfileFallback?.clinic?.name || doctorProfileFallback?.clinic_name || 'Clínica',
                        clinicAddress: doctorProfile?.clinic?.address || doctorProfileFallback?.clinic?.address || doctorProfileFallback?.clinic_address || '',
                        clinicPhone: doctorProfile?.clinic?.phone || doctorProfileFallback?.clinic?.phone || doctorProfileFallback?.clinic_phone || '',
                        clinicEmail: doctorProfile?.clinic?.email || doctorProfileFallback?.clinic?.email || doctorProfileFallback?.clinic_email || '',
                        diagnosis,
                        medications: medications.filter((m) => m.name),
                        notes,
                        date: format(new Date(), 'dd/MM/yyyy', { locale: es }),
                      },
                      {
                        pageSize: rawPaper === 'a4' ? 'A4' : rawPaper === 'legal' ? 'Legal' : 'Letter',
                        orientation: orientation as 'portrait' | 'landscape',
                        margins: marginObj,
                      }
                    );
                  }}
                  className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 hover:text-cyan-300"
                  title="Imprimir vista previa"
                >
                  Imprimir vista previa
                </button>
              ) : null}
            </div>
          </div>

          <div className="dark-card p-4 print-friendly" id="prescription-preview">
            <div className="text-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100 mb-2">RECETA MÉDICA</h2>
              <p className="text-sm text-gray-400">{displayDoctorName}</p>
              <p className="text-xs text-gray-500">
                {displayDoctorLicense ? `CED. PROF. ${displayDoctorLicense}` : ''}
              </p>
            </div>
            <div className="space-y-4 text-sm">
              {visualTemplate?.template_elements?.length ? (
                <div className="flex justify-center">
                  <VisualPrescriptionRenderer
                    layout={visualTemplate}
                    prescriptionData={{
                      patientName: patientName || 'Por seleccionar',
                      doctorName: doctorProfile?.full_name || doctorProfileFallback?.full_name || 'Dr. (sin nombre)',
                      doctorLicense: doctorProfile?.medical_license || doctorProfileFallback?.medical_license || '',
                      doctorSpecialty: doctorProfile?.specialty || doctorProfileFallback?.specialty || '',
                      clinicName: doctorProfile?.clinic?.name || doctorProfileFallback?.clinic?.name || doctorProfileFallback?.clinic_name || 'Clínica',
                      clinicAddress: doctorProfile?.clinic?.address || doctorProfileFallback?.clinic?.address || doctorProfileFallback?.clinic_address || '',
                      clinicPhone: doctorProfile?.clinic?.phone || doctorProfileFallback?.clinic?.phone || doctorProfileFallback?.clinic_phone || '',
                      clinicEmail: doctorProfile?.clinic?.email || doctorProfileFallback?.clinic?.email || doctorProfileFallback?.clinic_email || '',
                      diagnosis,
                      medications: medications.filter((m) => m.name),
                      notes,
                      date: format(new Date(), 'dd/MM/yyyy', { locale: es }),
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-gray-400">Paciente:</span>
                    <span className="ml-2 text-gray-200">{patientName || 'Por seleccionar'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Fecha:</span>
                    <span className="ml-2 text-gray-200">
                      {format(new Date(), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>
                  {diagnosis && (
                    <div>
                      <span className="text-gray-400">Diagnóstico:</span>
                      <span className="ml-2 text-gray-200">{diagnosis}</span>
                    </div>
                  )}
                  {medications.filter((m) => m.name).length > 0 && (
                    <div>
                      <h3 className="text-gray-300 font-medium mb-2">Medicamentos:</h3>
                      <div className="space-y-2">
                        {medications
                          .filter((m) => m.name)
                          .map((med, index) => (
                            <div key={index} className="pl-4 border-l-2 border-cyan-400">
                              <div className="font-medium text-gray-200">
                                {med.name} - {med.dosage}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {med.frequency} por {med.duration}
                                {med.instructions && (
                                  <span className="block">Instrucciones: {med.instructions}</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {notes && (
                    <div>
                      <h3 className="text-gray-300 font-medium mb-1">Notas:</h3>
                      <p className="text-gray-400 text-xs">{notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={
                !patientId ||
                !diagnosis ||
                medications.filter((m) => m.name).length === 0 ||
                saveStatus === 'saving'
              }
              className={`flex-1 flex items-center justify-center ${
                !patientId ||
                !diagnosis ||
                medications.filter((m) => m.name).length === 0 ||
                saveStatus === 'saving'
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-primary'
              }`}
              title={
                !patientId
                  ? 'Seleccione un paciente'
                  : !diagnosis
                    ? 'Ingrese un diagnóstico'
                    : medications.filter((m) => m.name).length === 0
                      ? 'Agregue al menos un medicamento'
                      : 'Guardar receta'
              }
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={
                !patientId ||
                !diagnosis ||
                medications.filter((m) => m.name).length === 0
              }
              className={`flex-1 flex items-center justify-center ${
                !patientId ||
                !diagnosis ||
                medications.filter((m) => m.name).length === 0
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'dark-button-secondary'
              }`}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              <span>Receta segura</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Verificable</span>
            </div>
            {isOffline ? (
              <div className="flex items-center text-yellow-500">
                <WifiOff className="h-3 w-3 mr-1" />
                <span>Offline</span>
              </div>
            ) : (
              <div className="flex items-center text-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                <span>Online</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #prescription-preview, #prescription-preview * { visibility: visible; }
          #prescription-preview {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important; padding: 40px !important;
          }
          .dark-card { border: none !important; box-shadow: none !important; }
          .text-gray-100, .text-gray-200, .text-gray-300 { color: black !important; }
          .text-gray-400, .text-gray-500 { color: #666 !important; }
          .border-gray-700 { border-color: #ccc !important; }
          .bg-gray-800\\/30 { background: transparent !important; }
        }
      `}</style>
    </div>
  );
}
