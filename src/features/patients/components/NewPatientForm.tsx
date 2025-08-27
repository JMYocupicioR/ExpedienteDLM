import { useValidationNotifications } from '@/components/ValidationNotification';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { usePatients } from '@/features/patients/hooks/usePatients';
import type { Patient, PatientInsert } from '@/features/patients/services/patientService';
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
  const { activeClinic, loading: clinicsLoading, error: clinicError } = useClinic();
  const { createPatientMutation } = usePatients();

  // Estados locales para el manejo del formulario y validaciones en tiempo real
  const [checkingCurp, setCheckingCurp] = useState(false);
  const [existingPatient, setExistingPatient] = useState<{ id: string; name: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Omit<PatientInsert, 'clinic_id' | 'primary_doctor_id'>>({
    full_name: initialName,
    curp: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
    address: '',
    emergency_contact: '',
    insurance_info: '',
    notes: '',
  });

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
    // Clear existing patient alert when CURP changes
    if (field === 'curp' && existingPatient) {
      setExistingPatient(null);
    }
  };

  const checkCurpExists = async (curp: string) => {
    if (!curp || curp.length < 18 || !activeClinic) return;

    setCheckingCurp(true);
    try {
      // Temporalmente usar query directa en lugar de Edge Function
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('clinic_id', activeClinic.id)
        .eq('curp', curp.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error('Error checking CURP:', error);
        return;
      }

      if (data) {
        setExistingPatient({
          id: data.id,
          name: data.full_name,
        });
        addWarning(
          'Paciente existente',
          `El paciente ${data.full_name} ya está registrado con esta CURP.`
        );
      } else {
        setExistingPatient(null);
      }
    } catch (error) {
      console.error('Error checking CURP:', error);
    } finally {
      setCheckingCurp(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio';
    }

    // Hacer CURP opcional temporalmente para debug
    if (formData.curp.trim() && !/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/.test(formData.curp.toUpperCase())) {
      newErrors.curp = 'La CURP no tiene un formato válido';
    }

    if (!activeClinic) {
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
      newErrors.curp = 'Este paciente ya existe. Use el enlace para ver su expediente.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !activeClinic) {
        addError('Error de Sesión', 'No se pudo verificar la sesión de usuario o la clínica activa.');
        return;
      }

      // Preparamos el objeto del paciente para la inserción
      const patientData: PatientInsert = {
        ...formData,
        full_name: formData.full_name.trim(),
        clinic_id: activeClinic.id,
        primary_doctor_id: currentUser.id,
        is_active: true,
      };

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
          addError('Error al crear', error.message);
        },
      });

    } catch (error: any) {
      console.error('Error inesperado en handleSubmit:', error);
      addError('Error inesperado', error.message || 'Ocurrió un error inesperado. Intente nuevamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      curp: '',
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
          {/* Clínica Activa */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Registrando en Clínica
            </label>
            <div className='w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white flex items-center'>
              {clinicsLoading ? (
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
              <label className='block text-sm font-medium text-gray-300 mb-2'>CURP *</label>
              <div className='relative'>
                <input
                  type='text'
                  value={formData.curp}
                  onChange={e => handleInputChange('curp', e.target.value.toUpperCase())}
                  onBlur={() => {
                    if (formData.curp.length === 18 && activeClinic) {
                      checkCurpExists(formData.curp);
                    }
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.curp ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder='AAAA000000HAAAAA00'
                  maxLength={18}
                  required
                />
                {checkingCurp && (
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400'></div>
                  </div>
                )}
              </div>
              {errors.curp && <p className='text-red-400 text-xs mt-1'>{errors.curp}</p>}
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
