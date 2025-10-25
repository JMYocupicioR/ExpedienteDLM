import React, { useState } from 'react';
import { FileText, Sparkles, ChevronRight, AlertTriangle, Stethoscope } from 'lucide-react';
import PhysicalExamTemplates from '@/components/PhysicalExamTemplates';

interface PhysicalExamTemplate {
  id: string;
  name: string;
  doctor_id: string;
  definition?: any;
  created_at: string;
  is_active: boolean;
}

interface ExploracionTabsPanelProps {
  // Datos del texto libre
  freeText: string;
  onFreeTextChange: (text: string) => void;

  // Plantilla seleccionada
  selectedTemplate: PhysicalExamTemplate | null;
  onTemplateSelect: (template: PhysicalExamTemplate) => void;
  onTemplateDeselect: () => void;

  // Datos del examen físico completado
  physicalExamData: any | null;
  onOpenPhysicalExam: () => void;

  // Información del contexto
  doctorId: string;

  // Configuración
  maxLength?: number;
  className?: string;
}

type TabMode = 'template' | 'free';

export default function ExploracionTabsPanel({
  freeText,
  onFreeTextChange,
  selectedTemplate,
  onTemplateSelect,
  onTemplateDeselect,
  physicalExamData,
  onOpenPhysicalExam,
  doctorId,
  maxLength = 5000,
  className = ''
}: ExploracionTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('template');
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabMode | null>(null);

  // Determinar si hay datos en cada pestaña
  const hasTemplateData = selectedTemplate !== null || physicalExamData !== null;
  const hasFreeTextData = freeText && freeText.trim().length > 0;

  // Advertir al cambiar de pestaña si hay datos
  const handleTabChange = (newTab: TabMode) => {
    if (activeTab === newTab) return;

    // Si está en plantillas y hay datos, advertir al cambiar
    if (activeTab === 'template' && hasTemplateData && !hasFreeTextData) {
      setPendingTab(newTab);
      setShowTabSwitchWarning(true);
      return;
    }

    // Si está en texto libre y hay datos, advertir al cambiar
    if (activeTab === 'free' && hasFreeTextData && !hasTemplateData) {
      setPendingTab(newTab);
      setShowTabSwitchWarning(true);
      return;
    }

    setActiveTab(newTab);
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      // Si cambia de plantilla a libre, limpiar plantilla
      if (activeTab === 'template' && pendingTab === 'free' && hasTemplateData) {
        onTemplateDeselect();
      }

      setActiveTab(pendingTab);
      setShowTabSwitchWarning(false);
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setShowTabSwitchWarning(false);
    setPendingTab(null);
  };

  // Manejar selección de múltiples plantillas
  const handleMultipleTemplateSelect = (templates: PhysicalExamTemplate[]) => {
    if (templates.length === 1) {
      onTemplateSelect(templates[0]);
    } else if (templates.length > 1) {
      // Combinar plantillas
      const combinedTemplate = combinePhysicalExamTemplates(templates);
      onTemplateSelect(combinedTemplate);
    }
  };

  // Combinar múltiples plantillas
  const combinePhysicalExamTemplates = (templates: PhysicalExamTemplate[]): PhysicalExamTemplate => {
    if (templates.length === 1) return templates[0];

    const combinedSections: any[] = [];
    let sectionOrder = 0;

    templates.forEach((template, templateIndex) => {
      if (template.definition?.sections) {
        template.definition.sections.forEach((section: any) => {
          combinedSections.push({
            ...section,
            id: `${section.id}_${templateIndex}`,
            title: `${template.name} - ${section.title}`,
            order: sectionOrder++
          });
        });
      }
    });

    return {
      id: `combined_${Date.now()}`,
      name: `Combinada: ${templates.map(t => t.name).join(' + ')}`,
      doctor_id: doctorId,
      definition: {
        sections: combinedSections,
        version: '1.0',
        metadata: {
          lastModified: new Date().toISOString(),
          author: doctorId,
          description: `Plantilla combinada de: ${templates.map(t => t.name).join(', ')}`
        }
      },
      created_at: new Date().toISOString(),
      is_active: true
    };
  };

  // Renderizar vista previa de plantilla seleccionada
  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;

    const sections = selectedTemplate.definition?.sections || [];

    return (
      <div className="space-y-4">
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-green-300">Plantilla Seleccionada:</h4>
              <p className="text-green-200">{selectedTemplate.name}</p>
              {physicalExamData && (
                <p className="text-sm text-green-400 mt-1">
                  ✓ Examen físico completado - {physicalExamData.examDate} {physicalExamData.examTime}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onOpenPhysicalExam}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                {physicalExamData ? 'Editar Examen' : 'Realizar Examen'}
              </button>
              <button
                type="button"
                onClick={onTemplateDeselect}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors text-sm"
              >
                Cambiar Plantilla
              </button>
            </div>
          </div>
        </div>

        {/* Vista previa de campos de la plantilla */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h4 className="font-medium text-blue-300 mb-3">Vista Previa de la Exploración:</h4>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sections.length > 0 ? (
              sections.map((section: any) => (
                <div key={section.id} className="border border-gray-600 rounded-lg p-3 bg-gray-800/50">
                  <h5 className="font-medium text-white mb-2">{section.title}</h5>
                  {section.description && (
                    <p className="text-sm text-gray-400 mb-3">{section.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.questions?.map((question: any) => (
                      <div key={question.id} className="text-sm">
                        <span className="text-gray-300">• {question.text || question.label}</span>
                        {question.required && <span className="text-red-400"> *</span>}
                        <span className="text-gray-500 ml-2">({question.type})</span>
                        {question.options && question.options.length > 0 && (
                          <div className="ml-4 text-xs text-gray-400 mt-1">
                            Opciones: {question.options.slice(0, 3).join(', ')}
                            {question.options.length > 3 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No hay campos configurados en esta plantilla
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-400">
            💡 Haz clic en "Realizar Examen" para completar todos estos campos de forma interactiva
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Tabs Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            onClick={() => handleTabChange('template')}
            className={`
              flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'template'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }
            `}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Plantillas
            {hasTemplateData && (
              <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                ✓
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('free')}
            className={`
              flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'free'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }
            `}
          >
            <FileText className="h-4 w-4 mr-2" />
            Estilo Libre
            {hasFreeTextData && !hasTemplateData && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                {freeText.length}
              </span>
            )}
          </button>
        </div>

        {/* Info sobre el modo activo */}
        <div className="text-xs text-gray-400">
          {activeTab === 'template' ? (
            <span>✨ Usa plantillas estructuradas de exploración física</span>
          ) : (
            <span>✍️ Escribe observaciones libres de la exploración</span>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Pestaña de Plantillas */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            {selectedTemplate ? (
              renderTemplatePreview()
            ) : (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 bg-gray-750">
                <div className="text-center mb-6">
                  <Stethoscope className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Exploración Física con Plantillas
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Selecciona una o más plantillas para estructurar tu exploración física
                  </p>
                </div>

                <PhysicalExamTemplates
                  onSelectTemplate={onTemplateSelect}
                  onSelectMultiple={handleMultipleTemplateSelect}
                  doctorId={doctorId}
                  allowMultipleSelection={true}
                />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-cyan-400 font-medium mb-1">🎯 Específico</div>
                    <div className="text-gray-400 text-xs">
                      Plantillas por sistema o región anatómica
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-cyan-400 font-medium mb-1">🔧 Personalizable</div>
                    <div className="text-gray-400 text-xs">
                      Combina múltiples plantillas según necesites
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-cyan-400 font-medium mb-1">📊 Completo</div>
                    <div className="text-gray-400 text-xs">
                      Captura todos los hallazgos importantes
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pestaña de Estilo Libre */}
        {activeTab === 'free' && (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-sm">
              <p className="text-blue-300">
                <strong>Modo Texto Libre:</strong> Escribe tus observaciones de la exploración física
                de forma narrativa. Ideal para hallazgos específicos o exploraciones que no siguen
                un formato estándar.
              </p>
            </div>

            <textarea
              value={freeText}
              onChange={(e) => onFreeTextChange(e.target.value)}
              rows={14}
              maxLength={maxLength}
              className="w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500 focus:bg-gray-600 font-mono text-sm"
              placeholder="Describe tu exploración física de forma libre...

Ejemplo:

EXPLORACIÓN FÍSICA GENERAL:
- Paciente consciente, orientado en tiempo, espacio y persona
- Adecuado estado de hidratación y nutrición
- Signos vitales dentro de parámetros normales

CABEZA Y CUELLO:
- Normocéfalo, pupilas isocóricas normorreflécticas
- Mucosas orales hidratadas
- No adenopatías cervicales palpables

TÓRAX:
- Movimientos respiratorios simétricos
- Campos pulmonares con murmullo vesicular conservado
- Ruidos cardíacos rítmicos, sin soplos

ABDOMEN:
- Blando, depresible, no doloroso a la palpación
- Ruidos peristálticos presentes
- No visceromegalias

EXTREMIDADES:
- Pulsos periféricos palpables y simétricos
- Sin edema, cianosis o hipocratismo digital
- Movilidad conservada"
            />

            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>💡 Tip: Usa encabezados en MAYÚSCULAS para organizar las secciones</span>
              <span>{freeText.length}/{maxLength} caracteres</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal de advertencia al cambiar pestañas */}
      {showTabSwitchWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
            <div className="flex items-start space-x-3 mb-4">
              <div className="bg-yellow-600 rounded-lg p-2">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  ¿Cambiar de modo?
                </h3>
                <p className="text-gray-300 text-sm">
                  {activeTab === 'template'
                    ? 'Has seleccionado una plantilla de exploración física. Al cambiar a estilo libre, se perderá la plantilla seleccionada y tendrás que documentar manualmente.'
                    : 'Has escrito texto libre. Al cambiar a plantillas, este texto no se transferirá a los campos estructurados.'
                  }
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelTabSwitch}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmTabSwitch}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
