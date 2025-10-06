import React, { useState, useEffect } from 'react';
import { useClinicConfiguration } from '@/hooks/useClinicConfiguration';
import { useClinic } from '@/context/ClinicContext';
import { Save, CheckCircle, User, Clock, Bell, Keyboard, Building } from 'lucide-react';

/**
 * Panel de Preferencias Personales del Médico
 * 
 * Permite a los médicos personalizar su experiencia en cada clínica:
 * - Duración preferida de consultas
 * - Horarios personales
 * - Dashboard personalizado
 * - Atajos de teclado
 * - Plantillas favoritas
 */
const DoctorClinicPreferences: React.FC = () => {
  const { activeClinic } = useClinic();
  const {
    userPreferences,
    effectiveConfig,
    updateUserPreferences,
    loading,
    error,
  } = useClinicConfiguration();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'consultation' | 'dashboard' | 'notifications' | 'shortcuts'>('consultation');

  const [formData, setFormData] = useState({
    preferred_consultation_duration: 30,
    sidebar_collapsed: false,
    dashboard_widgets: ['upcoming_appointments', 'recent_patients', 'pending_tasks'],
    notification_preferences: {
      email_appointments: true,
      email_emergencies: true,
      desktop_notifications: true,
      sound_alerts: false,
    },
    favorite_diagnoses: [] as string[],
  });

  // Sincronizar formData con userPreferences cuando cambie
  useEffect(() => {
    if (userPreferences) {
      setFormData({
        preferred_consultation_duration: userPreferences.preferred_consultation_duration || 30,
        sidebar_collapsed: userPreferences.sidebar_collapsed || false,
        dashboard_widgets: userPreferences.dashboard_widgets || ['upcoming_appointments', 'recent_patients', 'pending_tasks'],
        notification_preferences: userPreferences.notification_preferences || {
          email_appointments: true,
          email_emergencies: true,
          desktop_notifications: true,
          sound_alerts: false,
        },
        favorite_diagnoses: userPreferences.favorite_diagnoses || [],
      });
    }
  }, [userPreferences]);

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
          <h4 className="font-semibold text-gray-900 mb-2">Para personalizar tus preferencias:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Necesitas estar asociado a al menos una clínica</li>
            <li>Contacta al administrador para que te asigne a una clínica</li>
            <li>O solicita acceso a una clínica existente</li>
          </ol>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Las preferencias se configuran por clínica, así que necesitas una clínica activa primero
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        <span className="ml-3 text-gray-600">Cargando preferencias...</span>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateUserPreferences(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error guardando preferencias:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'consultation', label: 'Consultas', icon: Clock },
    { id: 'dashboard', label: 'Dashboard', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'shortcuts', label: 'Atajos', icon: Keyboard },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="h-6 w-6 mr-2 text-cyan-600" />
          Mis Preferencias Personales
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Personaliza tu experiencia en esta clínica
        </p>

        {/* Indicador de configuración efectiva */}
        {effectiveConfig?.isUserCustomized && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Tienes configuraciones personalizadas activas
          </div>
        )}
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
        {activeTab === 'consultation' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración preferida de consulta (minutos)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Configuración de clínica: {effectiveConfig?.default_consultation_duration} minutos
              </p>
              <input
                type="number"
                value={formData.preferred_consultation_duration}
                onChange={(e) => setFormData({...formData, preferred_consultation_duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                min="15"
                step="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnósticos Favoritos (acceso rápido)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Agrega diagnósticos que uses frecuentemente para acceso rápido
              </p>
              <textarea
                placeholder="Ej: Diabetes Mellitus tipo 2, Hipertensión Arterial"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                rows={3}
              />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Widgets del Dashboard
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dashboard_widgets.includes('upcoming_appointments')}
                    onChange={(e) => {
                      const widgets = e.target.checked
                        ? [...formData.dashboard_widgets, 'upcoming_appointments']
                        : formData.dashboard_widgets.filter(w => w !== 'upcoming_appointments');
                      setFormData({...formData, dashboard_widgets: widgets});
                    }}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Próximas citas</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dashboard_widgets.includes('recent_patients')}
                    onChange={(e) => {
                      const widgets = e.target.checked
                        ? [...formData.dashboard_widgets, 'recent_patients']
                        : formData.dashboard_widgets.filter(w => w !== 'recent_patients');
                      setFormData({...formData, dashboard_widgets: widgets});
                    }}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pacientes recientes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dashboard_widgets.includes('pending_tasks')}
                    onChange={(e) => {
                      const widgets = e.target.checked
                        ? [...formData.dashboard_widgets, 'pending_tasks']
                        : formData.dashboard_widgets.filter(w => w !== 'pending_tasks');
                      setFormData({...formData, dashboard_widgets: widgets});
                    }}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Tareas pendientes</span>
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sidebar_collapsed}
                  onChange={(e) => setFormData({...formData, sidebar_collapsed: e.target.checked})}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Sidebar colapsado por defecto</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notification_preferences.email_appointments}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: { ...formData.notification_preferences, email_appointments: e.target.checked }
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Recibir correos de nuevas citas</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notification_preferences.email_emergencies}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: { ...formData.notification_preferences, email_emergencies: e.target.checked }
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Recibir correos de emergencias</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notification_preferences.desktop_notifications}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: { ...formData.notification_preferences, desktop_notifications: e.target.checked }
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Notificaciones de escritorio</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notification_preferences.sound_alerts}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: { ...formData.notification_preferences, sound_alerts: e.target.checked }
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Alertas sonoras</span>
            </label>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <Keyboard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-center text-gray-600">Atajos de teclado personalizados</p>
              <p className="text-center text-sm text-gray-500 mt-2">Por implementar en fase 2</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        {saveSuccess && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Preferencias guardadas</span>
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
              Guardar Preferencias
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DoctorClinicPreferences;
