import React, { useState } from 'react';
import { X, User, Phone, Mail, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useValidationNotifications } from './ValidationNotification';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

interface NewPatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  initialName?: string;
}

export default function NewPatientForm({ isOpen, onClose, onSave, initialName = '' }: NewPatientFormProps) {
  const { addError, addSuccess } = useValidationNotifications();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    full_name: initialName,
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
    address: '',
    emergency_contact: '',
    insurance_info: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Obtener usuario actual
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }
      const currentUser = userData?.user;
      if (!currentUser) {
        addError('Sesión requerida', 'Debes iniciar sesión para crear pacientes.');
        setLoading(false);
        return;
      }

      // Obtener clinic_id desde perfil o relación activa
      let clinicId: string | null = null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('clinic_id')
        .eq('id', currentUser.id)
        .single();
      if (profileError) {
        console.warn('No se pudo obtener clinic_id desde profiles:', profileError.message);
      } else {
        clinicId = profile?.clinic_id ?? null;
      }

      if (!clinicId) {
        const { data: rel, error: relError } = await supabase
          .from('clinic_user_relationships')
          .select('clinic_id')
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (relError) {
          console.warn('No se pudo obtener clinic_id desde relaciones:', relError.message);
        }
        clinicId = rel?.clinic_id ?? null;
      }

      if (!clinicId) {
        addError('Clínica no encontrada', 'Tu usuario no está asociado a ninguna clínica activa.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .insert({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          address: formData.address.trim() || null,
          emergency_contact: formData.emergency_contact.trim() || null,
          insurance_info: formData.insurance_info.trim() || null,
          notes: formData.notes.trim() || null,
          is_active: true,
          clinic_id: clinicId,
          primary_doctor_id: currentUser.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating patient:', error);
        addError('Error', 'No se pudo crear el paciente. Intente nuevamente.');
        return;
      }

      addSuccess('Éxito', `Paciente "${data.full_name}" creado correctamente`);
      onSave(data);
      onClose();
      
      // Reset form
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        birth_date: '',
        gender: '',
        address: '',
        emergency_contact: '',
        insurance_info: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error creating patient:', error);
      addError('Error', 'Ocurrió un error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex p-0 lg:p-4">
      <div className="bg-gray-800 rounded-none lg:rounded-lg shadow-xl w-full max-w-2xl lg:max-h-[90vh] lg:mx-auto lg:my-auto flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div className="flex items-center">
            <User className="h-6 w-6 text-cyan-400 mr-3" />
            <h3 className="text-xl font-semibold text-white">Nuevo Paciente</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 transition-colors touch-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Ej. Juan Pérez García"
                required
              />
              {errors.full_name && (
                <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.phone ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="+52 555 123 4567"
                />
              </div>
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="juan.perez@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Fecha de Nacimiento y Dirección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Nacimiento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contacto de Emergencia
              </label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Nombre y teléfono"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Calle, número, colonia, ciudad"
              />
            </div>
          </div>

          {/* Información Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Información de Seguro
              </label>
              <input
                type="text"
                value={formData.insurance_info}
                onChange={(e) => handleInputChange('insurance_info', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Compañía, número de póliza"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                placeholder="Información adicional relevante..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 p-4 lg:p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
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
