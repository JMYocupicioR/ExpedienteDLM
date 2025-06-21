import React, { useState, useEffect } from 'react';
import { 
  X, Save, User, FileText, Settings as SettingsIcon, Shield, 
  Eye, EyeOff, Upload, Download, Bell, Globe, Moon, Sun,
  Smartphone, Clock, Key, LogOut, AlertCircle, CheckCircle,
  Camera, Trash2, Edit3, Lock, Unlock, Monitor
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onProfileUpdate: (profile: any) => void;
}

type TabType = 'profile' | 'prescription' | 'preferences' | 'security';

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
  show: boolean;
}

export default function SettingsModal({ isOpen, onClose, userProfile, onProfileUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({ type: 'info', message: '', show: false });
  
  // Profile Settings State
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    specialty: '',
    license_number: '',
    phone: '',
    schedule: {}
  });

  // Prescription Settings State
  const [prescriptionSettings, setPrescriptionSettings] = useState({
    letterhead: '',
    signature: '',
    default_medications: [],
    prescription_style: {
      header_color: '#1f2937',
      font_family: 'Arial',
      logo_url: '',
      footer_text: ''
    }
  });

  // System Preferences State
  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      sms: false,
      appointment_reminders: true,
      system_updates: true
    }
  });

  // Security State
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_enabled: false,
    login_history: [],
    active_sessions: []
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (isOpen && userProfile) {
      loadUserData();
    }
  }, [isOpen, userProfile]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load profile data
      setProfileData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        specialty: userProfile.specialty || '',
        license_number: userProfile.license_number || '',
        phone: userProfile.phone || '',
        schedule: userProfile.schedule || {}
      });

      // Load prescription settings
      setPrescriptionSettings({
        letterhead: '',
        signature: '',
        default_medications: [],
        prescription_style: userProfile.prescription_style || {
          header_color: '#1f2937',
          font_family: 'Arial',
          logo_url: '',
          footer_text: ''
        }
      });

      // Load security data (mock data for demo)
      setSecurityData(prev => ({
        ...prev,
        two_factor_enabled: false,
        login_history: [
          { date: '2024-01-15 10:30', ip: '192.168.1.1', device: 'Chrome - Windows' },
          { date: '2024-01-14 15:45', ip: '192.168.1.1', device: 'Safari - iPhone' },
          { date: '2024-01-13 09:15', ip: '10.0.0.1', device: 'Firefox - macOS' }
        ],
        active_sessions: [
          { id: '1', device: 'Chrome - Windows', location: 'Ciudad de México', last_active: '2024-01-15 10:30' },
          { id: '2', device: 'Safari - iPhone', location: 'Ciudad de México', last_active: '2024-01-15 08:15' }
        ]
      }));

    } catch (error) {
      showNotification('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          specialty: profileData.specialty,
          license_number: profileData.license_number,
          phone: profileData.phone,
          schedule: profileData.schedule
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      onProfileUpdate({ ...userProfile, ...profileData });
      showNotification('success', 'Perfil actualizado correctamente');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          prescription_style: prescriptionSettings.prescription_style
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      showNotification('success', 'Configuración de recetas actualizada');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (securityData.new_password !== securityData.confirm_password) {
        showNotification('error', 'Las contraseñas no coinciden');
        return;
      }

      if (securityData.new_password.length < 6) {
        showNotification('error', 'La contraseña debe tener al menos 6 caracteres');
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: securityData.new_password
      });

      if (error) throw error;

      setSecurityData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      showNotification('success', 'Contraseña actualizada correctamente');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setPrescriptionSettings(prev => ({
        ...prev,
        prescription_style: {
          ...prev.prescription_style,
          logo_url: publicUrl
        }
      }));

      showNotification('success', 'Logo subido correctamente');
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionTerminate = async (sessionId: string) => {
    try {
      // In a real implementation, this would call an API to terminate the session
      setSecurityData(prev => ({
        ...prev,
        active_sessions: prev.active_sessions.filter(session => session.id !== sessionId)
      }));
      showNotification('success', 'Sesión terminada');
    } catch (error: any) {
      showNotification('error', error.message);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'prescription', label: 'Recetas', icon: FileText },
    { id: 'preferences', label: 'Preferencias', icon: SettingsIcon },
    { id: 'security', label: 'Seguridad', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Configuración</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`px-6 py-3 border-b border-gray-700 ${
            notification.type === 'success' ? 'bg-green-900/50 border-green-700' :
            notification.type === 'error' ? 'bg-red-900/50 border-red-700' :
            'bg-blue-900/50 border-blue-700'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
              )}
              <span className={`text-sm ${
                notification.type === 'success' ? 'text-green-300' :
                notification.type === 'error' ? 'text-red-300' :
                'text-blue-300'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700">
            <nav className="p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Profile Settings Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Información del Perfil</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Especialidad
                        </label>
                        <select
                          value={profileData.specialty}
                          onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar especialidad</option>
                          <option value="medicina_general">Medicina General</option>
                          <option value="cardiologia">Cardiología</option>
                          <option value="neurologia">Neurología</option>
                          <option value="pediatria">Pediatría</option>
                          <option value="ginecologia">Ginecología</option>
                          <option value="traumatologia">Traumatología</option>
                          <option value="dermatologia">Dermatología</option>
                          <option value="psiquiatria">Psiquiatría</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Número de Cédula
                        </label>
                        <input
                          type="text"
                          value={profileData.license_number}
                          onChange={(e) => setProfileData(prev => ({ ...prev, license_number: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleProfileSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Prescription Settings Tab */}
              {activeTab === 'prescription' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Configuración de Recetas</h3>
                    
                    <div className="space-y-6">
                      {/* Logo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Logo del Consultorio
                        </label>
                        <div className="flex items-center space-x-4">
                          {prescriptionSettings.prescription_style.logo_url ? (
                            <div className="relative">
                              <img
                                src={prescriptionSettings.prescription_style.logo_url}
                                alt="Logo"
                                className="h-16 w-16 object-cover rounded-lg border border-gray-600"
                              />
                              <button
                                onClick={() => setPrescriptionSettings(prev => ({
                                  ...prev,
                                  prescription_style: { ...prev.prescription_style, logo_url: '' }
                                }))}
                                className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                              <Camera className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-upload"
                            />
                            <label
                              htmlFor="logo-upload"
                              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Subir Logo
                            </label>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                          </div>
                        </div>
                      </div>

                      {/* Header Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Color del Encabezado
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="color"
                            value={prescriptionSettings.prescription_style.header_color}
                            onChange={(e) => setPrescriptionSettings(prev => ({
                              ...prev,
                              prescription_style: { ...prev.prescription_style, header_color: e.target.value }
                            }))}
                            className="h-10 w-20 rounded border border-gray-600"
                          />
                          <input
                            type="text"
                            value={prescriptionSettings.prescription_style.header_color}
                            onChange={(e) => setPrescriptionSettings(prev => ({
                              ...prev,
                              prescription_style: { ...prev.prescription_style, header_color: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Font Family */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Fuente
                        </label>
                        <select
                          value={prescriptionSettings.prescription_style.font_family}
                          onChange={(e) => setPrescriptionSettings(prev => ({
                            ...prev,
                            prescription_style: { ...prev.prescription_style, font_family: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Georgia">Georgia</option>
                        </select>
                      </div>

                      {/* Footer Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Texto del Pie de Página
                        </label>
                        <textarea
                          value={prescriptionSettings.prescription_style.footer_text}
                          onChange={(e) => setPrescriptionSettings(prev => ({
                            ...prev,
                            prescription_style: { ...prev.prescription_style, footer_text: e.target.value }
                          }))}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Información de contacto, dirección, etc."
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handlePrescriptionSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Guardando...' : 'Guardar Configuración'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* System Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Preferencias del Sistema</h3>
                    
                    <div className="space-y-6">
                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Globe className="h-4 w-4 inline mr-2" />
                          Idioma
                        </label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="es">Español</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      {/* Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Clock className="h-4 w-4 inline mr-2" />
                          Zona Horaria
                        </label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                          <option value="America/New_York">Nueva York (GMT-5)</option>
                          <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                          <option value="Europe/Madrid">Madrid (GMT+1)</option>
                        </select>
                      </div>

                      {/* Theme */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Monitor className="h-4 w-4 inline mr-2" />
                          Tema
                        </label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                              preferences.theme === 'dark'
                                ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <Moon className="h-4 w-4 mr-2" />
                            Oscuro
                          </button>
                          <button
                            onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                              preferences.theme === 'light'
                                ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            <Sun className="h-4 w-4 mr-2" />
                            Claro
                          </button>
                        </div>
                      </div>

                      {/* Notifications */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-4">
                          <Bell className="h-4 w-4 inline mr-2" />
                          Notificaciones
                        </label>
                        <div className="space-y-3">
                          {Object.entries(preferences.notifications).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-gray-300 capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <button
                                onClick={() => setPreferences(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, [key]: !value }
                                }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  value ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    value ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => showNotification('success', 'Preferencias guardadas')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Preferencias
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Configuración de Seguridad</h3>
                    
                    <div className="space-y-6">
                      {/* Change Password */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Cambiar Contraseña</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Contraseña Actual
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={securityData.current_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, current_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Nueva Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={securityData.new_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, new_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Confirmar Nueva Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={securityData.confirm_password}
                                onChange={(e) => setSecurityData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={handlePasswordChange}
                            disabled={loading || !securityData.current_password || !securityData.new_password || !securityData.confirm_password}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Cambiar Contraseña
                          </button>
                        </div>
                      </div>

                      {/* Two Factor Authentication */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-md font-medium text-white">Autenticación de Dos Factores</h4>
                            <p className="text-sm text-gray-400">Agrega una capa extra de seguridad a tu cuenta</p>
                          </div>
                          <button
                            onClick={() => setSecurityData(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              securityData.two_factor_enabled ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                securityData.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        {securityData.two_factor_enabled && (
                          <div className="flex items-center space-x-2 text-sm text-green-300">
                            <CheckCircle className="h-4 w-4" />
                            <span>Autenticación de dos factores activada</span>
                          </div>
                        )}
                      </div>

                      {/* Active Sessions */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Sesiones Activas</h4>
                        <div className="space-y-3">
                          {securityData.active_sessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <Smartphone className="h-4 w-4 text-gray-400" />
                                  <span className="text-white text-sm">{session.device}</span>
                                </div>
                                <p className="text-xs text-gray-400">{session.location} • {session.last_active}</p>
                              </div>
                              <button
                                onClick={() => handleSessionTerminate(session.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Terminar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Login History */}
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-md font-medium text-white mb-4">Historial de Accesos</h4>
                        <div className="space-y-2">
                          {securityData.login_history.map((login, index) => (
                            <div key={index} className="flex items-center justify-between p-2 text-sm">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-gray-300">{login.device}</span>
                              </div>
                              <div className="text-gray-400">
                                <span>{login.date}</span>
                                <span className="ml-2 text-xs">({login.ip})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}