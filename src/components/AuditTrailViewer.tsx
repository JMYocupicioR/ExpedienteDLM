import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AuditService, AuditHistoryEntry } from '@/lib/services/audit-service';
import { useAuth } from '@/features/authentication/hooks/useAuth';

interface AuditTrailViewerProps {
  patientId: string;
  className?: string;
}

type ViewMode = 'combined' | 'patient' | 'consultations' | 'appointments';

interface FilterOptions {
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | '';
  dateFrom?: string;
  dateTo?: string;
  userFilter?: string;
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ 
  patientId, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [auditData, setAuditData] = useState<{
    patient: AuditHistoryEntry[];
    consultations: AuditHistoryEntry[];
    appointments: AuditHistoryEntry[];
    combined: AuditHistoryEntry[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditHistory();
  }, [patientId]);

  const loadAuditHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await AuditService.getPatientAuditHistory(patientId);
      setAuditData(data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el historial de auditoría';
      setError(errorMessage);
      console.error('Error loading audit history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayData = (): AuditHistoryEntry[] => {
    if (!auditData) return [];
    
    let data: AuditHistoryEntry[] = [];
    
    switch (viewMode) {
      case 'patient':
        data = auditData.patient;
        break;
      case 'consultations':
        data = auditData.consultations;
        break;
      case 'appointments':
        data = auditData.appointments;
        break;
      default:
        data = auditData.combined;
    }

    // Aplicar filtros
    return data.filter(item => {
      if (filters.action && item.action !== filters.action) return false;
      if (filters.dateFrom && new Date(item.timestamp) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(item.timestamp) > new Date(filters.dateTo)) return false;
      if (filters.userFilter && !item.user_name?.toLowerCase().includes(filters.userFilter.toLowerCase())) return false;
      return true;
    });
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'UPDATE':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'DELETE':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatFieldName = (fieldName: string): string => {
    const fieldNames: Record<string, string> = {
      full_name: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      diagnosis: 'Diagnóstico',
      treatment: 'Tratamiento',
      status: 'Estado',
      birth_date: 'Fecha de nacimiento',
      gender: 'Género',
      address: 'Dirección',
      current_condition: 'Padecimiento actual',
      vital_signs: 'Signos vitales',
      physical_examination: 'Exploración física',
      prognosis: 'Pronóstico',
      appointment_date: 'Fecha de cita',
      appointment_time: 'Hora de cita',
      title: 'Título',
      description: 'Descripción'
    };
    return fieldNames[fieldName] || fieldName;
  };

  const displayData = getDisplayData();

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando historial de auditoría...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error al cargar auditoría</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button 
                onClick={loadAuditHistory}
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Bitácora de Auditoría</h3>
          <p className="text-sm text-gray-500">
            Historial inmutable de cambios (NOM-024) - {displayData.length} registros
          </p>
        </div>
        
        <button
          onClick={loadAuditHistory}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vista</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="combined">Todo</option>
              <option value="patient">Solo Paciente</option>
              <option value="consultations">Solo Consultas</option>
              <option value="appointments">Solo Citas</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <select
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="INSERT">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {displayData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2">No se encontraron registros de auditoría</p>
          </div>
        ) : (
          displayData.map((item, index) => {
            const isExpanded = expandedItems.has(item.id);
            
            return (
              <div key={item.id} className="relative">
                {/* Timeline line */}
                {index < displayData.length - 1 && (
                  <div className="absolute left-4 top-10 h-full w-0.5 bg-gray-200"></div>
                )}
                
                <div className="relative flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getActionIcon(item.action)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {item.summary}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                            item.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.action === 'INSERT' ? 'Creación' :
                             item.action === 'UPDATE' ? 'Modificación' : 'Eliminación'}
                          </span>
                        </div>
                        
                        <div className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">{item.user_name || 'Sistema'}</span>
                          {' • '}
                          <time dateTime={item.timestamp}>
                            {format(new Date(item.timestamp), 'PPp', { locale: es })}
                          </time>
                        </div>
                      </div>
                      
                      {item.changes && item.changes.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                          <svg 
                            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && item.changes && item.changes.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Cambios detallados:</h5>
                        <div className="space-y-2">
                          {item.changes.map((change, changeIndex) => (
                            <div key={changeIndex} className="bg-gray-50 rounded p-3">
                              <div className="text-sm font-medium text-gray-700">
                                {formatFieldName(change.field)}
                              </div>
                              <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Anterior:</span>
                                  <div className="text-red-600 font-mono bg-red-50 p-1 rounded mt-1">
                                    {change.old_value === null ? 'null' : String(change.old_value)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Nuevo:</span>
                                  <div className="text-green-600 font-mono bg-green-50 p-1 rounded mt-1">
                                    {change.new_value === null ? 'null' : String(change.new_value)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500 text-center">
          Esta bitácora es inmutable y cumple con los requisitos de la NOM-024-SSA3-2013
          <br />
          para la inalterabilidad de los expedientes clínicos electrónicos.
        </p>
      </div>
    </div>
  );
};

export default AuditTrailViewer;
