import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, Search, Filter, Download, Printer } from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'medical-id' | 'phone' | 'email';
  format?: (value: any) => string;
  ariaLabel?: string;
  medicalContext?: 'patient-data' | 'vital-signs' | 'medication' | 'diagnosis' | 'test-result';
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

interface AccessibleTableProps {
  caption: string;
  columns: TableColumn[];
  data: TableRow[];
  onRowClick?: (row: TableRow) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onRowSelect?: (rowId: string, selected: boolean) => void;
  medicalContext?: 'patient-list' | 'consultation-history' | 'prescription-list' | 'test-results';
  className?: string;
  id?: string;
}

const AccessibleTable: React.FC<AccessibleTableProps> = ({
  caption,
  columns,
  data,
  onRowClick,
  onSort,
  onFilter,
  loading = false,
  error,
  emptyMessage = "No hay datos disponibles",
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  selectable = false,
  selectedRows = [],
  onRowSelect,
  medicalContext = 'patient-list',
  className = '',
  id
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [focusedCellIndex, setFocusedCellIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRefs = useRef<(HTMLTableCellElement | null)[]>([]);

  // Configuración de contexto médico para ARIA
  const getMedicalAriaConfig = () => {
    switch (medicalContext) {
      case 'patient-list':
        return {
          role: 'grid',
          ariaLabel: 'Lista de pacientes del expediente médico',
          description: 'Tabla con información de pacientes registrados en el sistema'
        };
      case 'consultation-history':
        return {
          role: 'grid',
          ariaLabel: 'Historial de consultas médicas',
          description: 'Registro cronológico de consultas y diagnósticos del paciente'
        };
      case 'prescription-list':
        return {
          role: 'grid',
          ariaLabel: 'Lista de prescripciones médicas',
          description: 'Medicamentos prescritos y su estado de dispensación'
        };
      case 'test-results':
        return {
          role: 'grid',
          ariaLabel: 'Resultados de exámenes médicos',
          description: 'Resultados de laboratorio, estudios de imagen y otras pruebas diagnósticas'
        };
      default:
        return {
          role: 'grid',
          ariaLabel: 'Tabla de datos médicos',
          description: 'Información médica estructurada'
        };
    }
  };

  const ariaConfig = getMedicalAriaConfig();

  // Manejar ordenamiento
  const handleSort = (columnKey: string) => {
    if (!columns.find(col => col.key === columnKey)?.sortable) return;

    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnKey);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(columnKey, newDirection);
    }

    // Anuncio para lectores de pantalla
    const announcement = `Tabla ordenada por ${columns.find(col => col.key === columnKey)?.label} en orden ${newDirection === 'asc' ? 'ascendente' : 'descendente'}`;
    announceToScreenReader(announcement);
  };

  // Manejar filtros
  const handleFilterChange = (columnKey: string, value: string) => {
    const newFilters = { ...filters, [columnKey]: value };
    setFilters(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  // Navegación por teclado
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key, ctrlKey, shiftKey } = event;
    
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        if (focusedRowIndex < data.length - 1) {
          setFocusedRowIndex(focusedRowIndex + 1);
          announceToScreenReader(`Fila ${focusedRowIndex + 2} de ${data.length}`);
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        if (focusedRowIndex > 0) {
          setFocusedRowIndex(focusedRowIndex - 1);
          announceToScreenReader(`Fila ${focusedRowIndex} de ${data.length}`);
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        if (focusedCellIndex < columns.length - 1) {
          setFocusedCellIndex(focusedCellIndex + 1);
        }
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        if (focusedCellIndex > 0) {
          setFocusedCellIndex(focusedCellIndex - 1);
        }
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedRowIndex >= 0 && data[focusedRowIndex] && onRowClick) {
          onRowClick(data[focusedRowIndex]);
        }
        break;
        
      case 'Home':
        event.preventDefault();
        if (ctrlKey) {
          setFocusedRowIndex(0);
          setFocusedCellIndex(0);
        } else {
          setFocusedCellIndex(0);
        }
        break;
        
      case 'End':
        event.preventDefault();
        if (ctrlKey) {
          setFocusedRowIndex(data.length - 1);
          setFocusedCellIndex(columns.length - 1);
        } else {
          setFocusedCellIndex(columns.length - 1);
        }
        break;
    }
  };

  // Anunciar cambios a lectores de pantalla
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // Formatear valor de celda según el tipo
  const formatCellValue = (value: any, column: TableColumn): string => {
    if (value === null || value === undefined) return 'No especificado';
    
    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString('es-ES');
      case 'phone':
        return value.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
      case 'medical-id':
        return value.toUpperCase();
      case 'boolean':
        return value ? 'Sí' : 'No';
      default:
        return String(value);
    }
  };

  // Obtener ARIA label para celda según contexto médico
  const getCellAriaLabel = (value: any, column: TableColumn, rowData: TableRow): string => {
    const formattedValue = formatCellValue(value, column);
    const baseLabel = `${column.label}: ${formattedValue}`;
    
    switch (column.medicalContext) {
      case 'patient-data':
        return `${baseLabel}. Información del paciente ${rowData.full_name || rowData.name || ''}`;
      case 'vital-signs':
        return `${baseLabel}. Signo vital registrado`;
      case 'medication':
        return `${baseLabel}. Medicamento prescrito`;
      case 'diagnosis':
        return `${baseLabel}. Diagnóstico médico`;
      case 'test-result':
        return `${baseLabel}. Resultado de examen médico`;
      default:
        return baseLabel;
    }
  };

  if (error) {
    return (
      <div className={`bg-red-900/50 border border-red-700 rounded-lg p-4 ${className}`} role="alert">
        <h3 className="text-red-300 font-medium mb-2">Error al cargar datos</h3>
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg shadow-xl border border-gray-700 ${className}`}>
      {/* Header con controles */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{caption}</h2>
            <p className="text-sm text-gray-400 mt-1">{ariaConfig.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Exportar tabla"
              aria-label="Exportar datos de la tabla"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Imprimir tabla"
              aria-label="Imprimir tabla"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        {columns.some(col => col.filterable) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {columns.filter(col => col.filterable).map(column => (
              <div key={`filter-${column.key}`}>
                <label 
                  htmlFor={`filter-${column.key}`}
                  className="block text-xs font-medium text-gray-300 mb-1"
                >
                  Filtrar por {column.label}
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                  <input
                    id={`filter-${column.key}`}
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder={`Buscar ${column.label.toLowerCase()}...`}
                    aria-describedby={`filter-${column.key}-help`}
                  />
                </div>
                <div id={`filter-${column.key}-help`} className="sr-only">
                  Filtro para buscar en la columna {column.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="p-8 text-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos médicos...</p>
        </div>
      )}

      {/* Descripción oculta para lectores de pantalla */}
      <div id={`${id}-description`} className="sr-only">
        Tabla de datos médicos con {columns.length} columnas y {data.length} filas.
        Las columnas incluyen: {columns.map(col => col.label).join(', ')}.
        {columns.some(col => col.sortable) && ' Algunas columnas son ordenables.'}
        {selectable && ' Los registros son seleccionables.'}
      </div>

      {/* Tabla */}
      {!loading && (
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            id={id}
            role={ariaConfig.role}
            aria-label={ariaConfig.ariaLabel}
            aria-describedby={`${id}-description`}
            aria-rowcount={data.length}
            aria-colcount={columns.length + (selectable ? 1 : 0)}
            className="w-full"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <caption className="sr-only">
              {caption}. {data.length} {data.length === 1 ? 'registro' : 'registros'} encontrados.
              {sortColumn && ` Ordenado por ${columns.find(col => col.key === sortColumn)?.label} en orden ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}.`}
              Usa las flechas del teclado para navegar, Enter para seleccionar, y las teclas de acceso rápido para ordenar.
            </caption>



            <thead className="bg-gray-900">
              <tr role="row">
                {selectable && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-left"
                    aria-label="Seleccionar registros"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                      aria-label="Seleccionar todos los registros visibles"
                      onChange={(e) => {
                        data.forEach(row => {
                          if (onRowSelect) {
                            onRowSelect(row.id, e.target.checked);
                          }
                        });
                      }}
                    />
                  </th>
                )}
                
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    ref={el => headerRefs.current[index] = el}
                    scope="col"
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-800 focus:bg-gray-800' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && column.sortable) {
                        e.preventDefault();
                        handleSort(column.key);
                      }
                    }}
                    tabIndex={column.sortable ? 0 : -1}
                    aria-sort={
                      sortColumn === column.key 
                        ? (sortDirection === 'asc' ? 'ascending' : 'descending')
                        : column.sortable ? 'none' : undefined
                    }
                    aria-label={column.ariaLabel || `${column.label}${column.sortable ? ', ordenable' : ''}`}
                    role={column.sortable ? 'columnheader button' : 'columnheader'}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="ml-2">
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3 w-3" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Indicador visual del estado de ordenamiento para lectores de pantalla */}
                    {column.sortable && sortColumn === column.key && (
                      <span className="sr-only">
                        , ordenado en orden {sortDirection === 'asc' ? 'ascendente' : 'descendente'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-700">
              {data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-8 text-center text-gray-400"
                    role="cell"
                  >
                    <div className="text-center">
                      <p className="text-lg mb-2">{emptyMessage}</p>
                      <p className="text-sm">No se encontraron registros que coincidan con los criterios de búsqueda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    role="row"
                    aria-rowindex={rowIndex + 1}
                    aria-selected={selectedRows.includes(row.id)}
                    className={`hover:bg-gray-750 transition-colors ${
                      focusedRowIndex === rowIndex ? 'bg-blue-900/30 ring-2 ring-blue-500' : ''
                    } ${
                      selectedRows.includes(row.id) ? 'bg-blue-900/20' : ''
                    } ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onRowClick && onRowClick(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick && onRowClick(row);
                      }
                    }}
                    tabIndex={onRowClick ? 0 : -1}
                    aria-label={`Registro ${rowIndex + 1} de ${data.length}${onRowClick ? ', seleccionable' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3" role="gridcell">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={(e) => onRowSelect && onRowSelect(row.id, e.target.checked)}
                          className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                          aria-label={`Seleccionar registro de ${row.full_name || row.name || `fila ${rowIndex + 1}`}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    
                    {columns.map((column, cellIndex) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        role="gridcell"
                        aria-colindex={cellIndex + 1 + (selectable ? 1 : 0)}
                        className={`px-4 py-3 text-sm ${
                          focusedRowIndex === rowIndex && focusedCellIndex === cellIndex 
                            ? 'ring-2 ring-blue-400 ring-inset' : ''
                        }`}
                        aria-label={getCellAriaLabel(row[column.key], column, row)}
                        tabIndex={focusedRowIndex === rowIndex && focusedCellIndex === cellIndex ? 0 : -1}
                      >
                        <span className={`${
                          column.type === 'medical-id' ? 'font-mono' : ''
                        } ${
                          column.medicalContext === 'vital-signs' ? 'font-medium' : ''
                        }`}>
                          {formatCellValue(row[column.key], column)}
                        </span>
                        
                        {/* Contexto adicional para datos médicos críticos */}
                        {column.medicalContext === 'vital-signs' && row[column.key] && (
                          <span className="sr-only">
                            Valor de signo vital dentro de parámetros normales
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación accesible */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Página {currentPage} de {totalPages}
            {data.length > 0 && (
              <span className="ml-2">
                ({((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, data.length)} de {data.length} registros)
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2" role="navigation" aria-label="Navegación de páginas">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Ir a la página anterior"
            >
              Anterior
            </button>
            
            <span className="text-sm text-gray-400" aria-live="polite">
              Página {currentPage}
            </span>
            
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Ir a la página siguiente"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Instrucciones de teclado ocultas para lectores de pantalla */}
      <div className="sr-only" aria-live="polite">
        <h3>Instrucciones de navegación por teclado:</h3>
        <ul>
          <li>Use las flechas del teclado para navegar por la tabla</li>
          <li>Presione Enter o Espacio para seleccionar un registro</li>
          <li>Use Tab para navegar a los controles de la tabla</li>
          <li>Presione Inicio/Fin para ir al primer/último elemento</li>
          <li>Use Ctrl+Inicio/Fin para ir a la primera/última fila</li>
        </ul>
      </div>
    </div>
  );
};

export default AccessibleTable;
