import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building, User, Mail, Phone, FileText, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface Clinic {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface RequestForm {
  message: string;
  specialty: string;
  experience: string;
  phone: string;
}

export default function RequestClinicAccess() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<RequestForm>({
    message: '',
    specialty: '',
    experience: '',
    phone: ''
  });

  // Get clinic name from navigation state if available
  const clinicNameFromState = location.state?.clinicName;

  useEffect(() => {
    if (clinicId) {
      loadClinicData();
    }
  }, [clinicId]);

  const loadClinicData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      if (error) throw error;
      setClinic(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la información de la clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof RequestForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.message.trim()) {
      setError('El mensaje es obligatorio');
      return false;
    }
    if (!formData.specialty.trim()) {
      setError('La especialidad es obligatoria');
      return false;
    }
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      setError('El formato del teléfono no es válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user || !clinicId) return;

    try {
      setSubmitting(true);
      setError(null);

      // Check if user already has a relationship with this clinic
      const { data: existingRelation, error: checkError } = await supabase
        .from('clinic_user_relationships')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRelation) {
        if (existingRelation.status === 'pending') {
          setError('Ya tienes una solicitud pendiente para esta clínica');
          return;
        } else if (existingRelation.status === 'approved') {
          setError('Ya eres miembro de esta clínica');
          return;
        }
      }

      // Create or update the relationship request
      const relationshipData = {
        user_id: user.id,
        clinic_id: clinicId,
        role_in_clinic: 'doctor', // Default role for new requests
        status: 'pending' as const,
        is_active: false,
        start_date: new Date().toISOString()
      };

      if (existingRelation) {
        // Update existing relationship
        const { error: updateError } = await supabase
          .from('clinic_user_relationships')
          .update(relationshipData)
          .eq('id', existingRelation.id);

        if (updateError) throw updateError;
      } else {
        // Create new relationship
        const { error: insertError } = await supabase
          .from('clinic_user_relationships')
          .insert(relationshipData);

        if (insertError) throw insertError;
      }

      // Update user profile with additional info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          specialty: formData.specialty,
          phone: formData.phone || null
        })
        .eq('id', user.id);

      if (profileError) {
        // Profile update failed but relationship was created
        console.warn('Profile update failed:', profileError);
      }

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Solicitud Enviada!
            </h2>
            <p className="text-gray-400 mb-2">
              Tu solicitud de acceso a <strong className="text-white">{clinic?.name}</strong> ha sido enviada.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Recibirás una notificación cuando sea revisada por los administradores de la clínica.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Redirigiendo al dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              Solicitar Acceso
            </h1>
            <p className="text-gray-400 mt-2">
              Solicita acceso a {clinicNameFromState || clinic?.name || 'la clínica seleccionada'}
            </p>
          </div>
        </div>

        {/* Clinic Info */}
        {clinic && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Información de la Clínica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Nombre</p>
                <p className="text-white font-medium">{clinic.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tipo</p>
                <p className="text-white capitalize">{clinic.type}</p>
              </div>
              {clinic.address && (
                <div className="md:col-span-2">
                  <p className="text-gray-400 text-sm">Dirección</p>
                  <p className="text-white">{clinic.address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información Profesional
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Especialidad Médica *
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => handleInputChange('specialty', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Ej: Medicina General, Cardiología, Pediatría..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Experiencia Profesional
                </label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe brevemente tu experiencia médica y años de práctica..."
                />
              </div>
            </div>
          </div>

          {/* Request Message */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Mensaje de Solicitud
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ¿Por qué quieres unirte a esta clínica? *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                rows={5}
                placeholder="Explica tu interés en unirte a esta clínica, tu experiencia relevante, y cómo puedes contribuir al equipo médico..."
                required
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
              disabled={submitting}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors flex items-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2">ℹ️ Información sobre el proceso</h3>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Tu solicitud será revisada por los administradores de la clínica</li>
            <li>• Recibirás una notificación por email sobre el estado de tu solicitud</li>
            <li>• Una vez aprobada, tendrás acceso completo a los pacientes y funcionalidades de la clínica</li>
            <li>• El proceso de revisión puede tomar entre 1-3 días hábiles</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
