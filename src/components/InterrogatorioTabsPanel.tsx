import React, { useState, useEffect } from 'react';
import { Lightbulb, Mic, FileText, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';
import { MedicalTemplate } from '@/lib/database.types';
import TemplateAssistant from '@/components/TemplateAssistant';
import TemplateRunnerModal, { TemplateResponses } from '@/components/TemplateRunnerModal';

interface InterrogatorioTabsPanelProps {
  // Datos del texto libre
  freeText: string;
  onFreeTextChange: (text: string) => void;

  // Datos estructurados de plantilla
  structuredData: {
    template_id?: string;
    template_name?: string;
    responses?: TemplateResponses;
  } | null;
  onStructuredDataChange: (data: any) => void;

  // Información del contexto
  doctorId: string;
  clinicId?: string;
  currentCondition?: string;
  diagnosis?: string;

  // Callbacks
  onOpenTranscription?: () => void;

  // Configuración
  maxLength?: number;
  className?: string;
}

type TabMode = 'template' | 'free';

export default function InterrogatorioTabsPanel({
  freeText,
  onFreeTextChange,
  structuredData,
  onStructuredDataChange,
  doctorId,
  clinicId,
  currentCondition,
  diagnosis,
  onOpenTranscription,
  maxLength = 5000,
  className = ''
}: InterrogatorioTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('template');
  const [showTemplateAssistant, setShowTemplateAssistant] = useState(false);
  const [templateRunnerModal, setTemplateRunnerModal] = useState<{
    isOpen: boolean;
    template: MedicalTemplate | null;
  }>({ isOpen: false, template: null });
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabMode | null>(null);

  // Determinar si hay datos en cada pestaña
  const hasTemplateData = structuredData?.responses && Object.keys(structuredData.responses).length > 0;
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
      setActiveTab(pendingTab);
      setShowTabSwitchWarning(false);
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setShowTabSwitchWarning(false);
    setPendingTab(null);
  };

  // Manejar selección de plantilla desde el asistente
  const handleTemplateSelect = (template: MedicalTemplate, templateType: 'interrogatorio' | 'exploracion' | 'prescripcion') => {
    if (templateType === 'interrogatorio') {
      setTemplateRunnerModal({ isOpen: true, template });
      setShowTemplateAssistant(false);
    }
  };

  // Completar interrogatorio guiado
  const handleInterrogatorioComplete = (responses: TemplateResponses) => {
    const template = templateRunnerModal.template;
    if (!template) return;

    // Guardar datos estructurados
    onStructuredDataChange({
      template_id: template.id,
      template_name: template.name,
      responses: responses,
      capture_method: 'template',
      completed_at: new Date().toISOString()
    });

    // También generar texto formateado para compatibilidad
    const formattedText = formatTemplateResponses(responses, template);
    onFreeTextChange(formattedText);

    setTemplateRunnerModal({ isOpen: false, template: null });
  };

  // Formatear respuestas de plantilla a texto
  const formatTemplateResponses = (responses: TemplateResponses, template: MedicalTemplate): string => {
    const sections = template.content.sections || [];
    let formattedText = `=== ${template.name} ===\n\n`;

    sections.forEach(section => {
      const sectionResponses = responses[section.id];
      if (!sectionResponses || Object.keys(sectionResponses).length === 0) return;

      formattedText += `${section.title}:\n`;

      section.fields?.forEach(field => {
        const response = sectionResponses[field.id];
        if (!response && response !== 0 && response !== false) return;

        const responseText = Array.isArray(response) ? response.join(', ') : String(response);
        formattedText += `• ${field.label}: ${responseText}\n`;
      });

      formattedText += '\n';
    });

    return formattedText.trim();
  };

  // Renderizar resumen de plantilla completada
  const renderTemplatePreview = () => {
    if (!structuredData?.responses || !structuredData?.template_name) {
      return null;
    }

    const responseCount = Object.values(structuredData.responses).reduce(
      (count, section) => count + Object.keys(section).length,
      0
    );

    return (
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="bg-green-600 rounded-lg p-2">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-green-300 mb-1">
                Plantilla Completada: {structuredData.template_name}
              </h4>
              <p className="text-sm text-green-200">
                {responseCount} campos completados
              </p>
              {structuredData.responses && (
                <div className="mt-2 text-xs text-green-300/70">
                  Última actualización: {new Date().toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              // Reabrir plantilla para editar
              setShowTemplateAssistant(true);
            }}
            className="text-green-300 hover:text-green-200 text-sm underline"
          >
            Editar
          </button>
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
            <span>✨ Usa plantillas estructuradas para captura rápida</span>
          ) : (
            <span>✍️ Escribe libremente o usa transcripción por voz</span>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Pestaña de Plantillas */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            {renderTemplatePreview()}

            {!hasTemplateData && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 bg-gray-800/50">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Interrogatorio con Plantillas
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Usa nuestro asistente inteligente para encontrar la plantilla perfecta
                    basada en el padecimiento y diagnóstico del paciente
                  </p>

                  <button
                    onClick={() => setShowTemplateAssistant(true)}
                    className="inline-flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Lightbulb className="h-5 w-5 mr-2" />
                    Abrir Asistente de Plantillas
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </button>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-cyan-400 font-medium mb-1">🎯 Inteligente</div>
                      <div className="text-gray-400 text-xs">
                        Sugerencias basadas en IA según el caso
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-cyan-400 font-medium mb-1">⚡ Rápido</div>
                      <div className="text-gray-400 text-xs">
                        Completa el interrogatorio en minutos
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-cyan-400 font-medium mb-1">📊 Estructurado</div>
                      <div className="text-gray-400 text-xs">
                        Datos organizados para análisis
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview del texto generado si existe */}
            {hasTemplateData && freeText && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Vista Previa del Interrogatorio
                </h4>
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {freeText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pestaña de Estilo Libre */}
        {activeTab === 'free' && (
          <div className="space-y-4">
            <div className="flex justify-end space-x-2">
              {onOpenTranscription && (
                <button
                  type="button"
                  onClick={onOpenTranscription}
                  className="flex items-center px-3 py-2 text-sm font-medium text-cyan-300 bg-cyan-900/50 rounded-md hover:bg-cyan-800/70 transition-colors"
                  title="Usar Asistente de Transcripción con IA"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Transcripción por Voz
                </button>
              )}
            </div>

            <textarea
              value={freeText}
              onChange={(e) => onFreeTextChange(e.target.value)}
              rows={12}
              maxLength={maxLength}
              className="w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500 focus:bg-gray-600 font-mono text-sm"
              placeholder="Describe el interrogatorio de forma libre. Puedes escribir o usar la transcripción por voz para dictar...

Ejemplo:
- Padecimiento actual: ...
- Antecedentes: ...
- Síntomas: ...
- Evolución: ..."
            />

            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>💡 Tip: Usa el botón de transcripción para dictar tu interrogatorio</span>
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
                    ? 'Has completado un interrogatorio con plantilla. Al cambiar a estilo libre, se mantendrá una versión de texto, pero perderás la capacidad de editar los campos estructurados.'
                    : 'Has escrito texto libre. Al cambiar a plantillas, este texto se conservará pero no estará estructurado en campos.'
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

      {/* Template Assistant Modal */}
      <TemplateAssistant
        currentCondition={currentCondition || freeText}
        diagnosis={diagnosis || ''}
        doctorId={doctorId}
        clinicId={clinicId}
        onSelectTemplate={handleTemplateSelect}
        isOpen={showTemplateAssistant}
        onClose={() => setShowTemplateAssistant(false)}
      />

      {/* Template Runner Modal */}
      {templateRunnerModal.isOpen && templateRunnerModal.template && (
        <TemplateRunnerModal
          template={templateRunnerModal.template}
          isOpen={templateRunnerModal.isOpen}
          onClose={() => setTemplateRunnerModal({ isOpen: false, template: null })}
          onComplete={handleInterrogatorioComplete}
          initialResponses={structuredData?.responses}
        />
      )}
    </div>
  );
}
