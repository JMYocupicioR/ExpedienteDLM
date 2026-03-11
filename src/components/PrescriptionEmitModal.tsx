import React, { useState, useEffect, useCallback } from 'react';
import {
  Pill, X, Plus, Trash2, Save, Loader2, AlertCircle,
  CheckCircle, User, FileText, Stethoscope, ClipboardList
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculatePrescriptionExpiry } from '@/lib/medicalConfig';

// ===== TYPES =====
interface RxMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionEmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  cie10Code?: string;
  cie10Description?: string;
  patientName?: string;
  treatment?: string;
  onPrescriptionSaved?: (prescriptionId: string) => void;
}

// ===== COMPONENT =====
export default function PrescriptionEmitModal({
  isOpen,
  onClose,
  consultationId,
  patientId,
  doctorId,
  diagnosis,
  cie10Code,
  cie10Description,
  patientName,
  treatment,
  onPrescriptionSaved,
}: PrescriptionEmitModalProps) {
  // ── State ──
  const [medications, setMedications] = useState<RxMedication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Patient data loaded from DB
  const [patientInfo, setPatientInfo] = useState<{
    full_name: string;
    birth_date: string | null;
    gender: string | null;
    age?: number;
  } | null>(null);

  // ── Load patient info ──
  const loadPatientInfo = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('full_name, birth_date, gender')
        .eq('id', patientId)
        .single();

      if (fetchError) throw fetchError;
      const age = data.birth_date
        ? Math.floor(
            (Date.now() - new Date(data.birth_date).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : undefined;
      setPatientInfo({ ...data, age });
    } catch {
      // Patient info is optional — continue without it
    }
  }, [patientId]);

  // ── Lifecycle: reset and pre-fill on open ──
  useEffect(() => {
    if (isOpen) {
      setPrescriptionDiagnosis(diagnosis || '');
      setPrescriptionNotes(treatment || '');
      setMedications([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      setError(null);
      setSuccess(false);
      loadPatientInfo();
    }
  }, [isOpen, diagnosis, treatment, loadPatientInfo]);

  // ── Medication helpers ──
  const addMedication = () =>
    setMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);

  const removeMedication = (idx: number) =>
    setMedications((prev) => prev.filter((_, i) => i !== idx));

  const updateMedication = (idx: number, field: keyof RxMedication, value: string) =>
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );

  const filledMedications = medications.filter(
    (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim()
  );

  const isValid =
    filledMedications.length > 0 && (prescriptionDiagnosis || diagnosis || '').trim().length > 0;

  // ── Save ──
  const handleSave = async () => {
    if (!isValid) {
      setError('Agrega al menos un medicamento completo y verifica el diagnóstico.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const finalDiagnosis = prescriptionDiagnosis.trim() || diagnosis.trim();

      // 1. Get visual layout (doctor's default or predefined)
      let visualLayout: any = null;
      const { data: layout } = await supabase
        .from('prescription_layouts')
        .select('template_elements, canvas_settings, print_settings')
        .eq('doctor_id', doctorId)
        .eq('is_default', true)
        .single();

      if (layout) {
        visualLayout = {
          template_elements: layout.template_elements,
          canvas_settings: layout.canvas_settings,
          print_settings: layout.print_settings,
        };
      } else {
        const { data: publicLayout } = await supabase
          .from('prescription_layouts')
          .select('template_elements, canvas_settings, print_settings')
          .eq('is_predefined', true)
          .limit(1)
          .single();

        if (publicLayout) {
          visualLayout = {
            template_elements: publicLayout.template_elements,
            canvas_settings: publicLayout.canvas_settings,
            print_settings: publicLayout.print_settings,
          };
        }
      }

      // 2. Calculate expiry
      const expiresAt = calculatePrescriptionExpiry(
        filledMedications.map((m) => m.name)
      ).toISOString();

      // 3. Insert prescription
      const { data: inserted, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          consultation_id: consultationId,
          medications: filledMedications,
          diagnosis: finalDiagnosis,
          notes: prescriptionNotes || null,
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
          visual_layout: visualLayout,
        })
        .select('id')
        .single();

      if (rxError || !inserted) throw rxError || new Error('No se pudo crear la receta');

      // 4. Link prescription to consultation
      const { error: linkError } = await supabase
        .from('consultation_prescriptions')
        .insert({
          consultation_id: consultationId,
          prescription_id: inserted.id,
        });

      if (linkError) {
        console.error('Error linking prescription to consultation:', linkError);
      }

      // 5. Log to history
      try {
        await supabase.from('prescription_history_log').insert({
          prescription_id: inserted.id,
          action: 'created',
          performed_by: doctorId,
          notes: `Receta emitida desde consulta`,
          metadata: {
            consultation_id: consultationId,
            medications_count: filledMedications.length,
            cie10_code: cie10Code || null,
          },
        });
      } catch {
        // History log is non-critical
      }

      setSuccess(true);
      onPrescriptionSaved?.(inserted.id);
    } catch (err: any) {
      console.error('Error saving prescription:', err);
      setError(err?.message || 'Error al guardar la receta. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        style={{
          background: 'var(--bg-secondary, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-xl"
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emitir Receta Médica</h2>
              <p className="text-emerald-200 text-sm">
                {patientInfo?.full_name || patientName || 'Paciente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Success State ── */}
        {success ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              ¡Receta Emitida Exitosamente!
            </h3>
            <p className="text-gray-400 mb-2">
              Se prescribieron {filledMedications.length} medicamento
              {filledMedications.length !== 1 ? 's' : ''} para{' '}
              {patientInfo?.full_name || patientName || 'el paciente'}.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              La receta ha sido vinculada a la consulta y aparecerá en el historial de recetas del
              paciente.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* ── Error alert ── */}
            {error && (
              <div className="flex items-start gap-3 bg-red-900/40 border border-red-700/60 rounded-lg p-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ── Patient + Consultation Context ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Paciente</span>
                </div>
                <p className="text-white font-semibold">
                  {patientInfo?.full_name || patientName || 'Sin nombre'}
                </p>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  {patientInfo?.age != null && <span>{patientInfo.age} años</span>}
                  {patientInfo?.gender && (
                    <span>{patientInfo.gender === 'M' ? 'Masculino' : 'Femenino'}</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">Consulta</span>
                </div>
                {cie10Code && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs font-mono">
                      {cie10Code}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {cie10Description}
                    </span>
                  </div>
                )}
                <p className="text-gray-300 text-sm line-clamp-2">
                  {diagnosis || 'Sin diagnóstico especificado'}
                </p>
              </div>
            </div>

            {/* ── Diagnosis for prescription ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="h-4 w-4 inline mr-1.5 text-emerald-400" />
                Diagnóstico de la Receta
              </label>
              <input
                type="text"
                value={prescriptionDiagnosis}
                onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                placeholder="Se pre-carga del diagnóstico de la consulta"
                className="w-full bg-gray-800/80 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
            </div>

            {/* ── Medications ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-emerald-400" />
                  Medicamentos *
                </label>
                <button
                  type="button"
                  onClick={addMedication}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-300 bg-emerald-900/40 rounded-lg hover:bg-emerald-800/60 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-400">
                        Medicamento #{idx + 1}
                      </span>
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedication(idx)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/30 rounded transition-colors"
                          title="Quitar medicamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        placeholder="Nombre del medicamento *"
                        value={med.name}
                        onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                        className="bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                      />
                      <input
                        placeholder="Dosis (ej. 500mg) *"
                        value={med.dosage}
                        onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                        className="bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                      />
                      <input
                        placeholder="Frecuencia (ej. cada 8 hrs) *"
                        value={med.frequency}
                        onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                        className="bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                      />
                      <input
                        placeholder="Duración (ej. 7 días) *"
                        value={med.duration}
                        onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                        className="bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                      />
                    </div>
                    <input
                      placeholder="Instrucciones adicionales (opcional)"
                      value={med.instructions || ''}
                      onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                      className="w-full bg-gray-700/80 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {filledMedications.length} de {medications.length} medicamento
                {medications.length !== 1 ? 's' : ''} completo
                {filledMedications.length !== 1 ? 's' : ''}.
              </p>
            </div>

            {/* ── Notes ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notas / Indicaciones adicionales
              </label>
              <textarea
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                placeholder="Indicaciones especiales, advertencias, recomendaciones..."
                rows={3}
                className="w-full bg-gray-800/80 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm resize-none"
              />
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isValid}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isValid
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : '#374151',
                  boxShadow: isValid ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Receta
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
