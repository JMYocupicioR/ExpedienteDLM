import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, MapPin, Phone, Mail, Globe, FileText, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface ClinicFormData {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
}

const clinicTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clínica' },
  { value: 'medical_center', label: 'Centro Médico' },
  { value: 'specialist_clinic', label: 'Clínica Especializada' },
  { value: 'primary_care', label: 'Atención Primaria' },
  { value: 'dental_clinic', label: 'Clínica Dental' },
  { value: 'physiotherapy', label: 'Fisioterapia' },
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'imaging_center', label: 'Centro de Imagen' },
  { value: 'other', label: 'Otro' }
];

export default function ClinicRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ClinicFormData>({
    name: '',
    type: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: ''
  });

  const handleInputChange = (field: keyof ClinicFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('El nombre de la clínica es obligatorio');
      return false;
    }
    if (!formData.type) {
      setError('Debe seleccionar un tipo de clínica');
      return false;
    }
    if (!formData.address.trim()) {
      setError('La dirección es obligatoria');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('El teléfono es obligatorio');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('El email no tiene un formato válido');
      return false;
    }
    if (formData.website && !formData.website.startsWith('http')) {
      setError('El sitio web debe comenzar con http:// o https://');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Crear la clínica
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: formData.name.trim(),
          type: formData.type,
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
          description: formData.description.trim() || null,
          is_active: true, // Asegurar que la clínica esté activa
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // 2. Crear la relación usuario-clínica como administrador
      const { error: relationError } = await supabase
        .from('clinic_user_relationships')
        .insert({
          user_id: user.id,
          clinic_id: clinic.id,
          role_in_clinic: 'admin',
          status: 'approved',
          is_active: true
        });

      if (relationError) throw relationError;

      setSuccess(true);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error al registrar la clínica');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Clínica Registrada!
            </h2>
            <p className="text-gray-400 mb-6">
              Tu clínica ha sido registrada exitosamente. Serás redirigido al dashboard en unos segundos.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Building className="h-8 w-8 mr-3 text-cyan-400" />
              Registrar Nueva Clínica
            </h1>
            <p className="text-gray-400 mt-2">
              Completa la información para registrar tu clínica médica
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Información Básica
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la Clínica *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Ej: Clínica San José"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Clínica *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {clinicTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="Ej: +52 55 1234 5678"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Información de Contacto
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="contacto@clinica.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sitio Web
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="https://www.clinica.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dirección *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Dirección completa de la clínica"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Descripción
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción de la Clínica
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                rows={4}
                placeholder="Describe los servicios y especialidades de tu clínica..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Registrar Clínica
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
