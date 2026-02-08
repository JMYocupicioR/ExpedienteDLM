import React, { useState, useEffect } from 'react';
import { Building, Settings as SettingsIcon, AlertCircle, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { PersonalClinicModal } from './PersonalClinicModal';

interface Clinic {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  director_name?: string;
  director_license?: string;
  logo_url?: string;
}

export function PersonalClinicSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadClinicInfo();
  }, [profile?.clinic_id]);

  const loadClinicInfo = async () => {
    if (!profile?.clinic_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', profile.clinic_id)
        .single();

      if (error) throw error;

      setClinic(data);
    } catch (err: any) {
      console.error('Error loading clinic info:', err);
      setError('No se pudo cargar la información de la clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleClinicUpdate = (updatedClinic: Clinic) => {
    setClinic(updatedClinic);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="card">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Clínica Personal</h3>
            <p className="text-gray-400 text-sm">
              No tienes una clínica asignada. Se creará automáticamente al aplicar la migración.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <Building className="h-6 w-6 text-cyan-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold">Mi Consultorio Personal</h3>
              <p className="text-sm text-gray-400">
                {clinic.type === 'consultorio_personal' 
                  ? 'Consultorio individual' 
                  : 'Clínica'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <SettingsIcon className="h-4 w-4" />
            Configuración Avanzada
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg flex items-center text-sm">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Clinic Information Display */}
        <div className="space-y-4">
          {/* Logo and Name */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
            {clinic.logo_url && (
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-600">
                <img
                  src={clinic.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">{clinic.name}</p>
              {clinic.director_name && (
                <p className="text-sm text-gray-400">
                  Director: {clinic.director_name}
                  {clinic.director_license && ` • Cédula: ${clinic.director_license}`}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinic.address && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <MapPin className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Dirección</p>
                  <p className="text-sm text-white">{clinic.address}</p>
                </div>
              </div>
            )}

            {clinic.phone && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <Phone className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Teléfono</p>
                  <p className="text-sm text-white">{clinic.phone}</p>
                </div>
              </div>
            )}

            {clinic.email && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <Mail className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <p className="text-sm text-white">{clinic.email}</p>
                </div>
              </div>
            )}

            {clinic.website && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <Globe className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sitio Web</p>
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    {clinic.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {(clinic.tax_id || !clinic.address) && (
            <div className="pt-4 border-t border-gray-700">
              {clinic.tax_id && (
                <p className="text-sm text-gray-400">
                  RFC / Tax ID: <span className="text-white font-mono">{clinic.tax_id}</span>
                </p>
              )}
              {!clinic.address && clinic.type === 'consultorio_personal' && (
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <p className="text-sm text-blue-300">
                    💡 <strong>Consejo:</strong> Completa la información de tu consultorio para que aparezca en 
                    recetas, reportes y otros documentos oficiales.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <PersonalClinicModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        clinic={clinic}
        onUpdate={handleClinicUpdate}
      />
    </>
  );
}

