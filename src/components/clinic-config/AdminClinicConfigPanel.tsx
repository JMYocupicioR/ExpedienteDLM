import React, { useState, useEffect } from 'react';
import { useClinicConfiguration } from '@/hooks/useClinicConfiguration';
import { useClinic } from '@/context/ClinicContext';
import { Save, AlertCircle, CheckCircle, Settings, Clock, Bell, Shield, DollarSign, Palette, Building } from 'lucide-react';
import type { NotificationSettings } from '@/lib/services/clinic-config-service';

/**
 * Panel de Configuración de Clínica para Administradores
 * 
 * Permite configurar:
 * - Horarios de atención
 * - Duración de consultas
 * - Notificaciones
 * - Privacidad y seguridad
 * - Facturación
 * - Apariencia
 */
const AdminClinicConfigPanel: React.FC = () => {
  const { activeClinic } = useClinic();
  const {
    clinicConfig,
    updateClinicConfig,
    isAdmin,
    loading,
    error,
  } = useClinicConfiguration();

  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'notifications' | 'security' | 'billing' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estado local para formularios
  const [formData, setFormData] = useState({
    default_consultation_duration: 30,
    enable_teleconsultation: false,
    enable_emergency_mode: false,
    max_patients_per_day: 20,
    buffer_time_minutes: 5,
    require_diagnosis: true,
    require_physical_exam: false,
    enable_electronic_prescription: false,
    notification_settings: {} as NotificationSettings,
    data_retention_days: 3650,
    enable_audit_log: true,
    require_patient_consent: true,
    enable_billing: false,
    tax_rate: 16.00,
    theme_color: '#3B82F6',
  });

  // Sincronizar formData con clinicConfig cuando cambie
  useEffect(() => {
    if (clinicConfig) {
      setFormData({
        default_consultation_duration: clinicConfig.default_consultation_duration || 30,
        enable_teleconsultation: clinicConfig.enable_teleconsultation || false,
        enable_emergency_mode: clinicConfig.enable_emergency_mode || false,
        max_patients_per_day: clinicConfig.max_patients_per_day || 20,
        buffer_time_minutes: clinicConfig.buffer_time_minutes || 5,
        require_diagnosis: clinicConfig.require_diagnosis ?? true,
        require_physical_exam: clinicConfig.require_physical_exam || false,
        enable_electronic_prescription: clinicConfig.enable_electronic_prescription || false,
        notification_settings: clinicConfig.notification_settings || {
          email_enabled: true,
          sms_enabled: false,
          whatsapp_enabled: false,
          appointment_reminders: true,
          reminder_hours_before: 24,
        },
        data_retention_days: clinicConfig.data_retention_days || 3650,
        enable_audit_log: clinicConfig.enable_audit_log ?? true,
        require_patient_consent: clinicConfig.require_patient_consent ?? true,
        enable_billing: clinicConfig.enable_billing || false,
        tax_rate: clinicConfig.tax_rate || 16.00,
        theme_color: clinicConfig.theme_color || '#3B82F6',
      });
    }
  }, [clinicConfig]);

  // Sin clínica activa
  if (!loading && !activeClinic) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-2xl mx-auto mt-8">
        <Building className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-yellow-900 mb-3">Sin Clínica Asociada</h3>
        <p className="text-yellow-700 mb-4">
          No tienes una clínica activa asociada a tu cuenta.
        </p>
        <div className="bg-white border border-yellow-300 rounded-lg p-4 text-left mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Para resolver esto:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Contacta al administrador del sistema para que te asocie a una clínica</li>
            <li>O solicita acceso a una clínica existente desde el menú principal</li>
          </ol>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Si eres el administrador del sistema, ejecuta el script SQL de asociación de usuario
        </p>
      </div>
    );
  }

  // No autorizado
  if (!loading && !isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Acceso Denegado</h3>
        <p className="text-red-700">Solo los administradores pueden configurar la clínica.</p>
        <p className="text-sm text-red-600 mt-2">
          Tu rol actual no tiene permisos de administrador en esta clínica.
        </p>
      </div>
    );
  }

  // Cargando
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        <span className="ml-3 text-gray-600">Cargando configuración...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="h-6 w-6 text-red-500 inline mr-2" />
        <span className="text-red-700">{error}</span>
      </div>
    );
  }

  // Guardar cambios
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateClinicConfig(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error guardando configuración:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'billing', label: 'Facturación', icon: DollarSign },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-cyan-600" />
          Configuración de Clínica
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Configura los parámetros generales que aplicarán a todos los usuarios de la clínica
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-3 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Configuración General</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Duración de consulta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración por defecto de consulta (minutos)
                </label>
                <input
                  type="number"
                  value={formData.default_consultation_duration}
                  onChange={(e) => setFormData({...formData, default_consultation_duration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  min="15"
                  step="15"
                />
              </div>

              {/* Máximo de pacientes por día */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de pacientes por día
                </label>
                <input
                  type="number"
                  value={formData.max_patients_per_day}
                  onChange={(e) => setFormData({...formData, max_patients_per_day: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  min="1"
                />
              </div>

              {/* Tiempo de buffer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo de buffer entre consultas (minutos)
                </label>
                <input
                  type="number"
                  value={formData.buffer_time_minutes}
                  onChange={(e) => setFormData({...formData, buffer_time_minutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  min="0"
                  step="5"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_teleconsultation}
                  onChange={(e) => setFormData({...formData, enable_teleconsultation: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar teleconsultas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_emergency_mode}
                  onChange={(e) => setFormData({...formData, enable_emergency_mode: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar modo emergencia</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.require_diagnosis}
                  onChange={(e) => setFormData({...formData, require_diagnosis: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Requerir diagnóstico en consultas</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.require_physical_exam}
                  onChange={(e) => setFormData({...formData, require_physical_exam: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Requerir exploración física</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_electronic_prescription}
                  onChange={(e) => setFormData({...formData, enable_electronic_prescription: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar receta electrónica</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Horarios de Atención</h3>
            <p className="text-sm text-gray-600">
              Define los horarios generales de la clínica. Los médicos podrán personalizar sus propios horarios.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Componente de configuración de horarios</p>
              <p className="text-sm text-gray-500 mt-2">Por implementar en fase 2</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notification_settings?.email_enabled ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: { ...formData.notification_settings, email_enabled: e.target.checked }
                  })}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar notificaciones por correo</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notification_settings?.sms_enabled ?? false}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: { ...formData.notification_settings, sms_enabled: e.target.checked }
                  })}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar notificaciones por SMS</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notification_settings?.appointment_reminders ?? true}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: { ...formData.notification_settings, appointment_reminders: e.target.checked }
                  })}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Recordatorios de citas automáticos</span>
              </label>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enviar recordatorio con anticipación de (horas):
                </label>
                <input
                  type="number"
                  value={formData.notification_settings?.reminder_hours_before ?? 24}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: { ...formData.notification_settings, reminder_hours_before: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  min="1"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Privacidad y Seguridad</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retención de datos (días) - Mínimo 365 días por NOM
                </label>
                <input
                  type="number"
                  value={formData.data_retention_days}
                  onChange={(e) => setFormData({...formData, data_retention_days: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                  min="365"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_audit_log}
                  onChange={(e) => setFormData({...formData, enable_audit_log: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar registro de auditoría</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.require_patient_consent}
                  onChange={(e) => setFormData({...formData, require_patient_consent: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Requerir consentimiento informado del paciente</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Facturación</h3>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_billing}
                  onChange={(e) => setFormData({...formData, enable_billing: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar módulo de facturación</span>
              </label>

              {formData.enable_billing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tasa de impuesto (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Apariencia</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color del tema
                </label>
                <input
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({...formData, theme_color: e.target.value})}
                  className="h-10 w-20 border border-gray-300 rounded-md"
                />
                <span className="ml-3 text-sm text-gray-600">{formData.theme_color}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con botón de guardar */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        {saveSuccess && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Configuración guardada exitosamente</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            ml-auto flex items-center px-6 py-2 rounded-lg font-medium text-white
            ${saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-700'
            }
          `}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminClinicConfigPanel;
