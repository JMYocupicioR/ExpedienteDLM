import { useValidationNotifications } from '@/components/ValidationNotification';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useSimpleClinic } from '@/hooks/useSimpleClinic';
import { usePatients } from '@/features/patients/hooks/usePatients';
import type { Patient, PatientInsert } from '@/features/patients/services/patientService';
import { searchPatients } from '@/features/patients/services/patientService';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Building, Calendar, ExternalLink, Mail, MapPin, Phone, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Patient = Database['public']['Tables']['patients']['Row'];

interface NewPatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  initialName?: string;
}

export default function NewPatientForm({
  isOpen,
  onClose,
  onSave,
  initialName = '',
}: NewPatientFormProps) {
  const { addError, addSuccess, addWarning } = useValidationNotifications();
  const navigate = useNavigate();
  // Usar hook simple como fallback si ClinicContext falla
  const {
    activeClinic: contextClinic,
    isLoading: clinicsLoading,
    error: clinicError,
    isIndependentDoctor: contextIndependentDoctor,
  } = useClinic();
  const { activeClinic: simpleClinic, loading: simpleLoading, error: simpleError } = useSimpleClinic();

  // Usar el contexto si está disponible, sino usar el hook simple
  const activeClinic = contextClinic || simpleClinic;

  // Estado para detectar si el médico tiene clínica asignada en su perfil
  const [userHasClinic, setUserHasClinic] = useState<boolean | null>(null);
  const [isIndependentDoctor, setIsIndependentDoctor] = useState(contextIndependentDoctor);

  console.log('NewPatientForm - contextClinic:', contextClinic?.name || 'null');
  console.log('NewPatientForm - simpleClinic:', simpleClinic?.name || 'null');
  console.log('NewPatientForm - activeClinic final:', activeClinic?.name || 'null');
  const { createPatientMutation } = usePatients();

  useEffect(() => {
    setIsIndependentDoctor(contextIndependentDoctor);
  }, [contextIndependentDoctor]);

  // Estados locales para el manejo del formulario y validaciones en tiempo real
  const [checkingCurp, setCheckingCurp] = useState(false);
  const [existingPatient, setExistingPatient] = useState<{ id: string; name: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    full_name: initialName,
    social_security_number: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
    address: '',
    emergency_contact: '',
    insurance_info: '',
    notes: '',
  });

  // Verificar si el usuario tiene clínica en su perfil
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

        if (profile) {
          const hasClinic = !!profile.clinic_id;
          setUserHasClinic(hasClinic);
          // Si no tiene clínica en su perfil, es médico independiente
          setIsIndependentDoctor(!hasClinic);
        }
      } catch (error) {
        console.error('Error checking user clinic:', error);
      }
    }

    checkUserClinic();
  }, []);

  useEffect(() => {
    if (initialName) {
      setFormData(prev => ({ ...prev, full_name: initialName }));
    }
  }, [initialName]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear existing patient alert when social security number changes
    if (field === 'social_security_number' && existingPatient) {
      setExistingPatient(null);
    }
  };

  const checkSocialSecurityExists = async (ssn: string) => {
    if (!ssn || ssn.length < 10) return;
    // Solo verificar si hay clínica activa (médicos de clínica)
    // Médicos independientes no necesitan esta validación por clínica
    if (!activeClinic && !isIndependentDoctor) return;

    setCheckingCurp(true);
    try {
      // Para médicos de clínica, buscar en la clínica
      if (activeClinic) {
        const patients = await searchPatients(ssn, activeClinic.id, 1);
        const existingPatient = patients.find(p =>
          p.social_security_number?.toUpperCase() === ssn.toUpperCase()
        );

        if (existingPatient) {
          setExistingPatient({
            id: existingPatient.id,
            name: existingPatient.full_name,
          });
          addWarning(
            'Paciente existente',
            `El paciente ${existingPatient.full_name} ya está registrado con este número de seguridad social.`
          );
        } else {
          setExistingPatient(null);
        }
      }
      // Para médicos independientes, la validación se hará en el backend
    } catch (error) {
      // Error log removed for security;
    } finally {
      setCheckingCurp(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio';
    }

    // Validación de número de seguridad social (formato estricto para sistema médico)
    if (formData.social_security_number && formData.social_security_number.trim()) {
      const ssn = formData.social_security_number.trim();
      if (ssn.length < 10 || ssn.length > 20) {
        newErrors.social_security_number = 'El número de seguridad social debe tener entre 10 y 20 caracteres';
      } else if (!/^[A-Z0-9]+$/.test(ssn.toUpperCase())) {
        newErrors.social_security_number = 'El número de seguridad social solo puede contener letras y números';
      }
    }

    // Solo validar clínica si NO es médico independiente
    if (!isIndependentDoctor && !activeClinic) {
      newErrors.clinic = 'No hay una clínica activa seleccionada.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }

    // Prevent submission if patient already exists
    if (existingPatient) {
      newErrors.social_security_number = 'Este paciente ya existe. Use el enlace para ver su expediente.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        addError('Error de Sesión', 'No se pudo verificar la sesión de usuario.');
        return;
      }

      // Validación adicional para médicos de clínica
      if (!isIndependentDoctor && !activeClinic) {
        addError('Error de Clínica', 'No hay una clínica activa seleccionada.');
        return;
      }

      // Preparamos el objeto del paciente para la inserción
      const patientData: PatientInsert = {
        full_name: formData.full_name.trim() || null,
        social_security_number: formData.social_security_number?.trim() || null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender?.trim() || null,
        address: formData.address?.trim() || null,
        emergency_contact: formData.emergency_contact || null,
        insurance_info: formData.insurance_info || null,
        notes: formData.notes?.trim() || null,
        // Para médicos independientes, clinic_id es NULL
        clinic_id: isIndependentDoctor ? null : activeClinic!.id,
        primary_doctor_id: currentUser.id,
        is_active: true,
      };

      console.log('Creating patient with data:', patientData);
      console.log('Is independent doctor:', isIndependentDoctor);

      // Usamos la mutación de React Query
      createPatientMutation.mutate(patientData, {
        onSuccess: (newPatient) => {
          // ¡Éxito! Tenemos el paciente real con su ID definitivo.
          addSuccess('Éxito', `Paciente "${newPatient.full_name}" creado correctamente.`);
          onSave(newPatient); // Devolvemos el paciente real
          onClose();
          resetForm();
        },
        onError: (error) => {
          // El error ya se maneja en el servicio (ej. CURP duplicado)
          console.error('Error creating patient:', error);
          console.error('Patient data sent:', patientData);
          addError('Error al crear', error.message);
        },
      });

    } catch (error: any) {
      // Error log removed for security;
      addError('Error inesperado', error.message || 'Ocurrió un error inesperado. Intente nuevamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      social_security_number: '',
      phone: '',
      email: '',
      birth_date: '',
      gender: '',
      address: '',
      emergency_contact: '',
      insurance_info: '',
      notes: '',
    });
    setExistingPatient(null);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 z-50 flex p-0 lg:p-4'>
      <div
        className='bg-gray-800 rounded-none lg:rounded-lg shadow-xl w-full max-w-2xl lg:max-h-[90vh] lg:mx-auto lg:my-auto flex flex-col'
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 lg:p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10'>
          <div className='flex items-center'>
            <User className='h-6 w-6 text-cyan-400 mr-3' />
            <h3 className='text-xl font-semibold text-white'>Nuevo Paciente</h3>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white p-2 transition-colors touch-target'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-4 lg:p-6 space-y-6 overflow-y-auto flex-1'>
          {/* Clínica Activa o Médico Independiente */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              {isIndependentDoctor ? 'Médico Independiente' : 'Registrando en Clínica'}
            </label>
            <div className='w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white flex items-center'>
              {userHasClinic === null ? (
                <span>Verificando perfil...</span>
              ) : isIndependentDoctor ? (
                <>
                  <User className='h-4 w-4 mr-2 text-cyan-400' />
                  <span className='text-cyan-400'>Paciente personal (sin clínica)</span>
                </>
              ) : clinicsLoading ? (
                <span>Cargando clínica...</span>
              ) : clinicError ? (
                <span className='text-red-400'>Error al cargar clínica</span>
              ) : activeClinic ? (
                <>
                  <Building className='h-4 w-4 mr-2 text-gray-400' />
                  {activeClinic.name}
                </>
              ) : (
                <span className='text-yellow-400'>Ninguna clínica seleccionada</span>
              )}
            </div>
             {errors.clinic && <p className='text-red-400 text-xs mt-1'>{errors.clinic}</p>}
          </div>

          {/* Información Básica */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Nombre Completo *
              </label>
              <input
                type='text'
                value={formData.full_name}
                onChange={e => handleInputChange('full_name', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder='Ej. Juan Pérez García'
                required
              />
              {errors.full_name && <p className='text-red-400 text-xs mt-1'>{errors.full_name}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>Número de Seguridad Social</label>
              <div className='relative'>
                <input
                  type='text'
                  value={formData.social_security_number}
                  onChange={e => handleInputChange('social_security_number', e.target.value.toUpperCase())}
                  onBlur={() => {
                    if (formData.social_security_number && formData.social_security_number.length >= 10 && activeClinic) {
                      checkSocialSecurityExists(formData.social_security_number);
                    }
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.social_security_number ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder='123456789012'
                  maxLength={20}
                />
                {checkingCurp && (
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400'></div>
                  </div>
                )}
              </div>
              {errors.social_security_number && <p className='text-red-400 text-xs mt-1'>{errors.social_security_number}</p>}
              {existingPatient && (
                <div className='mt-2 p-3 bg-amber-900/20 border border-amber-600 rounded-lg'>
                  <div className='flex items-start space-x-2'>
                    <AlertCircle className='h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0' />
                    <div className='flex-1'>
                      <p className='text-sm text-amber-200'>
                        Este paciente ya está registrado como{' '}
                        <strong>{existingPatient.name}</strong>
                      </p>
                      <button
                        type='button'
                        onClick={() => {
                          navigate(`/patient/${existingPatient.id}`);
                          onClose();
                        }}
                        className='mt-1 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1'
                      >
                        Ver expediente
                        <ExternalLink className='h-3 w-3' />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Género y fecha de nacimiento */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>Género</label>
              <select
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400'
              >
                <option value=''>Seleccionar</option>
                <option value='masculino'>Masculino</option>
                <option value='femenino'>Femenino</option>
                <option value='otro'>Otro</option>
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Fecha de Nacimiento
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <input
                  type='date'
                  value={formData.birth_date}
                  onChange={e => handleInputChange('birth_date', e.target.value)}
                  className='w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400'
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>Teléfono</label>
              <div className='relative'>
                <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <input
                  type='tel'
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.phone ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder='+52 555 123 4567'
                />
              </div>
              {errors.phone && <p className='text-red-400 text-xs mt-1'>{errors.phone}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>Email</label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                <input
                  type='email'
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder='juan.perez@email.com'
                />
              </div>
              {errors.email && <p className='text-red-400 text-xs mt-1'>{errors.email}</p>}
            </div>
          </div>

          {/* Contacto de Emergencia y Dirección */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Contacto de Emergencia
              </label>
              <input
                type='text'
                value={formData.emergency_contact}
                onChange={e => handleInputChange('emergency_contact', e.target.value)}
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400'
                placeholder='Nombre y teléfono'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Información de Seguro
              </label>
              <input
                type='text'
                value={formData.insurance_info}
                onChange={e => handleInputChange('insurance_info', e.target.value)}
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400'
                placeholder='Compañía, número de póliza'
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>Dirección</label>
            <div className='relative'>
              <MapPin className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
              <input
                type='text'
                value={formData.address}
                onChange={e => handleInputChange('address', e.target.value)}
                className='w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400'
                placeholder='Calle, número, colonia, ciudad'
              />
            </div>
          </div>

          {/* Notas Adicionales */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Notas Adicionales
            </label>
            <textarea
              value={formData.notes}
              onChange={e => handleInputChange('notes', e.target.value)}
              rows={3}
              className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none'
              placeholder='Información adicional relevante...'
            />
          </div>

          {/* Actions */}
          <div className='flex justify-end space-x-3 p-4 lg:p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800'>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors'
              disabled={createPatientMutation.isPending}
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={createPatientMutation.isPending || !!existingPatient}
              className='px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
            >
              {createPatientMutation.isPending ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  Creando...
                </>
              ) : (
                <>
                  <User className='h-4 w-4 mr-2' />
                  Crear Paciente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
