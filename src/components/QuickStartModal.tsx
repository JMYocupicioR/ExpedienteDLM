import React, { useState, useCallback } from 'react';
import { X, Plus, UserPlus, Activity, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientSelector from './PatientSelector';
import NewPatientForm from './NewPatientForm';
import { useValidationNotifications } from './ValidationNotification';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onPatientSelected?: (patient: Patient) => void;
  mode?: 'consultation' | 'appointment' | 'select';
}

export default function QuickStartModal({ 
  isOpen, 
  onClose, 
  title = 'Iniciar Consulta',
  onPatientSelected,
  mode = 'consultation'
}: QuickStartModalProps) {
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { addSuccess } = useValidationNotifications();

  const handlePatientSelect = useCallback((patient: Patient) => {
    if (onPatientSelected) {
      // Custom handler provided
      onPatientSelected(patient);
      onClose();
    } else if (mode === 'consultation') {
      // Default behavior: navigate to new consultation
      addSuccess('Paciente seleccionado', `Iniciando consulta para ${patient.full_name}`);
      navigate(`/expediente/${patient.id}`);
      onClose();
    } else if (mode === 'appointment') {
      // Navigate to appointment creation
      navigate(`/appointments/new?patientId=${patient.id}`);
      onClose();
    }
  }, [mode, onPatientSelected, navigate, onClose, addSuccess]);

  const handleNewPatientSaved = useCallback((newPatient: Patient) => {
    // Immediately navigate to consultation for the new patient
    addSuccess('Paciente creado', `Iniciando consulta para ${newPatient.full_name}`);
    navigate(`/consultation/new/${newPatient.id}`);
    setShowNewPatientForm(false);
    onClose();
  }, [navigate, onClose, addSuccess]);

  const handleClose = () => {
    setShowNewPatientForm(false);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal - Patient Selection */}
      {!showNewPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex p-0 lg:p-4">
          <div className="bg-gray-800 rounded-none lg:rounded-lg shadow-xl w-full max-w-4xl lg:max-h-[90vh] lg:mx-auto lg:my-auto flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <div className="flex items-center">
                <Activity className="h-6 w-6 text-cyan-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">{title}</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-2 transition-colors touch-target"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="p-4 lg:p-6">
                {/* Quick action buttons */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowNewPatientForm(true)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    Registrar Nuevo Paciente
                  </button>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, CURP o teléfono..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Patient Selector */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Seleccionar Paciente Existente</h4>
                  <PatientSelector
                    onPatientSelect={handlePatientSelect}
                    searchQuery={searchQuery}
                    showRecentPatients={true}
                    className="max-h-[50vh] overflow-y-auto"
                  />
                </div>

                {/* Help text */}
                <div className="mt-4 text-center text-sm text-gray-400">
                  <p>Selecciona un paciente de la lista o registra uno nuevo para continuar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Form Modal */}
      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={handleNewPatientSaved}
      />
    </>
  );
}
