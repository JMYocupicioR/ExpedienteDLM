import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building, MapPin, Phone, Mail, Users, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Clinic {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  website?: string;
  created_at: string;
}

export default function ClinicSearch() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    filterClinics();
  }, [searchTerm, selectedType, clinics]);

  const loadClinics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Primero intentamos cargar todas las clínicas activas
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading clinics:', error);
        setError(`Error al cargar las clínicas: ${error.message}`);
        return;
      }

      console.log('Clinics loaded:', data?.length || 0);
      setClinics(data || []);
      
      // Si no hay clínicas activas, mostrar un mensaje específico
      if (!data || data.length === 0) {
        setError('No hay clínicas activas disponibles en el sistema.');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'Error inesperado al cargar las clínicas');
    } finally {
      setLoading(false);
    }
  };

  const filterClinics = () => {
    let filtered = clinics;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(clinic =>
        clinic.name.toLowerCase().includes(term) ||
        clinic.type.toLowerCase().includes(term) ||
        clinic.address?.toLowerCase().includes(term) ||
        clinic.description?.toLowerCase().includes(term)
      );
    }

    if (selectedType) {
      filtered = filtered.filter(clinic => clinic.type === selectedType);
    }

    setFilteredClinics(filtered);
  };

  const getUniqueTypes = () => {
    const types = [...new Set(clinics.map(clinic => clinic.type))];
    return types.filter(Boolean).sort();
  };

  const handleRequestAccess = (clinicId: string, clinicName: string) => {
    // Redirigir al formulario de solicitud de acceso
    navigate(`/solicitar-acceso/${clinicId}`, { 
      state: { clinicName } 
    });
  };

  const createSampleClinics = async () => {
    try {
      setLoading(true);
      setError(null);

      const sampleClinics = [
        {
          name: 'Hospital General San José',
          type: 'hospital',
          address: 'Av. Insurgentes Sur 123, Col. Centro, CDMX',
          phone: '+52 55 1234 5678',
          email: 'contacto@hospitalsanjose.com',
          website: 'https://www.hospitalsanjose.com',
          is_active: true
        },
        {
          name: 'Clínica Especializada Santa María',
          type: 'specialist_clinic',
          address: 'Calle Reforma 456, Col. Juárez, CDMX',
          phone: '+52 55 2345 6789',
          email: 'info@clinicasantamaria.com',
          is_active: true
        },
        {
          name: 'Centro Médico Los Ángeles',
          type: 'medical_center',
          address: 'Av. Universidad 789, Col. Del Valle, CDMX',
          phone: '+52 55 3456 7890',
          email: 'contacto@centrolosangeles.com',
          website: 'https://www.centrolosangeles.com',
          is_active: true
        }
      ];

      const { data, error } = await supabase
        .from('clinics')
        .insert(sampleClinics)
        .select();

      if (error) throw error;

      console.log(`Created ${data?.length || 0} sample clinics`);
      
      // Recargar las clínicas
      await loadClinics();
      
    } catch (err: any) {
      console.error('Error creating sample clinics:', err);
      setError(`Error creando clínicas de ejemplo: ${err.message}`);
    } finally {
      setLoading(false);
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
              <Building className="h-8 w-8 mr-3 text-cyan-400" />
              Buscar Clínicas
            </h1>
            <p className="text-gray-400 mt-2">
              Encuentra y solicita acceso a clínicas médicas
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, tipo, ubicación..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                {getUniqueTypes().map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-red-400 mb-2">{error}</p>
                {error.includes('No hay clínicas activas') && (
                  <p className="text-red-300 text-sm">
                    Parece que no hay clínicas registradas en el sistema. Puedes crear algunas clínicas de ejemplo para probar la funcionalidad.
                  </p>
                )}
              </div>
              {error.includes('No hay clínicas activas') && (
                <button
                  onClick={createSampleClinics}
                  className="ml-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Crear Ejemplos
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {filteredClinics.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {searchTerm || selectedType ? 'No se encontraron clínicas' : 'No hay clínicas disponibles'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedType 
                  ? 'Intenta con diferentes términos de búsqueda'
                  : 'Actualmente no hay clínicas registradas en el sistema'
                }
              </p>
            </div>
          ) : (
            filteredClinics.map(clinic => (
              <div
                key={clinic.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-cyan-900/20 rounded-lg">
                        <Building className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {clinic.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-400 mb-2">
                          <span className="bg-gray-700 px-2 py-1 rounded capitalize">
                            {clinic.type}
                          </span>
                        </div>
                        
                        {clinic.description && (
                          <p className="text-gray-300 mb-4 line-clamp-2">
                            {clinic.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {clinic.address && (
                            <div className="flex items-center text-gray-400">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{clinic.address}</span>
                            </div>
                          )}
                          {clinic.phone && (
                            <div className="flex items-center text-gray-400">
                              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>{clinic.phone}</span>
                            </div>
                          )}
                          {clinic.email && (
                            <div className="flex items-center text-gray-400">
                              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{clinic.email}</span>
                            </div>
                          )}
                          {clinic.website && (
                            <div className="flex items-center text-gray-400">
                              <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                              <a
                                href={clinic.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-cyan-400 transition-colors truncate"
                              >
                                {clinic.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex-shrink-0">
                    <button
                      onClick={() => handleRequestAccess(clinic.id, clinic.name)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Solicitar Acceso
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results Count */}
        {filteredClinics.length > 0 && (
          <div className="text-center mt-8 text-gray-400">
            Mostrando {filteredClinics.length} de {clinics.length} clínicas
          </div>
        )}
      </div>
    </div>
  );
}
