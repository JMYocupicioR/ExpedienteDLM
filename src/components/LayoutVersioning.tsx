import React, { useState } from 'react';
import { 
  History, GitBranch, RotateCcw, Eye, Calendar, 
  User, FileText, Compare, Download, Upload,
  Clock, ChevronRight, CheckCircle, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLayoutVersioning } from '@/hooks/useUnifiedPrescriptionSystem';

interface LayoutVersioningProps {
  layoutId: string;
  layoutName: string;
  onVersionRestore?: (versionId: string) => void;
  className?: string;
}

export default function LayoutVersioning({
  layoutId,
  layoutName,
  onVersionRestore,
  className = ''
}: LayoutVersioningProps) {
  const { versions, loading, createVersion, restoreVersion } = useLayoutVersioning(layoutId);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [versionSummary, setVersionSummary] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const handleCreateVersion = async (changes: {
    template_elements: any[];
    canvas_settings: any;
    changes_summary: string;
  }) => {
    try {
      await createVersion(changes);
      setShowCreateVersion(false);
      setVersionSummary('');
    } catch (error) {
      console.error('Error creating version:', error);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      await restoreVersion(versionId);
      onVersionRestore?.(versionId);
    } catch (error) {
      console.error('Error restoring version:', error);
    }
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId]; // Keep only last 2 selections
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando versiones...</span>
      </div>
    );
  }

  return (
    <div className={`layout-versioning ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <GitBranch className="h-5 w-5 mr-2 text-blue-500" />
            Versiones de "{layoutName}"
          </h3>
          <p className="text-sm text-gray-600">
            {versions.length} versión{versions.length !== 1 ? 'es' : ''} guardada{versions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedVersions.length === 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center"
            >
              <Compare className="h-4 w-4 mr-1" />
              Comparar
            </button>
          )}
          
          <button
            onClick={() => setShowCreateVersion(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
          >
            <History className="h-4 w-4 mr-2" />
            Nueva Versión
          </button>
        </div>
      </div>

      {/* Versions Timeline */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">Sin versiones guardadas</h4>
            <p className="text-gray-500 mb-4">
              Crea una versión para guardar el estado actual del layout
            </p>
            <button
              onClick={() => setShowCreateVersion(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primera Versión
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {versions.map((version, index) => (
              <VersionCard
                key={version.id}
                version={version}
                isLatest={index === 0}
                isSelected={selectedVersions.includes(version.id)}
                onSelect={() => toggleVersionSelection(version.id)}
                onRestore={() => handleRestoreVersion(version.id)}
                onPreview={() => {/* TODO: Implement preview */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Version Modal */}
      {showCreateVersion && (
        <CreateVersionModal
          layoutName={layoutName}
          onSave={(summary) => {
            // TODO: Get current layout state and save as version
            handleCreateVersion({
              template_elements: [], // Current elements
              canvas_settings: {}, // Current settings
              changes_summary: summary
            });
          }}
          onCancel={() => {
            setShowCreateVersion(false);
            setVersionSummary('');
          }}
        />
      )}

      {/* Comparison Modal */}
      {showComparison && selectedVersions.length === 2 && (
        <VersionComparisonModal
          version1Id={selectedVersions[0]}
          version2Id={selectedVersions[1]}
          versions={versions}
          onClose={() => {
            setShowComparison(false);
            setSelectedVersions([]);
          }}
        />
      )}
    </div>
  );
}

interface VersionCardProps {
  version: any;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onPreview: () => void;
}

function VersionCard({ version, isLatest, isSelected, onSelect, onRestore, onPreview }: VersionCardProps) {
  return (
    <div className="relative flex items-start mb-6">
      {/* Timeline dot */}
      <div className="relative z-10 flex items-center justify-center w-12 h-12">
        <div className={`w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
          isLatest ? 'bg-green-500' : 'bg-blue-500'
        }`}>
          <GitBranch className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Content card */}
      <div className={`flex-1 ml-4 bg-white border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-800">
                Versión {version.version_number}
              </h4>
              {isLatest && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Actual
                </span>
              )}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="ml-auto"
              />
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {version.changes_summary || 'Sin descripción de cambios'}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(version.created_at), 'dd MMM yyyy', { locale: es })}
              </span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(version.created_at), 'HH:mm')}
              </span>
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                Usuario
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center"
            >
              <Eye className="h-3 w-3 mr-1" />
              Vista previa
            </button>
            
            {!isLatest && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore();
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restaurar
              </button>
            )}
          </div>
          
          <span className="text-xs text-gray-400">
            {(version.template_elements as any[])?.length || 0} elementos
          </span>
        </div>
      </div>
    </div>
  );
}

interface CreateVersionModalProps {
  layoutName: string;
  onSave: (summary: string) => void;
  onCancel: () => void;
}

function CreateVersionModal({ layoutName, onSave, onCancel }: CreateVersionModalProps) {
  const [summary, setSummary] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Crear Nueva Versión</h3>
        <p className="text-sm text-gray-600 mb-4">
          Se guardará el estado actual de "{layoutName}" como una nueva versión.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resumen de cambios
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe los cambios realizados en esta versión..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(summary)}
            disabled={!summary.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar Versión
          </button>
        </div>
      </div>
    </div>
  );
}

interface VersionComparisonModalProps {
  version1Id: string;
  version2Id: string;
  versions: any[];
  onClose: () => void;
}

function VersionComparisonModal({ version1Id, version2Id, versions, onClose }: VersionComparisonModalProps) {
  const version1 = versions.find(v => v.id === version1Id);
  const version2 = versions.find(v => v.id === version2Id);

  if (!version1 || !version2) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center">
              <Compare className="h-5 w-5 mr-2 text-purple-500" />
              Comparar Versiones
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Version 1 */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Versión {version1.version_number}
                </h4>
                <p className="text-sm text-blue-600 mb-2">
                  {version1.changes_summary}
                </p>
                <div className="text-xs text-blue-500">
                  {format(new Date(version1.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                </div>
              </div>
              
              {/* Visual preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-hidden">
                <div className="transform scale-50 origin-top-left">
                  <div 
                    className="bg-white shadow-sm border border-gray-300"
                    style={{
                      width: (version1.canvas_settings?.canvasSize?.width || 794) / 2,
                      height: (version1.canvas_settings?.canvasSize?.height || 1123) / 2,
                      position: 'relative'
                    }}
                  >
                    {/* Simplified element preview */}
                    {(version1.template_elements as any[])?.slice(0, 5).map((element: any, idx: number) => (
                      <div
                        key={idx}
                        className="absolute bg-blue-200 border border-blue-300 rounded"
                        style={{
                          left: (element.position?.x || 0) / 2,
                          top: (element.position?.y || 0) / 2,
                          width: Math.max((element.size?.width || 50) / 2, 10),
                          height: Math.max((element.size?.height || 20) / 2, 8),
                          fontSize: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {element.type}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Version 2 */}
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">
                  Versión {version2.version_number}
                </h4>
                <p className="text-sm text-green-600 mb-2">
                  {version2.changes_summary}
                </p>
                <div className="text-xs text-green-500">
                  {format(new Date(version2.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                </div>
              </div>
              
              {/* Visual preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-hidden">
                <div className="transform scale-50 origin-top-left">
                  <div 
                    className="bg-white shadow-sm border border-gray-300"
                    style={{
                      width: (version2.canvas_settings?.canvasSize?.width || 794) / 2,
                      height: (version2.canvas_settings?.canvasSize?.height || 1123) / 2,
                      position: 'relative'
                    }}
                  >
                    {/* Simplified element preview */}
                    {(version2.template_elements as any[])?.slice(0, 5).map((element: any, idx: number) => (
                      <div
                        key={idx}
                        className="absolute bg-green-200 border border-green-300 rounded"
                        style={{
                          left: (element.position?.x || 0) / 2,
                          top: (element.position?.y || 0) / 2,
                          width: Math.max((element.size?.width || 50) / 2, 10),
                          height: Math.max((element.size?.height || 20) / 2, 8),
                          fontSize: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {element.type}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Differences Summary */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
              Resumen de Diferencias
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Elementos totales:</span>
                <span className="font-medium">
                  {(version1.template_elements as any[])?.length || 0} → {(version2.template_elements as any[])?.length || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Fecha de creación:</span>
                <span className="font-medium">
                  {format(new Date(version1.created_at), 'dd/MM/yyyy')} → {format(new Date(version2.created_at), 'dd/MM/yyyy')}
                </span>
              </div>
              
              {/* Detailed differences */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Elementos añadidos:</span>
                  <span className="font-medium text-green-600">
                    +{Math.max(0, ((version2.template_elements as any[])?.length || 0) - ((version1.template_elements as any[])?.length || 0))}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Elementos eliminados:</span>
                  <span className="font-medium text-red-600">
                    -{Math.max(0, ((version1.template_elements as any[])?.length || 0) - ((version2.template_elements as any[])?.length || 0))}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Configuración del canvas:</span>
                  <span className="font-medium">
                    {JSON.stringify(version1.canvas_settings) !== JSON.stringify(version2.canvas_settings) ? 'Modificada' : 'Sin cambios'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage version selection and comparison
export function useVersionComparison() {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const selectVersion = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

  const compareVersions = (version1: any, version2: any) => {
    const elements1 = version1.template_elements as any[] || [];
    const elements2 = version2.template_elements as any[] || [];
    
    const elementsAdded = Math.max(0, elements2.length - elements1.length);
    const elementsRemoved = Math.max(0, elements1.length - elements2.length);
    
    // Simple modification detection (by comparing element IDs and basic properties)
    let elementsModified = 0;
    elements1.forEach(el1 => {
      const el2 = elements2.find(e => e.id === el1.id);
      if (el2) {
        const props1 = `${el1.position?.x},${el1.position?.y},${el1.size?.width},${el1.size?.height}`;
        const props2 = `${el2.position?.x},${el2.position?.y},${el2.size?.width},${el2.size?.height}`;
        if (props1 !== props2 || el1.content !== el2.content) {
          elementsModified++;
        }
      }
    });

    const settingsChanged = JSON.stringify(version1.canvas_settings) !== JSON.stringify(version2.canvas_settings);
    
    const diff = {
      elementsAdded,
      elementsRemoved,
      elementsModified,
      settingsChanged,
      totalChanges: elementsAdded + elementsRemoved + elementsModified + (settingsChanged ? 1 : 0)
    };

    setComparisonData(diff);
    return diff;
  };

  const clearSelection = () => {
    setSelectedVersions([]);
    setComparisonData(null);
  };

  return {
    selectedVersions,
    comparisonData,
    selectVersion,
    compareVersions,
    clearSelection,
    canCompare: selectedVersions.length === 2
  };
}
