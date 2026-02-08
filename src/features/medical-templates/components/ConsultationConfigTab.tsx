import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Layout, FileText, Activity, Zap, Mic, Keyboard, History, AlertTriangle, Shield, Printer, Send } from 'lucide-react';
import { useConsultationConfig, ConsultationConfig } from '@/features/medical-templates/hooks/useConsultationConfig';

export default function ConsultationConfigTab() {
  const { config, loading, saving, saveConfig } = useConsultationConfig();
  const [localConfig, setLocalConfig] = useState<ConsultationConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    try {
      await saveConfig(localConfig);
      setSuccessMessage('Configuración guardada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      // Error handled in hook
    }
  };

  const updateSection = <K extends keyof ConsultationConfig>(
    section: K, 
    key: keyof ConsultationConfig[K], 
    value: any
  ) => {
    if (!localConfig) return;
    setLocalConfig({
      ...localConfig,
      [section]: {
        ...localConfig[section],
        [key]: value
      }
    });
  };

  if (loading || !localConfig) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Settings className="h-5 w-5 mr-2 text-cyan-400" />
              Configuración de Nueva Consulta
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Personaliza tu flujo de trabajo, alertas y formato de recetas.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-800 rounded-lg flex items-center text-green-300">
            <CheckCircle className="h-5 w-5 mr-3" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Estilo de Captura */}
          <section className="bg-gray-900/40 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center">
              <Layout className="h-5 w-5 mr-2 text-purple-400" />
              Estilo de Captura
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Modo de Inicio Predeterminado</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => updateSection('general_config', 'start_mode', 'classic')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      localConfig.general_config.start_mode === 'classic'
                        ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium mb-1">Clásico</div>
                    <div className="text-xs opacity-70">Texto libre, sin distracciones</div>
                  </button>
                  <button
                    onClick={() => updateSection('general_config', 'start_mode', 'guided')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      localConfig.general_config.start_mode === 'guided'
                        ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium mb-1">Guiado</div>
                    <div className="text-xs opacity-70">Usa plantillas por defecto</div>
                  </button>
                  <button
                    onClick={() => updateSection('general_config', 'start_mode', 'last_visit')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      localConfig.general_config.start_mode === 'last_visit'
                        ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium mb-1">Última Visita</div>
                    <div className="text-xs opacity-70">Clona la nota anterior</div>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={localConfig.general_config.hide_physical_exam}
                    onChange={(e) => updateSection('general_config', 'hide_physical_exam', e.target.checked)}
                    className="form-checkbox h-5 w-5 text-cyan-500 rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-900"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">Ocultar Exploración Física por defecto</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={localConfig.general_config.unify_hpi}
                    onChange={(e) => updateSection('general_config', 'unify_hpi', e.target.checked)}
                    className="form-checkbox h-5 w-5 text-cyan-500 rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-900"
                  />
                  <span className="text-gray-300 group-hover:text-white transition-colors">Unificar campos de Padecimiento Actual</span>
                </label>
              </div>
            </div>
          </section>

          {/* 2. Herramientas de Redacción */}
          <section className="bg-gray-900/40 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-cyan-400" />
              Herramientas de Redacción
            </h4>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${localConfig.hpi_config.enable_voice ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200 font-medium">Dictado por Voz</span>
                    <input
                      type="checkbox"
                      checked={localConfig.hpi_config.enable_voice}
                      onChange={(e) => updateSection('hpi_config', 'enable_voice', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-cyan-500 rounded border-gray-600 bg-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Habilita el botón de micrófono en campos de texto</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${localConfig.hpi_config.enable_autocomplete ? 'bg-purple-900/30 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                  <Keyboard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200 font-medium">Autocompletado Inteligente</span>
                    <input
                      type="checkbox"
                      checked={localConfig.hpi_config.enable_autocomplete}
                      onChange={(e) => updateSection('hpi_config', 'enable_autocomplete', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-cyan-500 rounded border-gray-600 bg-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Sugiere términos médicos mientras escribes</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${localConfig.hpi_config.show_chronology ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-500'}`}>
                  <History className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200 font-medium">Mostrar Cronología</span>
                    <input
                      type="checkbox"
                      checked={localConfig.hpi_config.show_chronology}
                      onChange={(e) => updateSection('hpi_config', 'show_chronology', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-cyan-500 rounded border-gray-600 bg-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Muestra resumen de últimas 3 visitas</p>
                </div>
              </label>
            </div>
          </section>

          {/* 3. Seguridad y Alertas */}
          <section className="bg-gray-900/40 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-400" />
              Validaciones de Seguridad
            </h4>
            
            <div className="space-y-3">
              {[
                { key: 'alert_missing_prescription', label: 'Alerta falta de Receta', desc: 'Avisa si hay diagnóstico sin tratamiento' },
                { key: 'alert_missing_diagnosis', label: 'Alerta falta de Diagnóstico', desc: 'Impide cerrar sin asignar CIE-10' },
                { key: 'alert_allergies', label: 'Alerta de Alergias', desc: 'Validación cruzada con historial' },
                { key: 'alert_vital_signs', label: 'Alerta Signos Vitales', desc: 'Avisa si falta Peso/Talla' }
              ].map((item) => (
                <label key={item.key} className="flex items-start space-x-3 cursor-pointer group p-2 hover:bg-gray-800/50 rounded-lg">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={(localConfig.alerts_config as any)[item.key]}
                      onChange={(e) => updateSection('alerts_config', item.key as any, e.target.checked)}
                      className="form-checkbox h-5 w-5 text-green-500 rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-900"
                    />
                  </div>
                  <div>
                    <span className="text-gray-200 font-medium block">{item.label}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* 4. Receta y Automatización */}
          <section className="bg-gray-900/40 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-pink-400" />
              Receta y Automatización
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formato de Receta</h5>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Añadir Nombre Comercial</span>
                  <input
                    type="checkbox"
                    checked={localConfig.prescription_config.add_brand_name}
                    onChange={(e) => updateSection('prescription_config', 'add_brand_name', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-700 border-gray-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Lenguaje Natural ("Tomar 1 tableta...")</span>
                  <input
                    type="checkbox"
                    checked={localConfig.prescription_config.natural_language_instructions}
                    onChange={(e) => updateSection('prescription_config', 'natural_language_instructions', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-700 border-gray-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Incluir Próxima Cita</span>
                  <input
                    type="checkbox"
                    checked={localConfig.prescription_config.include_next_appointment}
                    onChange={(e) => updateSection('prescription_config', 'include_next_appointment', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-700 border-gray-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Firma Digital por defecto</span>
                  <input
                    type="checkbox"
                    checked={localConfig.prescription_config.default_digital_signature}
                    onChange={(e) => updateSection('prescription_config', 'default_digital_signature', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-pink-500 rounded bg-gray-700 border-gray-600"
                  />
                </label>
              </div>

              <div className="pt-2 border-t border-gray-700">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Acciones Post-Consulta</h5>
                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <Send className="h-4 w-4 text-blue-400" />
                  <span className="flex-1 text-gray-300">Enviar Receta automáticamente</span>
                  <input
                    type="checkbox"
                    checked={localConfig.automation_config.auto_send_prescription}
                    onChange={(e) => updateSection('automation_config', 'auto_send_prescription', e.target.checked)}
                    className="form-toggle text-blue-500" // Note: Simplified style
                    type="checkbox" 
                    style={{ accentColor: '#3b82f6' }}
                  />
                </label>
                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-800/50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="flex-1 text-gray-300">Generar Resumen para Paciente</span>
                  <input
                    type="checkbox"
                    checked={localConfig.automation_config.generate_summary}
                    onChange={(e) => updateSection('automation_config', 'generate_summary', e.target.checked)}
                    className="form-toggle text-blue-500"
                    type="checkbox"
                    style={{ accentColor: '#3b82f6' }}
                  />
                </label>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
