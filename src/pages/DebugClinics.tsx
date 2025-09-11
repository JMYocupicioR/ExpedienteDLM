import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, AlertCircle, CheckCircle, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DebugInfo {
  totalClinics: number;
  activeClinics: number;
  inactiveClinics: number;
  clinics: any[];
  error?: string;
}

export default function DebugClinics() {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      setLoading(true);
      
      // Consulta sin filtros para ver todas las clínicas
      const { data: allClinics, error: allError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) {
        setDebugInfo({
          totalClinics: 0,
          activeClinics: 0,
          inactiveClinics: 0,
          clinics: [],
          error: allError.message
        });
        return;
      }

      const total = allClinics?.length || 0;
      const active = allClinics?.filter(c => c.is_active === true).length || 0;
      const inactive = total - active;

      setDebugInfo({
        totalClinics: total,
        activeClinics: active,
        inactiveClinics: inactive,
        clinics: allClinics || [],
        error: undefined
      });

    } catch (err: any) {
      setDebugInfo({
        totalClinics: 0,
        activeClinics: 0,
        inactiveClinics: 0,
        clinics: [],
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleClinic = async () => {
    try {
      const sampleClinic = {
        name: `Clínica de Prueba ${Date.now()}`,
        type: 'clinic',
        address: 'Dirección de prueba 123',
        phone: '+52 55 1234 5678',
        email: 'prueba@clinica.com',
        is_active: true
      };

      const { data, error } = await supabase
        .from('clinics')
        .insert(sampleClinic)
        .select()
        .single();

      if (error) {
        alert(`Error creando clínica: ${error.message}`);
        return;
      }

      alert('Clínica de prueba creada exitosamente');
      loadDebugInfo(); // Recargar información
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Database className="h-8 w-8 mr-3 text-cyan-400" />
              Debug Clínicas
            </h1>
            <p className="text-gray-400 mt-2">
              Información de diagnóstico sobre las clínicas en la base de datos
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-white">{debugInfo?.totalClinics || 0}</p>
                <p className="text-gray-400 text-sm">Total Clínicas</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-white">{debugInfo?.activeClinics || 0}</p>
                <p className="text-gray-400 text-sm">Clínicas Activas</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-400 mr-3" />
              <div>
                <p className="text-2xl font-bold text-white">{debugInfo?.inactiveClinics || 0}</p>
                <p className="text-gray-400 text-sm">Clínicas Inactivas</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <button
              onClick={createSampleClinic}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Building className="h-4 w-4 mr-2" />
              Crear Prueba
            </button>
          </div>
        </div>

        {/* Error */}
        {debugInfo?.error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-400 font-medium">Error de Base de Datos</p>
            </div>
            <p className="text-red-300 mt-2">{debugInfo.error}</p>
          </div>
        )}

        {/* Clinics List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Clínicas en Base de Datos</h2>
          
          {debugInfo?.clinics.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No hay clínicas registradas
              </h3>
              <p className="text-gray-500 mb-4">
                La tabla de clínicas está vacía. Esto explica por qué no puedes ver ninguna clínica.
              </p>
              <button
                onClick={createSampleClinic}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Crear Primera Clínica
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {debugInfo?.clinics.map((clinic, index) => (
                <div
                  key={clinic.id || index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {clinic.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Tipo:</p>
                          <p className="text-white capitalize">{clinic.type}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Estado:</p>
                          <p className={`font-medium ${clinic.is_active ? 'text-green-400' : 'text-red-400'}`}>
                            {clinic.is_active ? 'Activa' : 'Inactiva'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Teléfono:</p>
                          <p className="text-white">{clinic.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Email:</p>
                          <p className="text-white">{clinic.email || 'N/A'}</p>
                        </div>
                      </div>
                      {clinic.address && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-sm">Dirección:</p>
                          <p className="text-white text-sm">{clinic.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate('/buscar-clinicas')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors mr-4"
          >
            Ir a Buscar Clínicas
          </button>
          <button
            onClick={() => navigate('/registrar-clinica')}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Registrar Nueva Clínica
          </button>
        </div>
      </div>
    </div>
  );
}
