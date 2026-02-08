import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Mic, FileText, Sparkles, ChevronRight, AlertTriangle, Copy, Trash2, Check } from 'lucide-react';
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
  // Configuración
  maxLength?: number;
  className?: string;
  unifyView?: boolean;
  defaultTab?: 'template' | 'free';
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
  className = '',
  unifyView = false,
  defaultTab = 'template'
}: InterrogatorioTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabMode>(unifyView ? 'free' : defaultTab);
  const [showTemplateAssistant, setShowTemplateAssistant] = useState(false);
  const [templateRunnerModal, setTemplateRunnerModal] = useState<{
    isOpen: boolean;
    template: MedicalTemplate | null;
  }>({ isOpen: false, template: null });
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabMode | null>(null);
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Determinar si hay datos en cada pestaña
  const hasTemplateData = structuredData?.responses && Object.keys(structuredData.responses).length > 0;
  const hasFreeTextData = freeText && freeText.trim().length > 0;

  // Simular auto-save cuando cambia el texto
  useEffect(() => {
    if (!hasFreeTextData) return;
    
    const timer = setTimeout(() => {
      setIsSaving(true);
      // Simular guardado
      setTimeout(() => {
        setLastSaved(new Date());
        setIsSaving(false);
      }, 500);
    }, 1000); // Guardar después de 1 segundo de inactividad

    return () => clearTimeout(timer);
  }, [freeText, hasFreeTextData]);

  // Copiar al portapapeles
  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(freeText);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  }, [freeText]);

  // Limpiar texto
  const handleClearText = useCallback(() => {
    if (confirm('¿Estás seguro de que deseas borrar todo el texto?')) {
      onFreeTextChange('');
    }
  }, [onFreeTextChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K - Abrir asistente de plantillas
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowTemplateAssistant(true);
      }
      
      // Ctrl/Cmd + Shift + C - Copiar texto
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c' && hasFreeTextData) {
        e.preventDefault();
        handleCopyText();
      }
      
      // Ctrl/Cmd + Shift + D - Borrar todo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd' && hasFreeTextData) {
        e.preventDefault();
        handleClearText();
      }

      // Ctrl/Cmd + Shift + V - Abrir transcripción por voz
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'v' && onOpenTranscription) {
        e.preventDefault();
        onOpenTranscription();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasFreeTextData, onOpenTranscription, handleCopyText, handleClearText]);

  // Advertir al cambiar de pestaña si hay datos
  const handleTabChange = (newTab: TabMode) => {
    if (activeTab === newTab) return;
    
    // Si la vista está unificada, no permitir cambiar
    if (unifyView) return;

    // Si está en plantillas y hay datos, advertir al cambiar

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
            type="button"
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
      {/* Tabs Header - Solo mostrar si no está unificada la vista */}
      {!unifyView && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex rounded-lg bg-gray-700 p-1">
            <button
              type="button"
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
              type="button"
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
          <div className="text-xs text-gray-400 space-y-0.5">
            {activeTab === 'template' ? (
              <div>✨ Usa plantillas estructuradas para captura rápida</div>
            ) : (
              <div>✍️ Escribe libremente o usa transcripción por voz</div>
            )}
            <div className="text-gray-500 text-[10px] space-x-2">
              <span title="Abrir asistente de plantillas">⌨️ Ctrl+K</span>
              {activeTab === 'free' && hasFreeTextData && (
                <>
                  <span>•</span>
                  <span title="Copiar texto">Ctrl+Shift+C</span>
                  <span>•</span>
                  <span title="Borrar todo">Ctrl+Shift+D</span>
                </>
              )}
              {activeTab === 'free' && onOpenTranscription && (
                <>
                  <span>•</span>
                  <span title="Transcripción por voz">Ctrl+Shift+V</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Pestaña de Plantillas */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            {renderTemplatePreview()}

            {!hasTemplateData && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/30 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-cyan-600/20 rounded-lg p-3 flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white mb-1">
                        Interrogatorio Guiado con Plantillas
                      </h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Usa el asistente para encontrar plantillas específicas según el padecimiento
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTemplateAssistant(true)}
                        className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-600/30"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Abrir Asistente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-3 text-xs">
                    <div className="text-center">
                      <div className="text-cyan-400 font-semibold mb-0.5">🎯</div>
                      <div className="text-gray-400">IA personalizada</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-semibold mb-0.5">⚡</div>
                      <div className="text-gray-400">Captura rápida</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cyan-400 font-semibold mb-0.5">📊</div>
                      <div className="text-gray-400">Datos estructurados</div>
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
          <div className="space-y-3">
            {/* Quick Actions Bar & Auto-save Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Auto-save indicator */}
                {isSaving && (
                  <span className="text-xs text-gray-400 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                    Guardando...
                  </span>
                )}
                {!isSaving && lastSaved && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <Check className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                    Guardado {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Copy button */}
                {hasFreeTextData && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                    title="Copiar al portapapeles"
                  >
                    {showCopySuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copiar
                      </>
                    )}
                  </button>
                )}

                {/* Clear button */}
                {hasFreeTextData && (
                  <button
                    type="button"
                    onClick={handleClearText}
                    className="flex items-center px-2.5 py-1.5 text-xs font-medium text-red-300 bg-red-900/30 rounded-md hover:bg-red-900/50 transition-colors"
                    title="Borrar todo el texto"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Limpiar
                  </button>
                )}

                {/* Voice transcription button */}
                {onOpenTranscription && (
                  <button
                    type="button"
                    onClick={onOpenTranscription}
                    className="flex items-center px-2.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-900/40 rounded-md hover:bg-cyan-800/60 transition-colors"
                    title="Usar Asistente de Transcripción con IA"
                  >
                    <Mic className="h-3.5 w-3.5 mr-1.5" />
                    Voz
                  </button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={freeText}
                onChange={(e) => onFreeTextChange(e.target.value)}
                rows={14}
                maxLength={maxLength}
                className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 focus:bg-gray-600 font-mono text-sm p-4 resize-none"
                placeholder="Escribe el interrogatorio de forma libre o usa la transcripción por voz...

💡 Tips de formato:
• Padecimiento actual: Descripción del síntoma principal
• Antecedentes: Condiciones médicas previas
• Síntomas: Manifestaciones clínicas actuales  
• Evolución: Progresión temporal del cuadro clínico"
              />
            </div>

            {/* Bottom info bar */}
            <div className="flex justify-between items-center text-xs">
              <div className="text-gray-400 space-x-4">
                <span>💬 {freeText.split(/\s+/).filter(w => w).length} palabras</span>
                <span>• {Math.ceil(freeText.split(/\s+/).filter(w => w).length / 200)} min lectura</span>
              </div>
              <span className={`font-medium ${freeText.length > maxLength * 0.9 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {freeText.length}/{maxLength}
              </span>
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
                type="button"
                onClick={cancelTabSwitch}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
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
