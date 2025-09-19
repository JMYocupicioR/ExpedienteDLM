import React, { useState, useEffect } from 'react';
import { 
  Pill, Calendar, Clock, Eye, Printer, Download, 
  FileText, AlertCircle, CheckCircle, XCircle,
  MoreVertical, Copy, Edit, Trash2, Star,
  Filter, Search, RefreshCw, X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePrescriptionHistory } from '@/hooks/useUnifiedPrescriptionSystem';
import VisualPrescriptionRenderer from './VisualPrescriptionRenderer';
import { supabase } from '@/lib/supabase';

interface PatientPrescriptionHistoryProps {
  patientId: string;
  patientName: string;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

export default function PatientPrescriptionHistory({
  patientId,
  patientName,
  className = '',
  showActions = true,
  compact = false
}: PatientPrescriptionHistoryProps) {
  const { history, loading, error, loadHistory, reprintPrescription } = usePrescriptionHistory(patientId);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'preview'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(entry => {
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesSearch = !searchTerm || 
      entry.medications_snapshot.some((med: any) => 
        med.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (entry.prescription as any)?.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'completed': return 'text-blue-700 bg-blue-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      case 'expired': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const handleReprint = async (entryId: string) => {
    try {
      const { layoutSnapshot, prescriptionData } = await reprintPrescription(entryId);
      // TODO: Open print dialog with original layout
      console.log('Reprinting with original layout:', { layoutSnapshot, prescriptionData });
    } catch (err) {
      console.error('Error reprinting prescription:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span className="text-gray-600">Cargando historial de recetas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error al cargar historial: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`prescription-history ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Pill className="h-5 w-5 mr-2 text-blue-500" />
            Historial de Recetas
          </h3>
          <p className="text-sm text-gray-600">
            {history.length} receta{history.length !== 1 ? 's' : ''} prescrita{history.length !== 1 ? 's' : ''} para {patientName}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadHistory()}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Actualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'list', icon: FileText, label: 'Lista' },
                { key: 'timeline', icon: Clock, label: 'Línea de tiempo' },
                { key: 'preview', icon: Eye, label: 'Vista previa' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title={label}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {!compact && (
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por medicamento o diagnóstico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="expired">Expiradas</option>
          </select>
        </div>
      )}

      {/* Content */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Pill className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">Sin recetas registradas</h4>
          <p className="text-gray-500">
            {history.length === 0 
              ? 'No se han prescrito medicamentos para este paciente'
              : 'No hay recetas que coincidan con los filtros aplicados'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'list' && (
            <PrescriptionList
              history={filteredHistory}
              onSelect={setSelectedPrescription}
              onReprint={handleReprint}
              compact={compact}
            />
          )}
          
          {viewMode === 'timeline' && (
            <PrescriptionTimeline
              history={filteredHistory}
              onSelect={setSelectedPrescription}
              onReprint={handleReprint}
            />
          )}
          
          {viewMode === 'preview' && (
            <PrescriptionPreviewGrid
              history={filteredHistory}
              onSelect={setSelectedPrescription}
              onReprint={handleReprint}
            />
          )}
        </div>
      )}

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <PrescriptionDetailModal
          prescriptionId={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          onReprint={handleReprint}
        />
      )}
    </div>
  );
}

interface PrescriptionListProps {
  history: any[];
  onSelect: (id: string) => void;
  onReprint: (id: string) => void;
  compact: boolean;
}

function PrescriptionList({ history, onSelect, onReprint, compact }: PrescriptionListProps) {
  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const prescription = entry.prescription;
        const isHorizontal = entry.layout?.orientation === 'landscape';
        
        return (
          <div
            key={entry.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelect(entry.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(entry.status)}
                    <span className="font-medium text-gray-800">
                      {format(new Date(entry.prescribed_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status === 'active' ? 'Activa' : 
                     entry.status === 'completed' ? 'Completada' :
                     entry.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                  </span>
                  
                  {isHorizontal && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      📄 Horizontal
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Diagnóstico:</strong> {prescription?.diagnosis || 'No especificado'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Medicamentos:</strong> {entry.medications_snapshot?.length || 0} prescrito{entry.medications_snapshot?.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {!compact && entry.medications_snapshot?.slice(0, 2).map((med: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-500 ml-4">
                    • {med.name} {med.dosage} - {med.frequency}
                  </div>
                ))}

                {entry.medications_snapshot?.length > 2 && !compact && (
                  <div className="text-xs text-gray-400 ml-4">
                    ... y {entry.medications_snapshot.length - 2} más
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReprint(entry.id);
                  }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Reimprimir con formato original"
                >
                  <Printer className="h-4 w-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(entry.id);
                  }}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrescriptionTimeline({ history, onSelect, onReprint }: PrescriptionListProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
      
      <div className="space-y-6">
        {history.map((entry, index) => {
          const prescription = entry.prescription;
          const isHorizontal = entry.layout?.orientation === 'landscape';
          
          return (
            <div key={entry.id} className="relative flex items-start">
              {/* Timeline dot */}
              <div className="relative z-10 flex items-center justify-center w-16 h-16">
                <div className={`w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
                  entry.status === 'active' ? 'bg-green-500' :
                  entry.status === 'completed' ? 'bg-blue-500' :
                  entry.status === 'cancelled' ? 'bg-red-500' : 'bg-orange-500'
                }`}>
                  <Pill className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Content card */}
              <div className="flex-1 ml-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800 flex items-center gap-2">
                      {format(new Date(entry.prescribed_at), 'dd MMMM yyyy', { locale: es })}
                      {isHorizontal && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          Horizontal
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600">{prescription?.diagnosis}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(entry.status)}
                    <span className="text-xs text-gray-500">
                      {format(new Date(entry.prescribed_at), 'HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {entry.medications_snapshot?.slice(0, 3).map((med: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="font-medium">{med.name}</span>
                      <span className="text-gray-600">{med.dosage}</span>
                      <span className="text-gray-500">• {med.frequency}</span>
                    </div>
                  ))}
                  
                  {entry.medications_snapshot?.length > 3 && (
                    <div className="text-xs text-gray-400 ml-4">
                      +{entry.medications_snapshot.length - 3} medicamentos más
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status === 'active' ? 'Activa' : 
                     entry.status === 'completed' ? 'Completada' :
                     entry.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onReprint(entry.id)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    >
                      Reimprimir
                    </button>
                    <button
                      onClick={() => onSelect(entry.id)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrescriptionPreviewGrid({ history, onSelect, onReprint }: PrescriptionListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {history.map((entry) => {
        const prescription = entry.prescription;
        const isHorizontal = entry.layout?.orientation === 'landscape';
        
        return (
          <div
            key={entry.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelect(entry.id)}
          >
            {/* Preview */}
            <div className="h-32 bg-gray-50 border-b border-gray-200 relative overflow-hidden">
              {entry.layout_snapshot ? (
                <div className="transform scale-50 origin-top-left">
                  <VisualPrescriptionRenderer
                    layout={entry.layout_snapshot}
                    prescriptionData={{
                      patientName: 'Paciente',
                      doctorName: 'Dr. Médico',
                      medications: entry.medications_snapshot,
                      diagnosis: prescription?.diagnosis || ''
                    }}
                    isPrintMode={false}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {/* Orientation badge */}
              {isHorizontal && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium">
                  📄 Horizontal
                </div>
              )}
              
              {/* Status badge */}
              <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.status)}`}>
                {entry.status === 'active' ? 'Activa' : 
                 entry.status === 'completed' ? 'Completada' :
                 entry.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">
                  {format(new Date(entry.prescribed_at), 'dd MMM yyyy', { locale: es })}
                </span>
                {getStatusIcon(entry.status)}
              </div>
              
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {prescription?.diagnosis}
              </p>
              
              <p className="text-xs text-gray-500">
                {entry.medications_snapshot?.length || 0} medicamento{entry.medications_snapshot?.length !== 1 ? 's' : ''}
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReprint(entry.id);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Reimprimir
                </button>
                
                <span className="text-xs text-gray-400">
                  {entry.layout?.name || 'Sin plantilla'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PrescriptionDetailModalProps {
  prescriptionId: string;
  onClose: () => void;
  onReprint: (id: string) => void;
}

function PrescriptionDetailModal({ prescriptionId, onClose, onReprint }: PrescriptionDetailModalProps) {
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'preview' | 'history'>('details');

  useEffect(() => {
    const loadPrescriptionDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('patient_prescription_history')
          .select(`
            *,
            prescription:prescriptions(
              id, medications, diagnosis, notes, created_at, status, expires_at
            ),
            layout:prescription_layouts_unified(
              id, name, orientation, page_size, template_elements, canvas_settings
            )
          `)
          .eq('id', prescriptionId)
          .single();

        if (error) throw error;
        setPrescription(data);
      } catch (error) {
        console.error('Error loading prescription details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptionDetails();
  }, [prescriptionId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-3" />
            <span>Cargando detalles...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Pill className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Detalles de la Receta</h3>
              <p className="text-sm text-gray-600">
                {prescription?.prescription?.diagnosis || 'Sin diagnóstico'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'details', label: 'Detalles', icon: FileText },
            { key: 'preview', label: 'Vista Previa', icon: Eye },
            { key: 'history', label: 'Historial', icon: Clock }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              {/* Prescription Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Información General
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de prescripción:</span>
                      <span className="font-medium">
                        {format(new Date(prescription?.prescribed_at), 'dd MMM yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription?.status)}`}>
                        {prescription?.status === 'active' ? 'Activa' : 
                         prescription?.status === 'completed' ? 'Completada' :
                         prescription?.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expira:</span>
                      <span className="font-medium">
                        {prescription?.expires_at ? format(new Date(prescription.expires_at), 'dd MMM yyyy', { locale: es }) : 'No especificado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plantilla usada:</span>
                      <span className="font-medium">
                        {prescription?.layout?.name || 'Sin plantilla'} 
                        {prescription?.layout?.orientation === 'landscape' && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Horizontal
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Diagnóstico
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {prescription?.prescription?.diagnosis || 'No especificado'}
                  </p>
                  
                  {prescription?.prescription?.notes && (
                    <>
                      <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">
                        Notas Adicionales
                      </h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">
                        {prescription.prescription.notes}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Medications List */}
              <div>
                <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2 mb-4">
                  Medicamentos Prescritos ({prescription?.medications_snapshot?.length || 0})
                </h4>
                <div className="space-y-3">
                  {prescription?.medications_snapshot?.map((med: any, index: number) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-800 mb-2">
                            {index + 1}. {med.name} {med.dosage}
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Frecuencia:</span> {med.frequency}
                            </div>
                            <div>
                              <span className="font-medium">Duración:</span> {med.duration}
                            </div>
                            {med.instructions && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Instrucciones:</span> {med.instructions}
                              </div>
                            )}
                            {med.indication && (
                              <div className="md:col-span-2">
                                <span className="font-medium">Indicación:</span> {med.indication}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-4 min-h-[600px] flex items-center justify-center">
                {prescription?.layout_snapshot ? (
                  <div className="bg-white shadow-lg">
                    <VisualPrescriptionRenderer
                      layout={prescription.layout_snapshot}
                      prescriptionData={{
                        patientName: 'Paciente de Ejemplo',
                        doctorName: 'Dr. Médico',
                        medications: prescription.medications_snapshot,
                        diagnosis: prescription.prescription?.diagnosis || '',
                        notes: prescription.prescription?.notes || ''
                      }}
                      isPrintMode={false}
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>No hay diseño visual guardado para esta receta</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Historial de cambios en desarrollo</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Prescrita el {prescription?.prescribed_at ? format(new Date(prescription.prescribed_at), 'dd MMM yyyy HH:mm', { locale: es }) : 'Fecha desconocida'}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onReprint(prescriptionId)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Reimprimir Original
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get status icon (moved outside component to avoid recreation)
function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'expired': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default: return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

// Helper function to get status color classes
function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-green-700 bg-green-100';
    case 'completed': return 'text-blue-700 bg-blue-100';
    case 'cancelled': return 'text-red-700 bg-red-100';
    case 'expired': return 'text-orange-700 bg-orange-100';
    default: return 'text-gray-700 bg-gray-100';
  }
}
