import { useValidationNotifications } from '@/components/ValidationNotification';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';
import { usePatients } from '@/features/patients/hooks/usePatients';
import type { Patient, PatientInsert } from '@/features/patients/services/patientService';
import { searchPatients } from '@/features/patients/services/patientService';
import { supabase } from '@/lib/supabase';
import { GENDER_OPTIONS } from '@/lib/patient-registration-catalogs';
import {
  AlertCircle, Building, Calendar, ChevronDown, ChevronRight,
  ExternalLink, Mail, MapPin, Phone, User, X, CheckCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NewPatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  initialName?: string;
}

const GENDER_DISPLAY: Record<string, string> = {
  male: 'Masculino', female: 'Femenino',
  masculino: 'Masculino', femenino: 'Femenino',
  otro: 'Otro', other: 'Otro',
  unspecified: 'Prefiero no decir', no_especificado: 'Prefiero no decir',
};

export default function NewPatientForm({
  isOpen,
  onClose,
  onSave,
  initialName = '',
}: NewPatientFormProps) {
  const { addError, addSuccess, addWarning } = useValidationNotifications();
  const navigate = useNavigate();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const {
    activeClinic: contextClinic,
    isLoading: clinicsLoading,
    error: clinicError,
    isIndependentDoctor: contextIndependentDoctor,
  } = useClinic();
  const { activeClinic: simpleClinic } = useSimpleClinic();
  const activeClinic = contextClinic || simpleClinic;

  const [isIndependentDoctor, setIsIndependentDoctor] = useState(contextIndependentDoctor);
  const [showOptional, setShowOptional] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [existingPatient, setExistingPatient] = useState<{ id: string; name: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { createPatientMutation } = usePatients();

  const [formData, setFormData] = useState({
    full_name: initialName,
    birth_date: '',
    gender: '',
    phone: '',
    email: '',
    social_security_number: '',
    address: '',
    emergency_contact: '',
    insurance_info: '',
    notes: '',
  });

  useEffect(() => {
    setIsIndependentDoctor(contextIndependentDoctor);
  }, [contextIndependentDoctor]);

  useEffect(() => {
    if (initialName) setFormData(prev => ({ ...prev, full_name: initialName }));
  }, [initialName]);

  useEffect(() => {
    if (isOpen) {
      setSaved(false);
      setErrors({});
      setExistingPatient(null);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    async function checkUserClinic() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('clinic_id')
          .eq('id', user.id)
          .single();
        if (profile) setIsIndependentDoctor(!profile.clinic_id);
      } catch {}
    }
    checkUserClinic();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if ((field === 'social_security_number' || field === 'phone') && existingPatient) {
      setExistingPatient(null);
    }
  };

  const checkDuplicate = async (ssn: string) => {
    if (!ssn || ssn.length < 10 || !activeClinic) return;
    setCheckingDuplicate(true);
    try {
      const patients = await searchPatients(ssn, activeClinic.id, 1);
      const found = patients.find(p =>
        p.social_security_number?.toUpperCase() === ssn.toUpperCase()
      );
      if (found) {
        setExistingPatient({ id: found.id, name: found.full_name });
        addWarning('Paciente existente', `${found.full_name} ya está registrado con ese NSS.`);
      } else {
        setExistingPatient(null);
      }
    } catch {}
    finally { setCheckingDuplicate(false); }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.full_name.trim()) next.full_name = 'El nombre es obligatorio';
    if (!formData.birth_date) next.birth_date = 'La fecha de nacimiento es obligatoria';
    if (!formData.gender) next.gender = 'Selecciona el género';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      next.email = 'Formato de correo inválido';
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(formData.phone))
      next.phone = 'Mínimo 8 dígitos';
    if (formData.social_security_number) {
      const ssn = formData.social_security_number.trim();
      if (ssn.length < 10 || ssn.length > 20)
        next.social_security_number = 'Debe tener entre 10 y 20 caracteres';
    }
    if (!isIndependentDoctor && !activeClinic)
      next.clinic = 'No hay clínica activa seleccionada';
    if (existingPatient)
      next.social_security_number = 'Paciente ya existe. Ver expediente para editar.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { addError('Sesión', 'No se pudo verificar la sesión.'); return; }
      if (!isIndependentDoctor && !activeClinic) {
        addError('Clínica', 'No hay clínica activa seleccionada.'); return;
      }

      const fullName = formData.full_name.trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const patientData: PatientInsert = {
        full_name: fullName || null,
        first_name: firstName || null,
        last_name: lastName || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        social_security_number: formData.social_security_number?.trim() || null,
        address: formData.address?.trim() || null,
        emergency_contact: formData.emergency_contact || null,
        insurance_info: formData.insurance_info || null,
        notes: formData.notes?.trim() || null,
        clinic_id: isIndependentDoctor ? null : activeClinic!.id,
        primary_doctor_id: currentUser.id,
        is_active: true,
      };

      createPatientMutation.mutate(patientData, {
        onSuccess: (newPatient) => {
          setSaved(true);
          addSuccess('Paciente creado', `${newPatient.full_name} se registró correctamente.`);
          onSave(newPatient);
          onClose();
          resetForm();
        },
        onError: (error) => {
          addError('Error al crear', error.message);
        },
      });
    } catch (error: any) {
      addError('Error inesperado', error.message || 'Intente nuevamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      birth_date: '',
      gender: '',
      phone: '',
      email: '',
      social_security_number: '',
      address: '',
      emergency_contact: '',
      insurance_info: '',
      notes: '',
    });
    setExistingPatient(null);
    setErrors({});
    setSaved(false);
    setShowOptional(false);
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors min-h-[44px] ${
      errors[field] ? 'border-red-500 focus:ring-red-400' : 'border-gray-600'
    }`;

  const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'>
      <div
        className='bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92dvh] sm:max-h-[88vh]'
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role='dialog'
        aria-modal='true'
        aria-label='Nuevo Paciente'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-cyan-500/10 rounded-lg'>
              <User className='h-5 w-5 text-cyan-400' aria-hidden='true' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-white'>Nuevo Paciente</h2>
              <p className='text-xs text-gray-400'>
                {isIndependentDoctor
                  ? 'Paciente personal'
                  : activeClinic
                  ? activeClinic.name
                  : 'Cargando clínica...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
            aria-label='Cerrar'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className='overflow-y-auto flex-1 px-5 py-5 space-y-4' noValidate>
          {errors.clinic && (
            <div className='flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm'>
              <AlertCircle className='h-4 w-4 flex-shrink-0' />
              {errors.clinic}
            </div>
          )}

          {/* Datos esenciales */}
          <div className='space-y-4'>
            <p className='text-xs font-semibold text-cyan-400 uppercase tracking-wider'>Datos esenciales</p>

            <div>
              <label htmlFor='nf-name' className={labelCls}>Nombre completo <span className='text-red-400'>*</span></label>
              <input
                id='nf-name'
                ref={firstInputRef}
                type='text'
                value={formData.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                className={inputCls('full_name')}
                placeholder='Ej. Juan Pérez García'
                autoComplete='name'
              />
              {errors.full_name && <p className='text-red-400 text-xs mt-1'>{errors.full_name}</p>}
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label htmlFor='nf-birth' className={labelCls}>Fecha de nacimiento <span className='text-red-400'>*</span></label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none' aria-hidden='true' />
                  <input
                    id='nf-birth'
                    type='date'
                    value={formData.birth_date}
                    onChange={e => handleChange('birth_date', e.target.value)}
                    className={`${inputCls('birth_date')} pl-10`}
                  />
                </div>
                {errors.birth_date && <p className='text-red-400 text-xs mt-1'>{errors.birth_date}</p>}
              </div>

              <div>
                <label htmlFor='nf-gender' className={labelCls}>Género <span className='text-red-400'>*</span></label>
                <select
                  id='nf-gender'
                  value={formData.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className={inputCls('gender')}
                >
                  <option value=''>Seleccionar</option>
                  <option value='male'>Masculino</option>
                  <option value='female'>Femenino</option>
                  <option value='otro'>Otro</option>
                  <option value='unspecified'>Prefiero no decir</option>
                </select>
                {errors.gender && <p className='text-red-400 text-xs mt-1'>{errors.gender}</p>}
              </div>
            </div>

            <div>
              <label htmlFor='nf-phone' className={labelCls}>Teléfono</label>
              <div className='relative'>
                <Phone className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none' aria-hidden='true' />
                <input
                  id='nf-phone'
                  type='tel'
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  className={`${inputCls('phone')} pl-10`}
                  placeholder='+52 555 123 4567'
                  autoComplete='tel'
                />
              </div>
              {errors.phone && <p className='text-red-400 text-xs mt-1'>{errors.phone}</p>}
            </div>
          </div>

          {/* Datos opcionales (colapsable) */}
          <div className='border border-gray-700 rounded-lg overflow-hidden'>
            <button
              type='button'
              onClick={() => setShowOptional(v => !v)}
              className='w-full flex items-center justify-between px-4 py-3 bg-gray-700/50 hover:bg-gray-700 transition-colors text-sm font-medium text-gray-300 min-h-[44px]'
              aria-expanded={showOptional}
            >
              <span className='flex items-center gap-2'>
                {showOptional
                  ? <ChevronDown className='h-4 w-4 text-cyan-400' />
                  : <ChevronRight className='h-4 w-4 text-gray-400' />}
                Datos adicionales
                <span className='text-xs text-gray-500'>(correo, NSS, dirección, notas)</span>
              </span>
            </button>

            {showOptional && (
              <div className='px-4 pb-4 pt-3 space-y-4 bg-gray-800/50'>
                <div>
                  <label htmlFor='nf-email' className={labelCls}>Correo electrónico</label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none' aria-hidden='true' />
                    <input
                      id='nf-email'
                      type='email'
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      className={`${inputCls('email')} pl-10`}
                      placeholder='juan@ejemplo.com'
                      autoComplete='email'
                    />
                  </div>
                  {errors.email && <p className='text-red-400 text-xs mt-1'>{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor='nf-ssn' className={labelCls}>Número de Seguridad Social</label>
                  <div className='relative'>
                    <input
                      id='nf-ssn'
                      type='text'
                      value={formData.social_security_number}
                      onChange={e => handleChange('social_security_number', e.target.value.toUpperCase())}
                      onBlur={() => {
                        if (formData.social_security_number.length >= 10 && activeClinic)
                          checkDuplicate(formData.social_security_number);
                      }}
                      className={inputCls('social_security_number')}
                      placeholder='123456789012'
                      maxLength={20}
                    />
                    {checkingDuplicate && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400' />
                      </div>
                    )}
                  </div>
                  {errors.social_security_number && (
                    <p className='text-red-400 text-xs mt-1'>{errors.social_security_number}</p>
                  )}
                  {existingPatient && (
                    <div className='mt-2 p-3 bg-amber-900/20 border border-amber-600/60 rounded-lg'>
                      <div className='flex items-start gap-2'>
                        <AlertCircle className='h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0' />
                        <div>
                          <p className='text-sm text-amber-200'>
                            Ya registrado como <strong>{existingPatient.name}</strong>
                          </p>
                          <button
                            type='button'
                            onClick={() => { navigate(`/expediente/${existingPatient.id}`); onClose(); }}
                            className='mt-1 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1'
                          >
                            Ver expediente <ExternalLink className='h-3 w-3' />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor='nf-address' className={labelCls}>Dirección</label>
                  <div className='relative'>
                    <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none' aria-hidden='true' />
                    <input
                      id='nf-address'
                      type='text'
                      value={formData.address}
                      onChange={e => handleChange('address', e.target.value)}
                      className={`${inputCls('address')} pl-10`}
                      placeholder='Calle, núm, colonia, ciudad'
                      autoComplete='street-address'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label htmlFor='nf-ec' className={labelCls}>Contacto de emergencia</label>
                    <input
                      id='nf-ec'
                      type='text'
                      value={formData.emergency_contact}
                      onChange={e => handleChange('emergency_contact', e.target.value)}
                      className={inputCls('emergency_contact')}
                      placeholder='Nombre y teléfono'
                    />
                  </div>
                  <div>
                    <label htmlFor='nf-ins' className={labelCls}>Seguro médico</label>
                    <input
                      id='nf-ins'
                      type='text'
                      value={formData.insurance_info}
                      onChange={e => handleChange('insurance_info', e.target.value)}
                      className={inputCls('insurance_info')}
                      placeholder='Compañía, póliza'
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor='nf-notes' className={labelCls}>Notas adicionales</label>
                  <textarea
                    id='nf-notes'
                    value={formData.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    rows={3}
                    className='w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none transition-colors'
                    placeholder='Información adicional relevante...'
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className='flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-700 flex-shrink-0'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 px-4 py-2.5 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors min-h-[44px]'
            disabled={createPatientMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type='submit'
            form=''
            onClick={handleSubmit as any}
            disabled={createPatientMutation.isPending || !!existingPatient}
            className='flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] flex items-center justify-center gap-2'
          >
            {createPatientMutation.isPending ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white' />
                Creando...
              </>
            ) : saved ? (
              <>
                <CheckCircle className='h-4 w-4' />
                Creado
              </>
            ) : (
              <>
                <User className='h-4 w-4' />
                Crear Paciente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
