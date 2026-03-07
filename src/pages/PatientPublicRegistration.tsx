import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchActiveMedicalScalesSafe, getScaleDefinitionById } from '@/lib/services/medical-scales-service';
import ScaleStepper from '@/components/ScaleStepper';
import ChipSelector from '@/components/patient-registration/ChipSelector';
import SelectSimple from '@/components/patient-registration/SelectSimple';
import VoiceInputButton from '@/components/patient-registration/VoiceInputButton';
import {
  CHRONIC_DISEASE_OPTIONS,
  TREATMENT_OPTIONS,
  SURGERY_OPTIONS,
  FRACTURE_OPTIONS,
  HOSPITALIZATION_OPTIONS,
  RELIGION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  DIET_OPTIONS,
  HYGIENE_OPTIONS,
  VACCINE_OPTIONS,
  FAMILY_RELATIONSHIP_OPTIONS,
} from '@/lib/patient-registration-catalogs';

type TokenRow = {
  id: string;
  token: string;
  doctor_id: string;
  clinic_id: string;
  selected_scale_ids: string[] | null;
  required_scale_ids?: string[] | null;
  allowed_sections?: string[] | null;
  invitation_template?: string | null;
  message_template?: string | null;
  assigned_patient_id?: string | null;
  expires_at: string;
  status: string;
  created_at: string;
  doctor?: { full_name: string | null; specialty?: string | null } | null;
  clinic?: { name: string } | null;
};

type PersonalInfo = {
  full_name: string;
  birth_date: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Pathological = {
  chronic_diseases: string[];
  current_treatments: string[];
  surgeries: string[];
  fractures: string[];
  previous_hospitalizations: string[];
  substance_use: Record<string, unknown>;
};

type NonPathological = {
  handedness: string;
  religion: string;
  marital_status: string;
  education_level: string;
  diet: string;
  personal_hygiene: string;
  vaccination_history: string[];
};

type HereditaryItem = {
  relationship: string;
  condition: string;
  relationship_other?: string;
  condition_other?: string;
  notes?: string;
};

type ScaleDefinition = {
  items?: Array<{ id: string; text: string; type: 'select'; options: Array<{ label: string; value: number | string }> }>
  scoring?: { average?: boolean; ranges?: Array<{ min: number; max: number; severity: string }> }
}

export default function PatientPublicRegistration() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null);
  const [step, setStep] = useState(1);
  const submitErrorBannerRef = useRef<HTMLDivElement>(null);
  const firstErrorFieldRef = useRef<HTMLInputElement>(null);

  const [personal, setPersonal] = useState<PersonalInfo>({ full_name: '', birth_date: '', gender: 'unspecified', email: '', phone: '', address: '' });
  const [pathological, setPathological] = useState<Pathological>({ chronic_diseases: [], current_treatments: [], surgeries: [], fractures: [], previous_hospitalizations: [], substance_use: {} });
  const [nonPathological, setNonPathological] = useState<NonPathological>({ handedness: 'right', religion: '', marital_status: '', education_level: '', diet: '', personal_hygiene: '', vaccination_history: [] });
  const [hereditary, setHereditary] = useState<HereditaryItem[]>([{ relationship: '', condition: '', notes: '' }]);
  const [scaleDefs, setScaleDefs] = useState<Record<string, { name: string; definition: ScaleDefinition }>>({});
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, { answers: Record<string, unknown>; score: number | null; severity: string | null }>>({});
  const [activeScaleId, setActiveScaleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [allowedSections, setAllowedSections] = useState<string[]>(['personal','pathological','non_pathological','hereditary']);
  const [createPatientAccount, setCreatePatientAccount] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [postSubmitMessage, setPostSubmitMessage] = useState<string | null>(null);
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const emailCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chronicDiseasesOther, setChronicDiseasesOther] = useState('');
  const [currentTreatmentsOther, setCurrentTreatmentsOther] = useState('');
  const [surgeriesOther, setSurgeriesOther] = useState('');
  const [fracturesOther, setFracturesOther] = useState('');
  const [hospitalizationsOther, setHospitalizationsOther] = useState('');
  const [vaccinationOther, setVaccinationOther] = useState('');
  const [religionOther, setReligionOther] = useState('');
  const [maritalStatusOther, setMaritalStatusOther] = useState('');
  const [educationLevelOther, setEducationLevelOther] = useState('');
  const [dietOther, setDietOther] = useState('');
  const [hygieneOther, setHygieneOther] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('patient_registration_tokens')
          .select('id, token, doctor_id, clinic_id, selected_scale_ids, required_scale_ids, allowed_sections, invitation_template, message_template, assigned_patient_id, expires_at, status, created_at, doctor:profiles(full_name, specialty), clinic:clinics(name)')
          .eq('token', token)
          .single();
        if (error) throw error;

        const isExpired = new Date(data.expires_at).getTime() < Date.now();
        if (data.status !== 'pending' || isExpired) {
          setFatalError('Este enlace no es válido o ha expirado.');
          setTokenRow(null);
          return;
        }
        setTokenRow(data as unknown as TokenRow);
        const sections = (data.allowed_sections && Array.isArray(data.allowed_sections) && (data.allowed_sections as string[]).length > 0)
          ? (data.allowed_sections as string[])
          : ['personal','pathological','non_pathological','hereditary'];
        setAllowedSections(sections);
        const isQuestionnaireOnly = sections.length === 0;

        if (isQuestionnaireOnly) {
          setStep(3);
          if (data.assigned_patient_id) {
            const { data: patient } = await supabase
              .from('patients')
              .select('full_name, birth_date, gender, email, phone, address')
              .eq('id', data.assigned_patient_id)
              .single();
            if (patient) {
              setPersonal({
                full_name: patient.full_name ?? '',
                birth_date: patient.birth_date ? String(patient.birth_date).slice(0, 10) : '',
                gender: (patient.gender as string) || 'unspecified',
                email: patient.email ?? '',
                phone: patient.phone ?? '',
                address: patient.address ?? '',
              });
            }
          }
        }

        const scaleIds = (data.selected_scale_ids || []) as string[];
        if (scaleIds.length > 0) {
          const allActiveScales = await fetchActiveMedicalScalesSafe();
          const map: Record<string, { name: string; definition: ScaleDefinition }> = {};
          const missingDefinitionIds: string[] = [];
          const missingDefinitionDetails: Array<{ scaleId: string; foundInActiveCatalog: boolean; hasInlineDefinition: boolean }> = [];
          for (const sid of scaleIds) {
            const row = allActiveScales.find((r) => r.id === sid);
            const definition = await getScaleDefinitionById(sid);
            if (!definition && !(row?.definition as ScaleDefinition)) {
              missingDefinitionIds.push(sid);
              missingDefinitionDetails.push({
                scaleId: sid,
                foundInActiveCatalog: Boolean(row),
                hasInlineDefinition: Boolean((row as any)?.definition),
              });
            }
            map[sid] = {
              name: row?.name ?? sid,
              definition: definition ?? (row?.definition as ScaleDefinition) ?? { items: [] },
            };
          }
          setScaleDefs(map);
        }
      } catch (e: any) {
        // Error log removed for security;
        setFatalError('No se pudo validar el enlace.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const welcome = useMemo(() => {
    if (!tokenRow) return '';
    const doc = tokenRow.doctor?.full_name || 'tu médico';
    const clinic = tokenRow.clinic?.name || 'tu clínica';
    return `Bienvenido(a). Este registro será entregado a ${doc} en ${clinic}.`;
  }, [tokenRow]);

  const isQuestionnaireOnly = allowedSections.length === 0;
  const questionnaireHeader = useMemo(() => {
    if (!tokenRow || !isQuestionnaireOnly) return null;
    const doc = tokenRow.doctor?.full_name || 'tu médico';
    const clinic = tokenRow.clinic?.name || 'tu clínica';
    return `Cuestionarios asignados por ${doc} de ${clinic}`;
  }, [tokenRow, isQuestionnaireOnly]);

  const doctorLine = useMemo(() => {
    if (!tokenRow?.doctor?.full_name) return null;
    const name = tokenRow.doctor.full_name;
    const specialty = tokenRow.doctor.specialty;
    return specialty ? `${name} — ${specialty}` : name;
  }, [tokenRow]);

  const pendingRequirements = useMemo(() => {
    const list: string[] = [];
    if (!personal.full_name?.trim()) list.push('Nombre completo');
    if (!personal.birth_date) list.push('Fecha de nacimiento');
    const normalizedAccountEmail = (accountEmail || personal.email || '').trim().toLowerCase();
    if (createPatientAccount) {
      if (!normalizedAccountEmail) list.push('Correo para la cuenta');
      if (!accountPassword || accountPassword.length < 6) list.push('Contraseña (mín. 6 caracteres)');
      if (accountPassword !== accountConfirmPassword) list.push('Las contraseñas deben coincidir');
    }
    return list;
  }, [personal.full_name, personal.birth_date, personal.email, createPatientAccount, accountEmail, accountPassword, accountConfirmPassword]);

  const handleScaleComplete = (scaleId: string, payload: { answers: Record<string, unknown>; score: number | null; severity: string | null }) => {
    setScaleAnswers(prev => ({ ...prev, [scaleId]: payload }));
    setActiveScaleId(null);
  };

  const appendFieldText = (current: string | undefined, incoming: string) => {
    const cleanIncoming = incoming.trim();
    if (!cleanIncoming) return current || '';
    const cleanCurrent = (current || '').trim();
    return cleanCurrent ? `${cleanCurrent} ${cleanIncoming}` : cleanIncoming;
  };

  // Auto-fill account email from personal info when switching to step 3
  useEffect(() => {
    if (step === 3 && !accountEmail && personal.email) {
      setAccountEmail(personal.email.trim());
    }
  }, [step]);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!accountPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (accountPassword.length >= 6) score++;
    if (accountPassword.length >= 10) score++;
    if (/[A-Z]/.test(accountPassword)) score++;
    if (/[0-9]/.test(accountPassword)) score++;
    if (/[^A-Za-z0-9]/.test(accountPassword)) score++;
    if (score <= 1) return { level: 1, label: 'Débil', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Media', color: 'bg-amber-500' };
    return { level: 3, label: 'Fuerte', color: 'bg-green-500' };
  }, [accountPassword]);

  // Debounced email duplicate check — uses profiles table (reliable)
  const checkEmailExists = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailCheckStatus('idle');
      return;
    }
    setEmailCheckStatus('checking');
    try {
      // Check profiles table for existing user with this email
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        setEmailCheckStatus('idle');
        return;
      }
      setEmailCheckStatus(data ? 'taken' : 'available');
    } catch {
      setEmailCheckStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (emailCheckTimeoutRef.current) clearTimeout(emailCheckTimeoutRef.current);
    const email = accountEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || email.length < 5) {
      setEmailCheckStatus('idle');
      return;
    }
    emailCheckTimeoutRef.current = setTimeout(() => checkEmailExists(email), 800);
    return () => { if (emailCheckTimeoutRef.current) clearTimeout(emailCheckTimeoutRef.current); };
  }, [accountEmail, checkEmailExists]);

  const normalizeMultiValue = (values: string[], otherValue?: string) => {
    const filtered = values.filter((item) => item !== 'Otra' && item !== 'Otro' && item !== 'Ninguna');
    const custom = (otherValue || '').trim();
    if (custom) filtered.push(custom);
    return Array.from(new Set(filtered));
  };

  const normalizeSingleValue = (value: string, otherValue?: string) => {
    if (value === 'Otra' || value === 'Otro') {
      return (otherValue || '').trim();
    }
    return value;
  };

  const validateBeforeSubmit = (): { valid: boolean; errors: Record<string, string> } => {
    const next: Record<string, string> = {};
    if (!personal.full_name?.trim()) next.full_name = 'El nombre completo es requerido';
    if (!personal.birth_date) next.birth_date = 'La fecha de nacimiento es requerida';
    const normalizedAccountEmail = (accountEmail || personal.email || '').trim().toLowerCase();
    if (createPatientAccount) {
      if (!normalizedAccountEmail) next.account_email = 'Captura un correo electrónico';
      if (!accountPassword || accountPassword.length < 6) next.account_password = 'La contraseña debe tener al menos 6 caracteres';
      if (accountPassword !== accountConfirmPassword) next.account_confirm = 'Las contraseñas no coinciden';
    }
    return { valid: Object.keys(next).length === 0, errors: next };
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!tokenRow) return;
    setSubmitError(null);
    setFieldErrors({});

    const { valid, errors } = validateBeforeSubmit();
    if (!valid) {
      setFieldErrors(errors);
      setSubmitError('Revisa los campos marcados.');
      const hasNameOrBirth = errors.full_name || errors.birth_date;
      const hasAccountError = errors.account_email || errors.account_password || errors.account_confirm;
      if (isQuestionnaireOnly || hasAccountError) {
        setStep(3);
      } else if (hasNameOrBirth) {
        setStep(1);
      }
      setTimeout(() => {
        if (submitErrorBannerRef.current) {
          submitErrorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (firstErrorFieldRef.current) {
          firstErrorFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    try {
      setSubmitting(true);
      const normalizedAccountEmail = (accountEmail || personal.email || '').trim().toLowerCase();

      const normalizedPathological = {
        ...pathological,
        chronic_diseases: normalizeMultiValue(pathological.chronic_diseases, chronicDiseasesOther),
        current_treatments: normalizeMultiValue(pathological.current_treatments, currentTreatmentsOther),
        surgeries: normalizeMultiValue(pathological.surgeries, surgeriesOther),
        fractures: normalizeMultiValue(pathological.fractures, fracturesOther),
        previous_hospitalizations: normalizeMultiValue(pathological.previous_hospitalizations, hospitalizationsOther),
      };

      const normalizedNonPathological = {
        ...nonPathological,
        religion: normalizeSingleValue(nonPathological.religion, religionOther),
        marital_status: normalizeSingleValue(nonPathological.marital_status, maritalStatusOther),
        education_level: normalizeSingleValue(nonPathological.education_level, educationLevelOther),
        diet: normalizeSingleValue(nonPathological.diet, dietOther),
        personal_hygiene: normalizeSingleValue(nonPathological.personal_hygiene, hygieneOther),
        vaccination_history: normalizeMultiValue(nonPathological.vaccination_history, vaccinationOther),
      };

      const normalizedHereditary = hereditary.map((item) => ({
        relationship: normalizeSingleValue(item.relationship, item.relationship_other).trim(),
        condition: normalizeSingleValue(item.condition, item.condition_other).trim(),
        notes: item.notes || '',
      }));

      const body = {
        token: tokenRow.token,
        personal,
        pathological: normalizedPathological,
        nonPathological: normalizedNonPathological,
        hereditary: normalizedHereditary,
        scales: scaleAnswers,
      };
      const { error } = await supabase.functions.invoke('complete-patient-registration', { body });
      if (error) {
        let contextBody: string | null = null;
        let contextStatus: number | null = null;
        try {
          const maybeResponse = (error as any)?.context;
          if (maybeResponse) {
            contextStatus = maybeResponse.status ?? null;
            contextBody = await maybeResponse.text();
          }
        } catch {
          // no-op
        }
        throw new Error(error.message || 'Error al completar registro');
      }

      if (createPatientAccount) {
        let accountInfoMessage: string | null = null;
        let hasValidSession = false;

        const signUpPayload = {
          email: normalizedAccountEmail,
          password: accountPassword,
          options: {
            data: {
              role: 'patient',
              source_app: 'pacientes',
              registration_token: tokenRow.token,
              full_name: personal.full_name?.trim() || undefined,
            },
          },
        };

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp(signUpPayload);
        if (signUpError) {
          const message = signUpError.message || '';
          const alreadyRegistered = /already registered|already been registered|user already/i.test(message.toLowerCase());
          if (!alreadyRegistered) {
            throw new Error(`Se guardó el expediente, pero no se pudo crear la cuenta: ${message}`);
          }

          // User already exists — try to sign in
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedAccountEmail,
            password: accountPassword,
          });

          if (signInError) {
            throw new Error('El expediente se guardó, pero el correo ya existe y la contraseña no coincide. Usa "Recuperar contraseña".');
          }
          hasValidSession = true;
        } else if (signUpData.session) {
          // Signup succeeded and we got a session immediately (no email confirmation needed)
          hasValidSession = true;
        } else {
          // Signup succeeded but email confirmation is required — no session available
          accountInfoMessage = 'Cuenta creada. Revisa tu correo para confirmar. Al iniciar sesión, ingresa tu token en Configuración → Vincular con Médico.';
        }

        // Only attempt linking if we have a valid session (Bearer token)
        if (hasValidSession) {
          const { error: linkError } = await supabase.functions.invoke('link-patient-account', {
            body: { token: tokenRow.token },
          });
          if (linkError) {
            accountInfoMessage = accountInfoMessage || 'La cuenta se creó, pero falta vincularla. Inicia sesión y usa tu token en Configuración → Vincular con Médico.';
          }
        }

        setPostSubmitMessage(accountInfoMessage);
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (fatalError || !tokenRow) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-6 text-center max-w-md">
          <h1 className="text-white text-lg font-semibold mb-2">Enlace inválido</h1>
          <p className="text-gray-300 text-sm">{fatalError || 'El enlace no es válido.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-6 text-center max-w-md">
          <h1 className="text-white text-lg font-semibold mb-2">Registro enviado</h1>
          <p className="text-gray-300 text-sm">Gracias. Tu información fue enviada correctamente.</p>
          {postSubmitMessage && (
            <p className="text-yellow-300 text-xs mt-3">{postSubmitMessage}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-3 md:p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-lg p-4 md:p-5 mb-4 space-y-3">
          {tokenRow.message_template?.trim() && (
            <div className="p-3 bg-cyan-900/30 border border-cyan-700/50 rounded-lg">
              <p className="text-cyan-100 text-sm leading-relaxed whitespace-pre-wrap">
                {tokenRow.message_template.trim()}
              </p>
            </div>
          )}
          <h1 className="text-white text-xl font-semibold">
            {isQuestionnaireOnly && questionnaireHeader ? questionnaireHeader : 'Registro de paciente'}
          </h1>
          {tokenRow.clinic?.name && (
            <div className="text-lg font-medium text-gray-100">
              {tokenRow.clinic.name}
            </div>
          )}
          {doctorLine && (
            <p className="text-sm text-cyan-400">
              Dr(a). {doctorLine}
            </p>
          )}
          <p className="text-gray-300 text-sm">
            {isQuestionnaireOnly && questionnaireHeader ? 'Completa los cuestionarios asignados. Los resultados se guardarán en tu expediente.' : welcome}
          </p>
        </div>

        {submitError && (
          <div
            ref={submitErrorBannerRef}
            role="alert"
            className="mb-4 p-4 bg-red-900/80 border border-red-600 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <p className="text-red-100 text-sm flex-1">{submitError}</p>
            <button
              type="button"
              className="shrink-0 px-3 py-2 bg-red-800 hover:bg-red-700 text-white rounded text-sm"
              onClick={() => setSubmitError(null)}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Stepper header */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-1">
          {isQuestionnaireOnly ? (
            <div className="px-3 py-2 rounded bg-cyan-700 text-white whitespace-nowrap">Cuestionarios</div>
          ) : (
            [1,2,3].map(n => {
              const step1Incomplete = n === 1 && (!personal.full_name?.trim() || !personal.birth_date);
              const step3Incomplete = n === 3 && createPatientAccount && (
                !(accountEmail || personal.email || '').trim() ||
                !accountPassword || accountPassword.length < 6 ||
                accountPassword !== accountConfirmPassword
              );
              const hasError = step1Incomplete || step3Incomplete;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStep(n)}
                  className={`px-3 py-2 rounded whitespace-nowrap transition-colors ${
                    step === n
                      ? 'bg-cyan-700 text-white'
                      : hasError
                        ? 'bg-amber-800/80 text-amber-100 hover:bg-amber-700/80'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Paso {n}
                </button>
              );
            })
          )}
        </div>

        {step === 1 && allowedSections.includes('personal') && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-full-name" className="text-base text-gray-200">Nombre completo</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="reg-full-name"
                    name="full_name"
                    ref={step === 1 ? firstErrorFieldRef : undefined}
                    className={`w-full bg-gray-900 rounded px-3 py-3 text-white ${fieldErrors.full_name ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                    value={personal.full_name}
                    onChange={e => { setPersonal(p => ({ ...p, full_name: e.target.value })); clearFieldError('full_name'); }}
                  />
                  <VoiceInputButton onAppendText={(text) => setPersonal((prev) => ({ ...prev, full_name: appendFieldText(prev.full_name, text) }))} />
                </div>
                {fieldErrors.full_name && <p className="text-red-400 text-sm mt-1">{fieldErrors.full_name}</p>}
              </div>
              <div>
                <label htmlFor="reg-birth-date" className="text-base text-gray-200">Fecha de nacimiento</label>
                <input
                  id="reg-birth-date"
                  name="birth_date"
                  type="date"
                  className={`w-full mt-1 bg-gray-900 rounded px-3 py-3 text-white ${fieldErrors.birth_date ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                  value={personal.birth_date}
                  onChange={e => { setPersonal(p => ({ ...p, birth_date: e.target.value })); clearFieldError('birth_date'); }}
                />
                {fieldErrors.birth_date && <p className="text-red-400 text-sm mt-1">{fieldErrors.birth_date}</p>}
              </div>
              <div>
                <label className="text-base text-gray-200">Genero</label>
                <select className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white" value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))}>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="unspecified">Prefiero no decir</option>
                </select>
              </div>
              <div>
                <label className="text-base text-gray-200">Correo</label>
                <input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white" value={personal.email || ''} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-base text-gray-200">Telefono</label>
                <input className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white" value={personal.phone || ''} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-base text-gray-200">Direccion</label>
                <div className="mt-1 flex items-center gap-2">
                  <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white" value={personal.address || ''} onChange={e => setPersonal(p => ({ ...p, address: e.target.value }))} />
                  <VoiceInputButton onAppendText={(text) => setPersonal((prev) => ({ ...prev, address: appendFieldText(prev.address, text) }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded" onClick={() => setStep(2)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
            {allowedSections.includes('pathological') && (
              <div>
                <div className="text-gray-200 font-medium mb-2">Antecedentes medicos</div>
                <div className="grid grid-cols-1 gap-4">
                  <ChipSelector
                    label="Que enfermedades tiene? (puede elegir varias)"
                    helpText="Si no tiene ninguna, marque Ninguna."
                    options={CHRONIC_DISEASE_OPTIONS}
                    values={pathological.chronic_diseases}
                    onChange={(values) => setPathological((prev) => ({ ...prev, chronic_diseases: values }))}
                    otherText={chronicDiseasesOther}
                    onOtherTextChange={setChronicDiseasesOther}
                  />
                  <ChipSelector
                    label="Que medicinas toma?"
                    options={TREATMENT_OPTIONS}
                    values={pathological.current_treatments}
                    onChange={(values) => setPathological((prev) => ({ ...prev, current_treatments: values }))}
                    otherText={currentTreatmentsOther}
                    onOtherTextChange={setCurrentTreatmentsOther}
                  />
                  <ChipSelector
                    label="Ha tenido operaciones?"
                    options={SURGERY_OPTIONS}
                    values={pathological.surgeries}
                    onChange={(values) => setPathological((prev) => ({ ...prev, surgeries: values }))}
                    otherText={surgeriesOther}
                    onOtherTextChange={setSurgeriesOther}
                  />
                  <ChipSelector
                    label="Ha tenido huesos rotos?"
                    options={FRACTURE_OPTIONS}
                    values={pathological.fractures}
                    onChange={(values) => setPathological((prev) => ({ ...prev, fractures: values }))}
                    otherText={fracturesOther}
                    onOtherTextChange={setFracturesOther}
                  />
                  <ChipSelector
                    label="Ha estado internado en hospital?"
                    options={HOSPITALIZATION_OPTIONS}
                    values={pathological.previous_hospitalizations}
                    onChange={(values) => setPathological((prev) => ({ ...prev, previous_hospitalizations: values }))}
                    otherText={hospitalizationsOther}
                    onOtherTextChange={setHospitalizationsOther}
                  />
                </div>
              </div>
            )}

            {allowedSections.includes('non_pathological') && (
              <div>
                <div className="text-gray-200 font-medium mb-2">Habitos y datos generales</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-base text-gray-200 font-medium">Con que mano escribe?</label>
                    <select className="w-full mt-1 min-h-[44px] bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={nonPathological.handedness} onChange={e => setNonPathological(v => ({ ...v, handedness: e.target.value }))}>
                      <option value="right">Derecha</option>
                      <option value="left">Izquierda</option>
                      <option value="ambidextrous">Ambidiestro</option>
                    </select>
                  </div>
                  <div>
                    <SelectSimple
                      label="Religion"
                      value={nonPathological.religion}
                      onChange={(value) => setNonPathological((prev) => ({ ...prev, religion: value }))}
                      options={RELIGION_OPTIONS}
                      otherText={religionOther}
                      onOtherTextChange={setReligionOther}
                    />
                  </div>
                  <div>
                    <SelectSimple
                      label="Estado civil"
                      value={nonPathological.marital_status}
                      onChange={(value) => setNonPathological((prev) => ({ ...prev, marital_status: value }))}
                      options={MARITAL_STATUS_OPTIONS}
                      otherText={maritalStatusOther}
                      onOtherTextChange={setMaritalStatusOther}
                    />
                  </div>
                  <div>
                    <SelectSimple
                      label="Nivel educativo"
                      value={nonPathological.education_level}
                      onChange={(value) => setNonPathological((prev) => ({ ...prev, education_level: value }))}
                      options={EDUCATION_LEVEL_OPTIONS}
                      otherText={educationLevelOther}
                      onOtherTextChange={setEducationLevelOther}
                    />
                  </div>
                  <div>
                    <SelectSimple
                      label="Alimentacion"
                      value={nonPathological.diet}
                      onChange={(value) => setNonPathological((prev) => ({ ...prev, diet: value }))}
                      options={DIET_OPTIONS}
                      otherText={dietOther}
                      onOtherTextChange={setDietOther}
                    />
                  </div>
                  <div>
                    <SelectSimple
                      label="Higiene personal"
                      value={nonPathological.personal_hygiene}
                      onChange={(value) => setNonPathological((prev) => ({ ...prev, personal_hygiene: value }))}
                      options={HYGIENE_OPTIONS}
                      otherText={hygieneOther}
                      onOtherTextChange={setHygieneOther}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ChipSelector
                      label="Que vacunas recuerda?"
                      options={VACCINE_OPTIONS}
                      values={nonPathological.vaccination_history}
                      onChange={(values) => setNonPathological((prev) => ({ ...prev, vaccination_history: values }))}
                      otherText={vaccinationOther}
                      onOtherTextChange={setVaccinationOther}
                    />
                  </div>
                </div>
              </div>
            )}

            {allowedSections.includes('hereditary') && (
              <div>
                <div className="text-gray-200 font-medium mb-2">Antecedentes de familiares</div>
                {hereditary.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <SelectSimple
                      label="Parentesco"
                      value={item.relationship}
                      options={FAMILY_RELATIONSHIP_OPTIONS}
                      onChange={(value) => setHereditary((arr) => arr.map((it, i) => i === idx ? { ...it, relationship: value } : it))}
                      otherText={item.relationship_other || ''}
                      onOtherTextChange={(value) => setHereditary((arr) => arr.map((it, i) => i === idx ? { ...it, relationship_other: value } : it))}
                    />
                    <SelectSimple
                      label="Enfermedad"
                      value={item.condition}
                      options={CHRONIC_DISEASE_OPTIONS}
                      onChange={(value) => setHereditary((arr) => arr.map((it, i) => i === idx ? { ...it, condition: value } : it))}
                      otherText={item.condition_other || ''}
                      onOtherTextChange={(value) => setHereditary((arr) => arr.map((it, i) => i === idx ? { ...it, condition_other: value } : it))}
                    />
                    <div>
                      <label className="text-base text-gray-200 font-medium">Notas (opcional)</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input placeholder="Escriba una nota breve" className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-3 text-white" value={item.notes || ''} onChange={e => setHereditary(arr => arr.map((it,i) => i===idx ? { ...it, notes: e.target.value } : it))} />
                        <VoiceInputButton onAppendText={(text) => setHereditary((arr) => arr.map((it, i) => i === idx ? { ...it, notes: appendFieldText(it.notes, text) } : it))} />
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <button className="px-3 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded text-sm" onClick={() => setHereditary(arr => [...arr, { relationship: '', condition: '', notes: '' }])}>Agregar familiar</button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
                <button className="px-3 py-2 min-h-[44px] bg-gray-700 text-white rounded" onClick={() => setStep(1)}>Atras</button>
              <button className="px-3 py-2 min-h-[44px] bg-cyan-600 hover:bg-cyan-700 text-white rounded" onClick={() => setStep(3)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
            {isQuestionnaireOnly && !tokenRow.assigned_patient_id && (
              <div className="p-3 bg-gray-900/80 border border-gray-600 rounded-lg">
                <div className="text-gray-200 font-medium mb-2">Identificación necesaria</div>
                <p className="text-gray-400 text-sm mb-3">Para guardar tus respuestas en tu expediente, necesitamos estos datos:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-q3-full-name" className="text-sm text-gray-300">Nombre completo</label>
                    <input
                      id="reg-q3-full-name"
                      name="full_name_q3"
                      ref={(step === 3 && isQuestionnaireOnly && !tokenRow?.assigned_patient_id) ? firstErrorFieldRef : undefined}
                      className={`w-full bg-gray-800 rounded px-3 py-2 text-white mt-1 ${fieldErrors.full_name ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                      value={personal.full_name}
                      onChange={e => { setPersonal(p => ({ ...p, full_name: e.target.value })); clearFieldError('full_name'); }}
                      placeholder="Obligatorio"
                    />
                    {fieldErrors.full_name && <p className="text-red-400 text-sm mt-1">{fieldErrors.full_name}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-q3-birth-date" className="text-sm text-gray-300">Fecha de nacimiento</label>
                    <input
                      id="reg-q3-birth-date"
                      name="birth_date_q3"
                      type="date"
                      className={`w-full bg-gray-800 rounded px-3 py-2 text-white mt-1 ${fieldErrors.birth_date ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                      value={personal.birth_date}
                      onChange={e => { setPersonal(p => ({ ...p, birth_date: e.target.value })); clearFieldError('birth_date'); }}
                    />
                    {fieldErrors.birth_date && <p className="text-red-400 text-sm mt-1">{fieldErrors.birth_date}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-300">Correo (opcional)</label>
                    <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white mt-1" value={personal.email || ''} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} placeholder="Para crear cuenta" />
                  </div>
                </div>
              </div>
            )}
            {pendingRequirements.length > 0 && (
              <div className="p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
                <p className="text-amber-200 text-sm">Para enviar, completa: {pendingRequirements.join(', ')}</p>
              </div>
            )}
            {(tokenRow.selected_scale_ids || []).length === 0 && (
              <div className="text-gray-300 text-sm">No hay escalas para completar. Puedes enviar el formulario.</div>
            )}
            <div className="space-y-2">
              {(tokenRow.selected_scale_ids || []).map((sid: string) => {
                const answered = Boolean(scaleAnswers[sid]);
                const isRequired = (tokenRow.required_scale_ids || []).includes(sid);
                return (
                  <div key={sid} className={`flex items-center justify-between rounded-lg p-3 shadow-sm ${isRequired ? 'bg-amber-900/20 border border-amber-600/40' : 'bg-gray-900/80 border border-gray-600'}`}>
                    <div className="text-sm text-gray-200 min-w-0 flex-1">
                      <span className="font-medium">{scaleDefs[sid]?.name || sid}</span>
                      {isRequired && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-200 font-medium">Obligatoria</span>
                      )}
                      {answered && <span className="ml-2 text-xs text-green-400 inline-flex items-center"><CheckCircle className="h-3.5 w-3.5 mr-0.5" />Completada</span>}
                    </div>
                    <button
                      className="ml-3 px-4 py-2 min-h-[44px] bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium shrink-0 transition-colors"
                      onClick={() => setActiveScaleId(sid)}
                    >
                      {answered ? 'Revisar' : 'Responder'}
                    </button>
                  </div>
                );
              })}
            </div>

            {activeScaleId && (
              <ScaleStepper
                isOpen={true}
                onClose={() => setActiveScaleId(null)}
                scaleId={activeScaleId}
                scaleName={scaleDefs[activeScaleId]?.name || activeScaleId}
                definition={scaleDefs[activeScaleId]?.definition || { items: [] }}
                initialAnswers={scaleAnswers[activeScaleId]?.answers}
                onComplete={(payload) => handleScaleComplete(activeScaleId, payload)}
              />
            )}

            <div className="bg-gray-900 border border-gray-700 rounded p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={createPatientAccount}
                  onChange={(e) => setCreatePatientAccount(e.target.checked)}
                />
                Crear cuenta para que el paciente pueda iniciar sesión
              </label>

              {createPatientAccount && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label htmlFor="reg-account-email" className="text-sm text-gray-300">Correo para la cuenta</label>
                    <div className="relative">
                      <input
                        id="reg-account-email"
                        name="account_email"
                        type="email"
                        className={`w-full bg-gray-800 rounded px-3 py-2 text-white ${fieldErrors.account_email ? 'border-2 border-red-500' : emailCheckStatus === 'taken' ? 'border-2 border-amber-500' : emailCheckStatus === 'available' ? 'border-2 border-green-500' : 'border border-gray-700'}`}
                        value={accountEmail}
                        placeholder={personal.email ? `Usar ${personal.email}` : 'paciente@correo.com'}
                        onChange={(e) => { setAccountEmail(e.target.value); clearFieldError('account_email'); }}
                      />
                      {emailCheckStatus === 'checking' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Verificando...</span>
                      )}
                    </div>
                    {fieldErrors.account_email && <p className="text-red-400 text-sm mt-1">{fieldErrors.account_email}</p>}
                    {emailCheckStatus === 'taken' && (
                      <p className="text-amber-400 text-sm mt-1 flex items-center gap-1">
                        ⚠️ Este correo ya tiene cuenta. Usa tu contraseña existente para vincularlo.
                      </p>
                    )}
                    {emailCheckStatus === 'available' && (
                      <p className="text-green-400 text-sm mt-1 flex items-center gap-1">
                        ✅ Correo disponible
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reg-account-password" className="text-sm text-gray-300">Contraseña</label>
                    <input
                      id="reg-account-password"
                      name="account_password"
                      type="password"
                      className={`w-full bg-gray-800 rounded px-3 py-2 text-white ${fieldErrors.account_password ? 'border-2 border-red-500' : 'border border-gray-700'}`}
                      value={accountPassword}
                      onChange={(e) => { setAccountPassword(e.target.value); clearFieldError('account_password'); }}
                    />
                    {accountPassword && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs ${passwordStrength.level === 1 ? 'text-red-400' : passwordStrength.level === 2 ? 'text-amber-400' : 'text-green-400'}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                    {fieldErrors.account_password && <p className="text-red-400 text-sm mt-1">{fieldErrors.account_password}</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-account-confirm" className="text-sm text-gray-300">Confirmar contraseña</label>
                    <input
                      id="reg-account-confirm"
                      name="account_confirm"
                      type="password"
                      className={`w-full bg-gray-800 rounded px-3 py-2 text-white ${fieldErrors.account_confirm ? 'border-2 border-red-500' : accountConfirmPassword && accountPassword === accountConfirmPassword ? 'border-2 border-green-500' : 'border border-gray-700'}`}
                      value={accountConfirmPassword}
                      onChange={(e) => { setAccountConfirmPassword(e.target.value); clearFieldError('account_confirm'); }}
                    />
                    {accountConfirmPassword && accountPassword === accountConfirmPassword && (
                      <p className="text-green-400 text-xs mt-1">✅ Las contraseñas coinciden</p>
                    )}
                    {fieldErrors.account_confirm && <p className="text-red-400 text-sm mt-1">{fieldErrors.account_confirm}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {isQuestionnaireOnly ? (
                <div />
              ) : (
                <button className="px-3 py-2 bg-gray-700 text-white rounded" onClick={() => setStep(Math.max(1, step - 1))}>Atrás</button>
              )}
              <button className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded disabled:opacity-50" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar registro'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


