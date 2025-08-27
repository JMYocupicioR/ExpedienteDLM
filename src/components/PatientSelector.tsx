import { Button } from '@/components/ui/button';
import NewPatientForm from '@/features/patients/components/NewPatientForm';
import { usePatients } from '@/features/patients/hooks/usePatients';
import type { Patient } from '@/features/patients/services/patientService';
import { supabase } from '@/lib/supabase';
import { Check, Mail, Phone, Plus, Search, User, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// El tipo Patient ahora se importa desde el servicio
// ...

interface PatientSelectorProps {
  selectedPatientId?: string;
  onPatientSelect: (patient: Patient | null) => void; // Permitir nulo para deseleccionar
  onNewPatient?: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  searchQuery?: string;
  showRecentPatients?: boolean;
}

export default function PatientSelector({
  selectedPatientId = '',
  onPatientSelect,
  onNewPatient,
  placeholder = 'Buscar paciente...',
  className = '',
  searchQuery = '',
  showRecentPatients = false,
}: PatientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const { patientsQuery } = usePatients(); // Usar el hook centralizado
  const { data: patients = [], isLoading: loading } = patientsQuery;
  
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar pacientes es manejado por usePatients() hook
  // useEffect(() => {
  //   loadPatients();
  // }, [showRecentPatients]);

  // Actualizar paciente seleccionado cuando cambia el ID
  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
        setSearchTerm(patient.full_name);
      }
    } else if (!selectedPatientId) {
      // Limpiar selección si el ID se vuelve nulo o vacío
      setSelectedPatient(null);
      setSearchTerm('');
    }
  }, [selectedPatientId, patients]);

  // Sincronizar searchQuery prop con searchTerm state
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Filtrar pacientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = patients.filter(
        patient =>
          patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.phone?.includes(searchTerm) ||
          false
      );
      setFilteredPatients(filtered);
    } else {
      // Mostrar recientes o los primeros 10 si no hay término de búsqueda
      setFilteredPatients(patients.slice(0, 10));
    }
  }, [searchTerm, patients]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !searchRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // loadPatients() ya no es necesario, es manejado por React Query en usePatients
  /*
  const loadPatients = async () => { ... }
  */

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.full_name);
    setIsOpen(false);
    onPatientSelect(patient);
  };

  const handleSearchFocus = () => {
    setIsOpen(true);
    if (searchTerm && selectedPatient) {
      setSearchTerm('');
      setSelectedPatient(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);

    if (!value && selectedPatient) {
      setSelectedPatient(null);
      onPatientSelect(null); // Usar null para limpiar
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearSelection = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    onPatientSelect(null); // Usar null para limpiar
    searchRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Campo de búsqueda */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
        <input
          ref={searchRef}
          type='text'
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedPatient ? selectedPatient.full_name : placeholder}
          className='w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent'
        />

        {selectedPatient && (
          <button
            onClick={clearSelection}
            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white'
          >
            <X className='h-4 w-4' />
          </button>
        )}

        {!selectedPatient && (
          <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
            {loading ? (
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400'></div>
            ) : (
              <Search className='h-4 w-4 text-gray-400' />
            )}
          </div>
        )}
      </div>

      {/* Información del paciente seleccionado */}
      {selectedPatient && (
        <div className='mt-2 p-3 bg-gray-700 rounded-lg border border-green-500'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center'>
              <Check className='h-4 w-4 text-white' />
            </div>
            <div className='flex-1'>
              <p className='text-white font-medium'>{selectedPatient.full_name}</p>
              <div className='flex flex-wrap gap-4 text-sm text-gray-300'>
                {selectedPatient.phone && (
                  <span className='flex items-center'>
                    <Phone className='h-3 w-3 mr-1' />
                    {selectedPatient.phone}
                  </span>
                )}
                {selectedPatient.email && (
                  <span className='flex items-center'>
                    <Mail className='h-3 w-3 mr-1' />
                    {selectedPatient.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown de resultados */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className='absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto'
        >
          {/* Opción para crear nuevo paciente */}
          <div className='p-3 border-b border-gray-700'>
            <Button
              onClick={() => setShowNewPatientForm(true)}
              variant='outline'
              className='w-full border-green-400 text-green-400 hover:bg-green-400 hover:text-gray-900'
            >
              <Plus className='h-4 w-4 mr-2' />
              Crear Nuevo Paciente
              {searchTerm && ` "${searchTerm}"`}
            </Button>
          </div>

          {/* Lista de pacientes */}
          <div className='max-h-60 overflow-y-auto'>
            {filteredPatients.length > 0 ? (
              filteredPatients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className='w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0'
                >
                  <div className='flex items-center space-x-3'>
                    <div className='w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center'>
                      <User className='h-4 w-4 text-white' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-white font-medium'>{patient.full_name}</p>
                      <div className='flex flex-wrap gap-4 text-sm text-gray-400'>
                        {patient.phone && (
                          <span className='flex items-center'>
                            <Phone className='h-3 w-3 mr-1' />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className='flex items-center'>
                            <Mail className='h-3 w-3 mr-1' />
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : searchTerm.length > 0 ? (
              <div className='p-4 text-center text-gray-400'>
                <User className='h-8 w-8 mx-auto mb-2 text-gray-600' />
                <p className='text-sm'>No se encontraron pacientes</p>
                <p className='text-xs mt-1'>
                  Prueba con un término diferente o crea un nuevo paciente
                </p>
              </div>
            ) : (
              <div className='p-4 text-center text-gray-400'>
                <p className='text-sm'>Escribe para buscar pacientes</p>
              </div>
            )}
          </div>

          {/* Información adicional */}
          {patients.length > filteredPatients.length && searchTerm.length === 0 && (
            <div className='p-3 border-t border-gray-700 text-center'>
              <p className='text-xs text-gray-400'>
                Mostrando {filteredPatients.length} de {patients.length} pacientes
              </p>
              <p className='text-xs text-gray-500'>Escribe para buscar más</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de nuevo paciente */}
      {showNewPatientForm && (
        <NewPatientForm
          isOpen={showNewPatientForm}
          onClose={() => setShowNewPatientForm(false)}
          onSave={newPatient => {
            // La caché de usePatients se invalida automáticamente,
            // por lo que no necesitamos actualizar el estado local de 'patients'.
            // Simplemente seleccionamos el nuevo paciente.
            handlePatientSelect(newPatient);
            setShowNewPatientForm(false);
            onNewPatient?.(newPatient);
          }}
          initialName={searchTerm}
        />
      )}
    </div>
  );
}

// El modal NewPatientModal ha sido eliminado por completo.
// Se ha reemplazado por el componente reutilizable y refactorizado NewPatientForm.
