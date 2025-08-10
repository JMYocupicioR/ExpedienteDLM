import React, { useState, useEffect } from 'react';
import { 
  Clock, User, FileText, Eye, Download, 
  AlertCircle, CheckCircle, XCircle, Calendar,
  Pill, Activity, History, Search, Filter
} from 'lucide-react';
import { useEnhancedPrescriptions } from '../hooks/useEnhancedPrescriptions';
import type { EnhancedPrescription, PrescriptionHistory } from '../lib/database.types';

interface PrescriptionHistoryViewerProps {
  prescriptionId?: string;
  showAllPrescriptions?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
};

const ActionIcon = ({ action }: { action: string }) => {
  switch (action) {
    case 'created':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'modified':
      return <Activity className="h-4 w-4 text-blue-500" />;
    case 'dispensed':
      return <Pill className="h-4 w-4 text-purple-500" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

export default function PrescriptionHistoryViewer({ 
  prescriptionId, 
  showAllPrescriptions = false 
}: PrescriptionHistoryViewerProps) {
  const { 
    prescriptions, 
    getPrescriptionHistory, 
    loading, 
    error 
  } = useEnhancedPrescriptions();

  const [selectedPrescription, setSelectedPrescription] = useState<EnhancedPrescription | null>(null);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filtrar prescripciones
  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = searchTerm === '' || 
      prescription.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prescription.medications as any[])?.some((med: any) => 
        med.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Cargar historial de prescripción específica
  const loadPrescriptionHistory = async (id: string) => {
    try {
      setHistoryLoading(true);
      const history = await getPrescriptionHistory(id);
      setPrescriptionHistory(history);
    } catch (err) {
      console.error('Error loading prescription history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Efecto para cargar historial si se proporciona prescriptionId
  useEffect(() => {
    if (prescriptionId) {
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (prescription) {
        setSelectedPrescription(prescription);
        loadPrescriptionHistory(prescriptionId);
      }
    }
  }, [prescriptionId, prescriptions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMedicationsList = (medications: unknown[]) => {
    if (!Array.isArray(medications)) return 'Sin medicamentos';
    
    return medications
      .map((med: any) => `${med.name || 'Medicamento'} ${med.dosage || ''}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-3 text-gray-400">Cargando historial...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
        <AlertCircle className="h-5 w-5 mr-2 inline" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <History className="h-6 w-6 mr-3 text-cyan-400" />
          {showAllPrescriptions ? 'Historial de Prescripciones' : 'Historial de Prescripción'}
        </h2>
      </div>

      {showAllPrescriptions && (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por diagnóstico o medicamento..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            {/* Filtro de estado */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>

          {/* Lista de prescripciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de prescripciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Prescripciones Recientes</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPrescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    onClick={() => {
                      setSelectedPrescription(prescription);
                      loadPrescriptionHistory(prescription.id);
                    }}
                    className={`
                      bg-gray-800/50 border rounded-lg p-4 cursor-pointer transition-all hover:border-cyan-400
                      ${selectedPrescription?.id === prescription.id ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <StatusIcon status={prescription.status} />
                        <span className="text-white font-medium">
                          {(prescription as any).patient?.first_name} {(prescription as any).patient?.last_name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(prescription.created_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {prescription.diagnosis && (
                        <p className="text-sm text-gray-300">
                          <strong>Diagnóstico:</strong> {prescription.diagnosis}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">
                        <strong>Medicamentos:</strong> {getMedicationsList(prescription.medications as unknown[])}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredPrescriptions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron prescripciones</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Historial detallado */}
        {selectedPrescription && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Historial Detallado
              </h3>
              {showAllPrescriptions && (
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Información de la prescripción */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Información General</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <strong>Paciente:</strong> {(selectedPrescription as any).patient?.first_name} {(selectedPrescription as any).patient?.last_name}
                    </p>
                    <p className="text-gray-300">
                      <strong>Estado:</strong> 
                      <span className={`ml-2 inline-flex items-center space-x-1 ${
                        selectedPrescription.status === 'active' ? 'text-green-400' :
                        selectedPrescription.status === 'completed' ? 'text-blue-400' :
                        'text-red-400'
                      }`}>
                        <StatusIcon status={selectedPrescription.status} />
                        <span className="capitalize">{selectedPrescription.status}</span>
                      </span>
                    </p>
                    <p className="text-gray-300">
                      <strong>Creada:</strong> {formatDate(selectedPrescription.created_at)}
                    </p>
                    {selectedPrescription.expires_at && (
                      <p className="text-gray-300">
                        <strong>Expira:</strong> {formatDate(selectedPrescription.expires_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Medicamentos</h4>
                  <div className="space-y-2">
                    {Array.isArray(selectedPrescription.medications) && 
                     selectedPrescription.medications.map((med: any, index: number) => (
                      <div key={index} className="bg-gray-700/50 rounded p-2">
                        <p className="text-sm text-white font-medium">{med.name || 'Medicamento'}</p>
                        <p className="text-xs text-gray-400">
                          {med.dosage} - {med.frequency} - {med.duration}
                        </p>
                        {med.instructions && (
                          <p className="text-xs text-gray-300 italic mt-1">{med.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedPrescription.diagnosis && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-white mb-2">Diagnóstico</h4>
                  <p className="text-sm text-gray-300">{selectedPrescription.diagnosis}</p>
                </div>
              )}

              {selectedPrescription.notes && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-white mb-2">Notas</h4>
                  <p className="text-sm text-gray-300">{selectedPrescription.notes}</p>
                </div>
              )}
            </div>

            {/* Timeline de cambios */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-4 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-cyan-400" />
                Timeline de Cambios
              </h4>

              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                  <span className="ml-2 text-gray-400">Cargando historial...</span>
                </div>
              ) : prescriptionHistory.length > 0 ? (
                <div className="space-y-4">
                  {prescriptionHistory.map((entry, index) => (
                    <div key={entry.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <ActionIcon action={entry.action} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white capitalize">
                            {entry.action === 'created' ? 'Prescripción creada' :
                             entry.action === 'modified' ? 'Prescripción modificada' :
                             entry.action === 'dispensed' ? 'Medicamentos dispensados' :
                             entry.action === 'cancelled' ? 'Prescripción cancelada' :
                             entry.action}
                          </p>
                          <span className="text-xs text-gray-400">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-400 mt-1">{entry.notes}</p>
                        )}
                        {(entry as any).performed_by_profile && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {(entry as any).performed_by_profile.first_name} {(entry as any).performed_by_profile.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay historial de cambios</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showAllPrescriptions && (
        </div>
      )}
    </div>
  );
}
