import React, { useState, useMemo } from 'react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, RefreshCw, ChevronDown, ChevronUp, Clock, Plus, Filter, TrendingUp, X, Calendar as CalendarIcon
} from 'lucide-react';
import ConsultationDetailsEnhanced from './ConsultationDetailsEnhanced';
import type { Database } from '@/lib/database.types';

type Consultation = Database['public']['Tables']['consultations']['Row'];

interface ConsultationListEnhancedProps {
  consultations: Consultation[];
  onRefresh: () => void;
  onNewConsultation: () => void;
  loading?: boolean;
}

export default function ConsultationListEnhanced({
  consultations,
  onRefresh,
  onNewConsultation,
  loading = false
}: ConsultationListEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filtrar consultas con múltiples criterios
  const filteredConsultations = useMemo(() => {
    return consultations.filter(consultation => {
      // Filtro de búsqueda
      const matchesSearch = !searchQuery ||
        consultation.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consultation.current_condition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consultation.treatment?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de fecha desde
      const matchesDateFrom = !dateFrom ||
        isAfter(new Date(consultation.created_at), startOfDay(new Date(dateFrom))) ||
        format(new Date(consultation.created_at), 'yyyy-MM-dd') === dateFrom;

      // Filtro de fecha hasta
      const matchesDateTo = !dateTo ||
        isBefore(new Date(consultation.created_at), endOfDay(new Date(dateTo))) ||
        format(new Date(consultation.created_at), 'yyyy-MM-dd') === dateTo;

      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [consultations, searchQuery, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo;

  // Estadísticas rápidas
  const stats = {
    total: consultations.length,
    thisMonth: consultations.filter(c => {
      const consultDate = new Date(c.created_at);
      const now = new Date();
      return consultDate.getMonth() === now.getMonth() && consultDate.getFullYear() === now.getFullYear();
    }).length,
    lastThirtyDays: consultations.filter(c => {
      const consultDate = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return consultDate >= thirtyDaysAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total de Consultas</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Este Mes</p>
              <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Últimos 30 Días</p>
              <p className="text-2xl font-bold text-white">{stats.lastThirtyDays}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Header con búsqueda y filtros */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Historial de Consultas</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters || hasActiveFilters ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Filtros"
            >
              <Filter className="h-4 w-4" />
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                title="Limpiar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-white mb-3">Filtros Avanzados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Desde</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Mostrando {filteredConsultations.length} de {consultations.length} consultas
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabla de consultas */}
        {filteredConsultations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Hora</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Diagnóstico</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Estado</th>
                  <th className="text-center py-3 px-4 text-gray-300 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultations.map((consultation) => (
                  <React.Fragment key={consultation.id}>
                    <tr className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                      <td className="py-3 px-4 text-white">
                        {format(new Date(consultation.created_at), "dd/MM/yyyy", { locale: es })}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {format(new Date(consultation.created_at), "HH:mm", { locale: es })}
                      </td>
                      <td className="py-3 px-4 text-white">
                        <div className="max-w-xs truncate">
                          {consultation.diagnosis || 'Sin diagnóstico'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completada
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedConsultation(
                            expandedConsultation === consultation.id ? null : consultation.id
                          )}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Ver detalles"
                        >
                          {expandedConsultation === consultation.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedConsultation === consultation.id && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 bg-gray-700">
                          <ConsultationDetailsEnhanced
                            consultation={consultation}
                            previousConsultation={filteredConsultations[filteredConsultations.findIndex(c => c.id === consultation.id) + 1]}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No hay consultas</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery ?
                'No se encontraron consultas que coincidan con tu búsqueda.' :
                'Comienza creando una nueva consulta para este paciente.'
              }
            </p>
            {!searchQuery && (
              <div className="mt-6">
                <button
                  onClick={onNewConsultation}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Consulta
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
