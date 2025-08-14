import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { ChevronDown, Plus, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClinicSwitcher: React.FC = () => {
  const { 
    activeClinic, 
    setActiveClinic, 
    userClinics, 
    isLoading,
    createClinic,
    joinClinic,
    leaveClinic
  } = useClinic();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form states for creating clinic
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Ref for detecting clicks outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-2 text-sm text-gray-400 bg-gray-800 border border-gray-700 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        <span>Cargando...</span>
      </div>
    );
  }

  const handleClinicSelect = (clinic: any) => {
    setActiveClinic(clinic);
    setIsOpen(false);
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim()) return;

    setIsCreating(true);
    try {
      const newClinic = await createClinic({
        name: newClinicName.trim(),
        address: newClinicAddress.trim() || undefined
      });

      if (newClinic) {
        setShowCreateModal(false);
        setNewClinicName('');
        setNewClinicAddress('');
      }
    } catch (error) {
      console.error('Error creating clinic:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClinic = async (clinicId: string) => {
    try {
      const success = await joinClinic(clinicId);
      if (success) {
        setShowJoinModal(false);
        setSearchTerm('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error joining clinic:', error);
    }
  };

  const handleSearchClinics = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      // Try Edge Function first, fallback to direct query
      let clinics = [];
      
      try {
        // Call the Edge Function to search clinics
        const { data, error } = await supabase.functions.invoke('search-clinics', {
          body: { searchTerm: searchTerm.trim() },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        clinics = data?.data || [];
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, trying direct query:', edgeFunctionError);
        
        // Fallback: Direct query to clinics table
        const { data: directResults, error: directError } = await supabase
          .from('clinics')
          .select('id, name, address')
          .ilike('name', `%${searchTerm.trim()}%`)
          .limit(20)
          .order('name');

        if (directError) throw directError;
        
        // Filter out clinics where user is already a member
        const { data: userMemberships } = await supabase
          .from('clinic_members')
          .select('clinic_id')
          .eq('user_id', session.user.id);

        const userClinicIds = userMemberships?.map(m => m.clinic_id) || [];
        clinics = directResults?.filter(clinic => 
          !userClinicIds.includes(clinic.id)
        ) || [];
      }
      
      setSearchResults(clinics);
    } catch (error) {
      console.error('Error searching clinics:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLeaveClinic = async (clinicId: string) => {
    if (window.confirm('¿Estás seguro de que quieres salir de esta clínica?')) {
      await leaveClinic(clinicId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Clinic Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate text-left">
            {activeClinic ? activeClinic.name : 'Sin clínica'}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="py-1">
            {/* Current Clinic Info */}
            {activeClinic && (
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-900">
                  Clínica Activa
                </div>
                <div className="text-sm text-gray-600">
                  {activeClinic.name}
                </div>
                {activeClinic.address && (
                  <div className="text-xs text-gray-500 mt-1">
                    {activeClinic.address}
                  </div>
                )}
              </div>
            )}

            {/* User's Clinics */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Mis Clínicas
              </div>
              {userClinics.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No perteneces a ninguna clínica
                </div>
              ) : (
                <div className="space-y-1">
                  {userClinics.map((membership) => (
                    <div key={membership.clinic_id} className="flex items-center justify-between">
                      <button
                        onClick={() => handleClinicSelect(membership.clinic!)}
                        className={`flex-1 text-left text-sm py-1 px-2 rounded hover:bg-gray-100 ${
                          activeClinic?.id === membership.clinic_id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{membership.clinic?.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            membership.role === 'admin' 
                              ? 'bg-red-100 text-red-800'
                              : membership.role === 'doctor'
                              ? 'bg-blue-100 text-blue-800'
                              : membership.role === 'pending_approval'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {membership.role === 'admin' ? 'Admin' :
                             membership.role === 'doctor' ? 'Doctor' :
                             membership.role === 'nurse' ? 'Enfermero' :
                             membership.role === 'staff' ? 'Staff' :
                             'Pendiente'}
                          </span>
                        </div>
                      </button>
                      {userClinics.length > 1 && (
                        <button
                          onClick={() => handleLeaveClinic(membership.clinic_id)}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                          title="Salir de la clínica"
                        >
                          Salir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-2 space-y-2">
              {/* Configuración de Clínica - Solo visible si es admin */}
              {activeClinic && userClinics.find(m => m.clinic_id === activeClinic.id)?.role === 'admin' && (
                <button
                  onClick={() => {
                    window.location.href = '/clinic/settings';
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Configuración de Clínica</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4" />
                <span>Crear Nueva Clínica</span>
              </button>
              
              <button
                onClick={() => {
                  setShowJoinModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <Building className="h-4 w-4" />
                <span>Unirse a Clínica</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Clinic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Crear Nueva Clínica
            </h3>
            <form onSubmit={handleCreateClinic}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Clínica *
                  </label>
                  <input
                    type="text"
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Nombre de la clínica"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección (opcional)
                  </label>
                  <input
                    type="text"
                    value={newClinicAddress}
                    onChange={(e) => setNewClinicAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Dirección de la clínica"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newClinicName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creando...' : 'Crear Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Clinic Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Unirse a Clínica Existente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar Clínica
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Nombre de la clínica"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchClinics()}
                  />
                  <button
                    onClick={handleSearchClinics}
                    disabled={!searchTerm.trim() || isSearching}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map((clinic) => (
                    <div key={clinic.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <div className="font-medium text-gray-900">{clinic.name}</div>
                        {clinic.address && (
                          <div className="text-sm text-gray-500">{clinic.address}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleJoinClinic(clinic.id)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Unirse
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchTerm && !isSearching && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No se encontraron clínicas con ese nombre
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSwitcher;
