import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Link as LinkIcon, Copy, ListChecks, Clock, CheckSquare, MessageSquare, QrCode, Send, Sparkles, Search, Download, Dumbbell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import PatientSelector from '@/components/PatientSelector';
import { fetchActiveMedicalScalesSafe } from '@/lib/services/medical-scales-service';
import QRCode from 'qrcode';

type ScaleRow = {
  id: string;
  name: string;
  description?: string | null;
};

type ExerciseRow = {
  id: string;
  name: string;
  description?: string | null;
};

type CustomTaskDraft = {
  title: string;
  description: string;
  scheduledDate: string;
};

type InvitationResult = {
  link: string;
  token: string;
  dbId: string;
  whatsappUrl: string;
  emailUrl: string;
  qrDataUrl: string | null;
  assignedTasks: number;
};

type InvitationTemplate = {
  id: string;
  name: string;
  description: string;
  allowedSections: string[];
  createConversation: boolean;
  messageTemplate: string;
  expiryAmount: number;
  expiryUnit: 'hours' | 'days';
  customTasks: CustomTaskDraft[];
};

interface GenerateInvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPatientId?: string;
}

function generateReadableToken(length = 5) {
  // Exclude ambiguous characters: 0, 1, O, I, l
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  (window.crypto || (window as any).msCrypto).getRandomValues(array);
  return Array.from(array).map(n => alphabet[n % alphabet.length]).join('');
}

function isDuplicateTokenError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '23505'
    || message.includes('duplicate key')
    || message.includes('patient_registration_tokens_token_key')
    || message.includes('already exists')
  );
}

const sectionOptions = [
  { id: 'personal', label: 'Información personal' },
  { id: 'pathological', label: 'Antecedentes patológicos' },
  { id: 'non_pathological', label: 'Antecedentes no patológicos' },
  { id: 'hereditary', label: 'Antecedentes heredofamiliares' },
  { id: 'emergency_contact', label: 'Contacto de emergencia' },
  { id: 'lifestyle', label: 'Hábitos y estilo de vida' },
];

const defaultCustomTask = (): CustomTaskDraft => ({
  title: '',
  description: '',
  scheduledDate: new Date().toISOString().slice(0, 10),
});

const invitationTemplates: InvitationTemplate[] = [
  {
    id: 'first_consultation',
    name: '🆕 Primera consulta',
    description: 'Registro completo con bienvenida y tarea inicial.',
    allowedSections: ['personal', 'pathological', 'non_pathological', 'hereditary', 'emergency_contact', 'lifestyle'],
    createConversation: true,
    messageTemplate: 'Hola, bienvenido(a). Completa tu registro inicial y revisa tus tareas asignadas.',
    expiryAmount: 72,
    expiryUnit: 'hours',
    customTasks: [
      {
        title: 'Completar historial médico',
        description: 'Llena todas las secciones del registro inicial.',
        scheduledDate: new Date().toISOString().slice(0, 10),
      },
    ],
  },
  {
    id: 'follow_up',
    name: '📋 Seguimiento',
    description: 'Actualización breve con escalas y contacto.',
    allowedSections: ['personal', 'pathological', 'non_pathological'],
    createConversation: true,
    messageTemplate: 'Seguimiento activo: por favor completa las escalas solicitadas hoy.',
    expiryAmount: 7,
    expiryUnit: 'days',
    customTasks: [],
  },
  {
    id: 'post_surgery',
    name: '🏥 Postquirúrgico',
    description: 'Escalas prioritarias y monitoreo frecuente.',
    allowedSections: ['personal', 'pathological', 'emergency_contact', 'lifestyle'],
    createConversation: true,
    messageTemplate: 'Comparte tus avances postquirúrgicos y responde las escalas priorizadas.',
    expiryAmount: 5,
    expiryUnit: 'days',
    customTasks: [
      {
        title: 'Reporte de evolución',
        description: 'Describe dolor, movilidad y cualquier signo de alarma.',
        scheduledDate: new Date().toISOString().slice(0, 10),
      },
    ],
  },
  {
    id: 'questionnaire',
    name: '📊 Solo cuestionarios',
    description: 'Envío de escalas seleccionadas. Sin historial médico.',
    allowedSections: [],
    createConversation: false,
    messageTemplate: 'Tu médico te ha enviado cuestionarios clínicos para completar. Por favor respóndelos hoy.',
    expiryAmount: 7,
    expiryUnit: 'days',
    customTasks: [],
  },
  {
    id: 'exercises',
    name: '🏋️ Ejercicios terapéuticos',
    description: 'Asignación de rutinas y ejercicios. Sin historial médico.',
    allowedSections: [],
    createConversation: true,
    messageTemplate: 'Tu médico te ha asignado ejercicios terapéuticos. Revisa tu rutina y completa las actividades indicadas.',
    expiryAmount: 14,
    expiryUnit: 'days',
    customTasks: [],
  },
];

export default function GenerateInvitationLinkModal({ isOpen, onClose, preselectedPatientId }: GenerateInvitationLinkModalProps) {
  const { user, profile } = useAuth();
  const [scales, setScales] = useState<ScaleRow[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const [requiredScaleIds, setRequiredScaleIds] = useState<string[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTaskDraft[]>([]);
  const [assignedPatientId, setAssignedPatientId] = useState<string>(preselectedPatientId || '');
  const [allowedSections, setAllowedSections] = useState<string[]>(['personal', 'pathological', 'non_pathological', 'hereditary']);
  const [createConversation, setCreateConversation] = useState<boolean>(true);
  const [messageTemplate, setMessageTemplate] = useState<string>('Hola, este es tu canal para resolver dudas y recibir seguimiento clínico.');
  const [activeTemplate, setActiveTemplate] = useState<string>('first_consultation');
  const [expiryAmount, setExpiryAmount] = useState<number>(72);
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'days'>('hours');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [scaleSearchQuery, setScaleSearchQuery] = useState('');
  const [tokenStatus, setTokenStatus] = useState<string>('pending');
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isOpen && preselectedPatientId) {
      setAssignedPatientId(preselectedPatientId);
    }
  }, [isOpen, preselectedPatientId]);

  useEffect(() => {
    if (!isOpen) {
      // Clean up Realtime subscription when modal closes
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }
    setResult(null);
    setError(null);
    setCopyFeedback(null);
    setTokenStatus('pending');
    applyTemplate(activeTemplate);
  }, [isOpen]);

  // Subscribe to Realtime updates for the generated token
  useEffect(() => {
    if (!result?.dbId) return;

    const channelName = `token-status-${result.dbId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_registration_tokens',
          filter: `id=eq.${result.dbId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus) setTokenStatus(newStatus);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [result?.dbId]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoadingCatalog(true);
        const rows = await fetchActiveMedicalScalesSafe();
        const mapped = rows
          .map((row) => ({ id: row.id, name: row.name, description: row.description }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setScales(mapped);
        const { data: exerciseRows, error: exerciseError } = await supabase
          .from('exercise_library')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (exerciseError) throw exerciseError;
        setExercises((exerciseRows || []) as ExerciseRow[]);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar las escalas');
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [isOpen]);

  const toggleScale = (id: string) => {
    setSelectedScaleIds((prev) => {
      if (prev.includes(id)) {
        setRequiredScaleIds((requiredPrev) => requiredPrev.filter((item) => item !== id));
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const toggleRequiredScale = (id: string) => {
    setRequiredScaleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSection = (id: string) => {
    setAllowedSections((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const addCustomTask = () => {
    setCustomTasks((prev) => [...prev, defaultCustomTask()]);
  };

  const removeCustomTask = (index: number) => {
    setCustomTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateCustomTask = (index: number, key: keyof CustomTaskDraft, value: string) => {
    setCustomTasks((prev) => prev.map((task, idx) => (idx === index ? { ...task, [key]: value } : task)));
  };

  const applyTemplate = (templateId: string) => {
    const template = invitationTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setActiveTemplate(template.id);
    setAllowedSections(template.allowedSections);
    setCreateConversation(template.createConversation);
    setMessageTemplate(template.messageTemplate);
    setExpiryAmount(template.expiryAmount);
    setExpiryUnit(template.expiryUnit);
    setCustomTasks(template.customTasks);
  };

  const canGenerate = useMemo(() => !!user && !!profile?.clinic_id, [user, profile]);

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError('No hay sesión o clínica asociada en el perfil.');
      return;
    }
    try {
      setError(null);
      setGenerating(true);
      setCopyFeedback(null);
      const ms = (expiryUnit === 'hours' ? expiryAmount * 60 * 60 * 1000 : expiryAmount * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + ms).toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const uniqueRequiredScaleIds = requiredScaleIds.filter((id) => selectedScaleIds.includes(id));

      let data: any = null;
      const maxTokenAttempts = 10;
      for (let attempt = 1; attempt <= maxTokenAttempts; attempt += 1) {
        const token = generateReadableToken(5);
        const { data: insertedData, error } = await supabase
          .from('patient_registration_tokens')
          .insert({
            token,
            doctor_id: user!.id,
            clinic_id: profile!.clinic_id as string,
            selected_scale_ids: selectedScaleIds.length ? selectedScaleIds : null,
            required_scale_ids: uniqueRequiredScaleIds,
            selected_exercise_ids: selectedExerciseIds,
            custom_tasks: customTasks.filter((task) => task.title.trim().length > 0),
            allowed_sections: allowedSections,
            assigned_patient_id: assignedPatientId || null,
            create_conversation: createConversation,
            message_template: messageTemplate || null,
            invitation_template: activeTemplate,
            expires_at: expiresAt,
            status: 'pending',
          } as any)
          .select()
          .single();

        if (!error && insertedData) {
          data = insertedData;
          break;
        }

        if (isDuplicateTokenError(error) && attempt < maxTokenAttempts) {
          continue;
        }
        throw error;
      }

      if (!data) {
        throw new Error('No se pudo generar un código único de invitación. Intenta de nuevo.');
      }

      const scaleById = new Map(scales.map((scale) => [scale.id, scale]));
      const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
      let assignedTasks = 0;
      let assignedTaskIds: string[] = [];

      if (assignedPatientId) {
        const cleanedCustomTasks = customTasks.filter((task) => task.title.trim().length > 0);

        const scaleTasks = selectedScaleIds.map((scaleId) => ({
          patient_id: assignedPatientId,
          doctor_id: user!.id,
          clinic_id: profile!.clinic_id as string,
          task_type: 'scale',
          title: uniqueRequiredScaleIds.includes(scaleId) ? 'Escala médica obligatoria' : 'Escala médica asignada',
          description: scaleById.get(scaleId)?.name || 'Completa esta escala médica.',
          scale_id: scaleId,
          scheduled_date: today,
          priority: uniqueRequiredScaleIds.includes(scaleId) ? 'high' : 'normal',
        }));

        const exerciseTasks = selectedExerciseIds.map((exerciseId) => ({
          patient_id: assignedPatientId,
          doctor_id: user!.id,
          clinic_id: profile!.clinic_id as string,
          task_type: 'exercise',
          title: 'Ejercicio asignado',
          description: exerciseById.get(exerciseId)?.name || 'Completa tu rutina asignada.',
          exercise_id: exerciseId,
          scheduled_date: today,
          priority: 'normal',
        }));

        const customTaskRows = cleanedCustomTasks.map((task) => ({
          patient_id: assignedPatientId,
          doctor_id: user!.id,
          clinic_id: profile!.clinic_id as string,
          task_type: 'custom',
          title: task.title.trim(),
          description: task.description.trim() || null,
          scheduled_date: task.scheduledDate || today,
          priority: 'normal',
        }));

        const allTasks = [...scaleTasks, ...exerciseTasks, ...customTaskRows];
        if (allTasks.length > 0) {
          const { data: taskRows, error: taskError } = await supabase
            .from('patient_tasks')
            .insert(allTasks as any)
            .select('id');
          if (taskError) throw taskError;
          assignedTasks = taskRows?.length || 0;
          assignedTaskIds = (taskRows || []).map((task) => task.id as string).filter(Boolean);
        }

        if (createConversation) {
          const { data: existingConversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('patient_id', assignedPatientId)
            .eq('doctor_id', user!.id)
            .eq('is_active', true)
            .maybeSingle();

          let conversationId = existingConversation?.id || null;
          if (!conversationId) {
            const { data: newConversation, error: conversationError } = await supabase
              .from('conversations')
              .insert({
                patient_id: assignedPatientId,
                doctor_id: user!.id,
                clinic_id: profile!.clinic_id as string,
                is_active: true,
              } as any)
              .select('id')
              .single();
            if (conversationError) throw conversationError;
            conversationId = newConversation?.id || null;
          }

          if (conversationId && messageTemplate.trim().length > 0) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              sender_type: 'system',
              sender_id: user!.id,
              patient_id: assignedPatientId,
              doctor_id: user!.id,
              content: messageTemplate.trim(),
            } as any);
          }
        }
      }

      if (assignedTaskIds.length > 0) {
        await supabase
          .from('patient_registration_tokens')
          .update({ assigned_task_ids: assignedTaskIds } as any)
          .eq('id', data.id);
      }

      const origin = window.location.origin;
      const link = `${origin}/register/patient/${encodeURIComponent(data.token)}`;
      const shareMessage = [
        'Hola, este es tu acceso para el proceso de registro.',
        `Registro web: ${link}`,
        `Código para app Paciente (5 caracteres): ${data.token}`,
        'Si aún no tienes cuenta, regístrate en la app Pacientes con ese código.',
      ].join('\n');
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
      const emailUrl = `mailto:?subject=${encodeURIComponent('Invitación de registro de paciente')}&body=${encodeURIComponent(shareMessage)}`;
      const qrDataUrl = await QRCode.toDataURL(link, { width: 240, margin: 1 });

      // Notificaciones creadas por trigger de BD (notify_clinic_staff_on_registration_token) para todo el personal de la clínica

      setTokenStatus(data.status || 'pending');
      setResult({
        link,
        token: data.token,
        dbId: data.id,
        whatsappUrl,
        emailUrl,
        qrDataUrl,
        assignedTasks,
      });
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copiado`);
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback('No se pudo copiar al portapapeles');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center"><ListChecks className="h-5 w-5 mr-2" /> Generar enlace de registro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          {!canGenerate && (
            <div className="text-sm text-red-300">Tu perfil no tiene clínica asociada. Configúrala en Configuración.</div>
          )}
          {error && <div className="text-sm text-red-400">{error}</div>}

          <div>
            <div className="text-gray-300 text-sm mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Plantilla de invitación</div>
            <select
              value={activeTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded px-3 py-2"
            >
              {invitationTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-gray-300 text-sm mb-2">Asignar a un paciente existente (opcional):</div>
            <div className="bg-gray-800/50 border border-gray-700 rounded p-2">
              <PatientSelector
                selectedPatientId={assignedPatientId}
                onPatientSelect={(p) => setAssignedPatientId(p?.id || '')}
                showRecentPatients={true}
              />
            </div>
            {assignedPatientId && (
              <div className="text-xs text-gray-400 mt-1">Este enlace actualizará los datos del paciente seleccionado.</div>
            )}
          </div>

          {activeTemplate === 'questionnaire' ? (
            <div className="p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg text-cyan-200 text-sm">
              📊 Esta plantilla no solicita historial médico, solo escalas/cuestionarios.
            </div>
          ) : activeTemplate === 'exercises' ? (
            <div className="p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg text-emerald-200 text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 shrink-0" /> Esta plantilla es exclusiva para asignar ejercicios terapéuticos al paciente.
            </div>
          ) : (
            <div>
              <div className="text-gray-300 text-sm mb-2 flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Historial médico a completar</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {sectionOptions.map(s => (
                  <label key={s.id} className="flex items-center space-x-2 bg-gray-800/60 border border-gray-700 rounded p-2">
                    <input type="checkbox" checked={allowedSections.includes(s.id)} onChange={() => toggleSection(s.id)} />
                    <span className="text-sm text-gray-200">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTemplate !== 'exercises' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-300 text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" /> Escalas médicas</div>
              {selectedScaleIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-800/60 text-cyan-200">
                    {selectedScaleIds.length} seleccionada{selectedScaleIds.length !== 1 ? 's' : ''}
                  </span>
                  {requiredScaleIds.filter(id => selectedScaleIds.includes(id)).length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-800/60 text-amber-200">
                      {requiredScaleIds.filter(id => selectedScaleIds.includes(id)).length} obligatoria{requiredScaleIds.filter(id => selectedScaleIds.includes(id)).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            {scales.length > 3 && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar escala..."
                  value={scaleSearchQuery}
                  onChange={(e) => setScaleSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm placeholder:text-gray-500"
                />
              </div>
            )}
            <div className="max-h-64 overflow-auto space-y-2">
              {loadingCatalog ? (
                <div className="text-gray-400">Cargando escalas...</div>
              ) : scales.length === 0 ? (
                <div className="text-gray-400">No hay escalas activas.</div>
              ) : (
                scales
                  .filter(s => !scaleSearchQuery.trim() || s.name.toLowerCase().includes(scaleSearchQuery.trim().toLowerCase()) || (s.description || '').toLowerCase().includes(scaleSearchQuery.trim().toLowerCase()))
                  .map(s => {
                  const isRequired = requiredScaleIds.includes(s.id);
                  const isSelected = selectedScaleIds.includes(s.id);
                  return (
                    <label key={s.id} className={`flex items-start justify-between gap-3 p-2 rounded hover:bg-gray-800 border transition-colors ${isRequired ? 'border-amber-600/50 bg-amber-900/20' : isSelected ? 'border-cyan-700/50 bg-cyan-900/10' : 'border-gray-700/60'}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={isSelected}
                            onChange={() => toggleScale(s.id)}
                          />
                          <div className="text-white text-sm font-medium">{s.name}</div>
                          {isRequired && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-200 font-medium">
                              Obligatoria
                            </span>
                          )}
                        </div>
                        {s.description && <div className="text-xs text-gray-400">{s.description}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">Obligatoria</span>
                        <input
                          type="checkbox"
                          disabled={!isSelected}
                          checked={isRequired}
                          onChange={() => toggleRequiredScale(s.id)}
                          title={isSelected ? 'Marcar como obligatoria para el paciente' : 'Selecciona la escala primero'}
                        />
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          )}

          {(activeTemplate === 'exercises' || activeTemplate === 'follow_up' || activeTemplate === 'post_surgery') && (
          <div>
            <div className="text-gray-300 text-sm mb-2 flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Ejercicios a asignar
              {selectedExerciseIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-200">
                  {selectedExerciseIds.length} seleccionado{selectedExerciseIds.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="max-h-44 overflow-auto space-y-2">
              {loadingCatalog ? (
                <div className="text-gray-400">Cargando ejercicios...</div>
              ) : exercises.length === 0 ? (
                <div className="text-gray-400">No hay ejercicios activos.</div>
              ) : (
                exercises.map((exercise) => (
                  <label key={exercise.id} className={`flex items-start gap-2 rounded border p-2 hover:bg-gray-800 transition-colors ${selectedExerciseIds.includes(exercise.id) ? 'border-emerald-700/50 bg-emerald-900/10' : 'border-gray-700/60'}`}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedExerciseIds.includes(exercise.id)}
                      onChange={() => toggleExercise(exercise.id)}
                    />
                    <div>
                      <div className="text-sm text-gray-200">{exercise.name}</div>
                      {exercise.description && <div className="text-xs text-gray-400">{exercise.description}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          )}

          <div>
            <div className="text-gray-300 text-sm mb-2">Tareas personalizadas</div>
            <div className="space-y-2">
              {customTasks.length === 0 && <div className="text-xs text-gray-400">Sin tareas personalizadas.</div>}
              {customTasks.map((task, index) => (
                <div key={`${index}-${task.title}`} className="border border-gray-700 rounded p-2 space-y-2 bg-gray-800/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={task.title}
                      onChange={(e) => updateCustomTask(index, 'title', e.target.value)}
                      placeholder="Título de tarea"
                      className="bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1.5"
                    />
                    <input
                      type="date"
                      value={task.scheduledDate}
                      onChange={(e) => updateCustomTask(index, 'scheduledDate', e.target.value)}
                      className="bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1.5"
                    />
                  </div>
                  <input
                    value={task.description}
                    onChange={(e) => updateCustomTask(index, 'description', e.target.value)}
                    placeholder="Descripción de tarea"
                    className="w-full bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomTask(index)}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                  >
                    Eliminar tarea
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCustomTask}
              className="mt-2 px-2.5 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded text-gray-100"
            >
              Agregar tarea personalizada
            </button>
          </div>

          <div className="space-y-2 border border-gray-700 rounded p-3 bg-gray-800/40">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={createConversation} onChange={(e) => setCreateConversation(e.target.checked)} />
              Crear canal de mensajería con el paciente
            </label>
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Mensaje de bienvenida</label>
              <textarea
                rows={2}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="mt-1 w-full bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1.5"
                placeholder="Mensaje inicial para el paciente"
              />
            </div>
            {!assignedPatientId && (
              <div className="text-xs text-amber-300">
                Sin paciente preasignado: las tareas y el canal se aplicarán al momento de vincular la cuenta del paciente con el token.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-gray-300 text-sm flex items-center"><Clock className="h-4 w-4 mr-1" /> Vigencia:</span>
            <input
              type="number"
              min={1}
              value={expiryAmount}
              onChange={e => setExpiryAmount(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1"
            />
            <select
              value={expiryUnit}
              onChange={e => setExpiryUnit(e.target.value as 'hours' | 'days')}
              className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1"
            >
              <option value="hours">horas</option>
              <option value="days">días</option>
            </select>
          </div>

          <div className="text-xs text-cyan-300/90 bg-cyan-900/20 border border-cyan-700/40 rounded p-2 mt-2">
            <LinkIcon className="h-3.5 w-3.5 inline mr-1 align-middle" />
            Este enlace se guardará en el expediente del paciente y aparecerá el QR y el link en la lista de pendientes de la clínica (Notificaciones → Enlaces pendientes).
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
            <button
              disabled={!canGenerate || generating || (activeTemplate === 'exercises' ? selectedExerciseIds.length === 0 : (allowedSections.length === 0 && selectedScaleIds.length === 0))}
              onClick={handleGenerate}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50 flex items-center"
            >
              <LinkIcon className="h-4 w-4 mr-2" /> {generating ? 'Generando...' : 'Generar Link'}
            </button>

            {result && (
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                <span className="text-xs text-gray-400">Código:</span>
                <code className="text-sm font-semibold text-cyan-300 tracking-wide">{result.token}</code>
                <button
                  onClick={() => handleCopy(result.token, 'Código')}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center"
                  title="Copiar código"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {result && (
            <div className="border border-cyan-700/40 rounded p-3 space-y-3 bg-cyan-900/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-cyan-200 font-medium">Invitación generada</div>
                {tokenStatus === 'completed' ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-800/60 text-cyan-300 font-semibold animate-pulse">✅ Completado</span>
                ) : tokenStatus === 'expired' ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-800/40 text-red-300">Expirado</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-800/40 text-amber-300 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Pendiente
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Código para app Pacientes (5 caracteres)</div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={result.token}
                      className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 w-full"
                    />
                    <button onClick={() => handleCopy(result.token, 'Código')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Link de registro web</div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={result.link}
                      className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 w-full"
                    />
                    <button onClick={() => handleCopy(result.link, 'Link')} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={result.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" /> WhatsApp
                </a>
                <a
                  href={result.emailUrl}
                  className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-sm rounded"
                >
                  Email
                </a>
                <button
                  onClick={() => handleCopy(result.whatsappUrl, 'URL de WhatsApp')}
                  className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                >
                  Copiar URL de compartir
                </button>
              </div>

              {result.qrDataUrl && (
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded bg-white p-1 flex items-center justify-center">
                    <img src={result.qrDataUrl} alt="QR de invitación" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-gray-300 flex items-center gap-1.5">
                      <QrCode className="h-4 w-4" />
                      El paciente puede escanear este QR para abrir el registro.
                    </div>
                    <a
                      href={result.qrDataUrl}
                      download={`qr-invitacion-${result.token}.png`}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded w-fit transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar QR
                    </a>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-300">
                Tareas creadas inmediatamente: <span className="text-cyan-300 font-semibold">{result.assignedTasks}</span>
              </div>
              {copyFeedback && <div className="text-xs text-emerald-300">{copyFeedback}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


