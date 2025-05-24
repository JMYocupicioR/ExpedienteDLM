import React, { useState, useEffect } from 'react';
import { X, Save, User, Lock, Bell, Shield, Clock, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, FileText, Stethoscope, Plus, Edit as EditIcon, Palette, Layout, Type } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { supabase } from '../lib/supabase';
import PhysicalExamTemplates from './PhysicalExamTemplates';
import PhysicalExamTemplateEditor from './PhysicalExamTemplateEditor';

interface UserProfile {
  id: string;
  role: string;
  full_name: string | null;
  license_number?: string;
  phone?: string;
  email?: string;
  schedule?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    start_time: string;
    end_time: string;
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onUpdate: (profile: UserProfile) => void;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsModal({ isOpen, onClose, userProfile, onUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'schedule' | 'prescription' | 'examTemplates'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: userProfile?.full_name || '',
    license_number: userProfile?.license_number || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    monday: userProfile?.schedule?.monday || false,
    tuesday: userProfile?.schedule?.tuesday || false,
    wednesday: userProfile?.schedule?.wednesday || false,
    thursday: userProfile?.schedule?.thursday || false,
    friday: userProfile?.schedule?.friday || false,
    saturday: userProfile?.schedule?.saturday || false,
    sunday: userProfile?.schedule?.sunday || false,
    start_time: userProfile?.schedule?.start_time || '08:00',
    end_time: userProfile?.schedule?.end_time || '17:00'
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    systemUpdates: false,
    marketingEmails: false
  });

  // Prescription style settings
  const [prescriptionStyle, setPrescriptionStyle] = useState({
    headerStyle: 'modern',
    fontSize: 'medium',
    spacing: 'normal',
    includeQR: true,
    includeWatermark: false,
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    showLogo: true,
    logoPosition: 'left',
    paperSize: 'letter',
    margins: 'normal'
  });

  // Physical exam template management state
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<any>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Update form when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        full_name: userProfile.full_name || '',
        license_number: userProfile.license_number || '',
        phone: userProfile.phone || '',
        email: userProfile.email || ''
      });
      
      if (userProfile.schedule) {
        setScheduleForm(userProfile.schedule);
      }
    }
  }, [userProfile]);

  // Clear messages after time
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!userProfile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      // Validate required fields
      if (!profileForm.full_name.trim()) {
        throw new Error('El nombre completo es requerido');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          license_number: profileForm.license_number.trim() || null,
          phone: profileForm.phone.trim() || null
        })
        .eq('id', userProfile.id);

      if (updateError) {
        if (updateError.code === '42501') {
          throw new Error('No tienes permisos para actualizar el perfil');
        } else {
          throw new Error('Error al actualizar el perfil');
        }
      }

      // Update local state
      const updatedProfile = {
        ...userProfile,
        full_name: profileForm.full_name.trim(),
        license_number: profileForm.license_number.trim() || undefined,
        phone: profileForm.phone.trim() || undefined
      };

      onUpdate(updatedProfile);
      setSuccessMessage('Perfil actualizado correctamente');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate passwords
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        throw new Error('Todos los campos de contraseña son requeridos');
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (passwordForm.newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      setSuccessMessage('Contraseña actualizada correctamente');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle schedule update
  const handleScheduleUpdate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!userProfile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          schedule: scheduleForm
        })
        .eq('id', userProfile.id);

      if (updateError) {
        throw new Error('Error al actualizar el horario');
      }

      // Update local state
      const updatedProfile = {
        ...userProfile,
        schedule: scheduleForm
      };

      onUpdate(updatedProfile);
      setSuccessMessage('Horario actualizado correctamente');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Note: In a real app, you'd need to implement proper account deletion
      // This would involve deleting user data and signing them out
      setSuccessMessage('Solicitud de eliminación de cuenta enviada');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle prescription style update
  const handlePrescriptionStyleUpdate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!userProfile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          prescription_style: prescriptionStyle
        })
        .eq('id', userProfile.id);

      if (updateError) {
        throw new Error('Error al actualizar el estilo de receta');
      }

      // Update local state
      const updatedProfile = {
        ...userProfile,
        prescription_style: prescriptionStyle
      };

      onUpdate(updatedProfile);
      setSuccessMessage('Estilo de receta actualizado correctamente');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'schedule', label: 'Horario', icon: Clock },
    { id: 'prescription', label: 'Estilo de Receta', icon: FileText },
    { id: 'examTemplates', label: 'Plantillas de Exploración', icon: Stethoscope }
  ];

  const weekDays = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  if (!userProfile) {
    return null;
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-xl bg-gray-800 border border-gray-700 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                  <Dialog.Title className="text-xl font-semibold text-white">
                    Configuración
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Messages */}
                {error && (
                  <div className="mx-6 mt-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {successMessage && (
                  <div className="mx-6 mt-4 bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-lg text-sm flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{successMessage}</span>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="ml-auto text-green-400 hover:text-green-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-1/3 border-r border-gray-700 p-6">
                    <nav className="space-y-2">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            <Icon className="h-5 w-5 mr-3" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Información Personal</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nombre Completo *
                              </label>
                              <input
                                type="text"
                                value={profileForm.full_name}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Tu nombre completo"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Número de Cédula
                              </label>
                              <input
                                type="text"
                                value={profileForm.license_number}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, license_number: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Número de cédula profesional"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Teléfono
                              </label>
                              <input
                                type="tel"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Tu número de teléfono"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email
                              </label>
                              <input
                                type="email"
                                value={profileForm.email}
                                disabled
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                                placeholder="tu@email.com"
                              />
                              <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar desde aquí</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <button
                              onClick={handleProfileUpdate}
                              disabled={isLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Guardar Cambios
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Cambiar Contraseña</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contraseña Actual
                              </label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={passwordForm.currentPassword}
                                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  placeholder="Tu contraseña actual"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nueva Contraseña
                              </label>
                              <div className="relative">
                                <input
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={passwordForm.newPassword}
                                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  placeholder="Tu nueva contraseña"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Confirmar Nueva Contraseña
                              </label>
                              <div className="relative">
                                <input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  value={passwordForm.confirmPassword}
                                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  placeholder="Confirma tu nueva contraseña"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6">
                            <button
                              onClick={handlePasswordChange}
                              disabled={isLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4 mr-2" />
                              )}
                              Cambiar Contraseña
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-700 pt-6">
                          <h3 className="text-lg font-medium text-white mb-4">Zona de Peligro</h3>
                          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                            <h4 className="text-red-300 font-medium mb-2">Eliminar Cuenta</h4>
                            <p className="text-red-200 text-sm mb-4">
                              Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten esto en cuenta.
                            </p>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={isLoading}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar Cuenta
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Preferencias de Notificación</h3>
                          <div className="space-y-4">
                            {Object.entries(notificationSettings).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between">
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    {key === 'emailNotifications' ? 'Notificaciones por Email' :
                                     key === 'pushNotifications' ? 'Notificaciones Push' :
                                     key === 'appointmentReminders' ? 'Recordatorios de Citas' :
                                     key === 'systemUpdates' ? 'Actualizaciones del Sistema' :
                                     'Emails de Marketing'}
                                  </label>
                                  <p className="text-xs text-gray-400">
                                    {key === 'emailNotifications' ? 'Recibe notificaciones importantes por email' :
                                     key === 'pushNotifications' ? 'Recibe notificaciones en el navegador' :
                                     key === 'appointmentReminders' ? 'Recordatorios automáticos de citas médicas' :
                                     key === 'systemUpdates' ? 'Notificaciones sobre actualizaciones y mantenimiento' :
                                     'Ofertas especiales y contenido promocional'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
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
                    )}

                    {/* Schedule Tab */}
                    {activeTab === 'schedule' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Horario de Trabajo</h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Hora de Inicio
                                </label>
                                <input
                                  type="time"
                                  value={scheduleForm.start_time}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Hora de Fin
                                </label>
                                <input
                                  type="time"
                                  value={scheduleForm.end_time}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-3">
                                Días de Trabajo
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {weekDays.map((day) => (
                                  <label key={day.key} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={scheduleForm[day.key as keyof typeof scheduleForm] as boolean}
                                      onChange={(e) => setScheduleForm(prev => ({ ...prev, [day.key]: e.target.checked }))}
                                      className="rounded border-gray-500 text-blue-600 focus:ring-blue-500 bg-gray-700"
                                    />
                                    <span className="ml-2 text-sm text-gray-300">{day.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6">
                            <button
                              onClick={handleScheduleUpdate}
                              disabled={isLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Clock className="h-4 w-4 mr-2" />
                              )}
                              Guardar Horario
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prescription Style Tab */}
                    {activeTab === 'prescription' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-4">Personalizar Estilo de Receta</h3>
                          
                          {/* Estilo de Encabezado */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Estilo de Encabezado
                              </label>
                              <select
                                value={prescriptionStyle.headerStyle}
                                onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, headerStyle: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="modern">Moderno</option>
                                <option value="classic">Clásico</option>
                                <option value="minimal">Minimalista</option>
                                <option value="professional">Profesional</option>
                              </select>
                            </div>

                            {/* Tamaño de Fuente */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                <Type className="inline h-4 w-4 mr-1" />
                                Tamaño de Fuente
                              </label>
                              <select
                                value={prescriptionStyle.fontSize}
                                onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, fontSize: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="small">Pequeño</option>
                                <option value="medium">Mediano</option>
                                <option value="large">Grande</option>
                                <option value="extraLarge">Extra Grande</option>
                              </select>
                            </div>

                            {/* Espaciado */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                <Layout className="inline h-4 w-4 mr-1" />
                                Espaciado
                              </label>
                              <select
                                value={prescriptionStyle.spacing}
                                onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, spacing: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="compact">Compacto</option>
                                <option value="normal">Normal</option>
                                <option value="relaxed">Amplio</option>
                              </select>
                            </div>

                            {/* Colores */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  <Palette className="inline h-4 w-4 mr-1" />
                                  Color Principal
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="color"
                                    value={prescriptionStyle.primaryColor}
                                    onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, primaryColor: e.target.value }))}
                                    className="h-10 w-20 rounded cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={prescriptionStyle.primaryColor}
                                    onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, primaryColor: e.target.value }))}
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Color Secundario
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="color"
                                    value={prescriptionStyle.secondaryColor}
                                    onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                    className="h-10 w-20 rounded cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={prescriptionStyle.secondaryColor}
                                    onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Opciones adicionales */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">
                                  Incluir código QR
                                </label>
                                <button
                                  onClick={() => setPrescriptionStyle(prev => ({ ...prev, includeQR: !prev.includeQR }))}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    prescriptionStyle.includeQR ? 'bg-blue-600' : 'bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      prescriptionStyle.includeQR ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">
                                  Mostrar marca de agua
                                </label>
                                <button
                                  onClick={() => setPrescriptionStyle(prev => ({ ...prev, includeWatermark: !prev.includeWatermark }))}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    prescriptionStyle.includeWatermark ? 'bg-blue-600' : 'bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      prescriptionStyle.includeWatermark ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">
                                  Mostrar logotipo
                                </label>
                                <button
                                  onClick={() => setPrescriptionStyle(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    prescriptionStyle.showLogo ? 'bg-blue-600' : 'bg-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      prescriptionStyle.showLogo ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Tamaño de papel y márgenes */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Tamaño de Papel
                                </label>
                                <select
                                  value={prescriptionStyle.paperSize}
                                  onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, paperSize: e.target.value }))}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="letter">Carta (Letter)</option>
                                  <option value="a4">A4</option>
                                  <option value="legal">Oficio (Legal)</option>
                                  <option value="half">Media Carta</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Márgenes
                                </label>
                                <select
                                  value={prescriptionStyle.margins}
                                  onChange={(e) => setPrescriptionStyle(prev => ({ ...prev, margins: e.target.value }))}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="narrow">Estrechos</option>
                                  <option value="normal">Normales</option>
                                  <option value="wide">Amplios</option>
                                </select>
                              </div>
                            </div>

                            {/* Vista previa */}
                            <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                              <p className="text-sm text-gray-400 mb-2">Vista Previa</p>
                              <div className="bg-white p-4 rounded-lg" style={{ fontSize: prescriptionStyle.fontSize === 'small' ? '12px' : prescriptionStyle.fontSize === 'large' ? '18px' : prescriptionStyle.fontSize === 'extraLarge' ? '20px' : '14px' }}>
                                <div style={{ borderBottom: `2px solid ${prescriptionStyle.primaryColor}`, paddingBottom: '10px', marginBottom: prescriptionStyle.spacing === 'compact' ? '10px' : prescriptionStyle.spacing === 'relaxed' ? '20px' : '15px' }}>
                                  <h3 style={{ color: prescriptionStyle.primaryColor, margin: 0 }}>RECETA MÉDICA</h3>
                                  <p style={{ color: prescriptionStyle.secondaryColor, margin: '5px 0 0 0' }}>Dr. Juan Médico - CED: 12345678</p>
                                </div>
                                <div style={{ lineHeight: prescriptionStyle.spacing === 'compact' ? '1.4' : prescriptionStyle.spacing === 'relaxed' ? '1.8' : '1.6' }}>
                                  <p style={{ color: '#374151', margin: '5px 0' }}>Paciente: Ejemplo</p>
                                  <p style={{ color: '#374151', margin: '5px 0' }}>Medicamento: Ejemplo 500mg</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6">
                              <button
                                onClick={handlePrescriptionStyleUpdate}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Guardar Estilo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Physical Exam Templates Tab */}
                    {activeTab === 'examTemplates' && (
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-white">Plantillas de Exploración Física</h3>
                            <button
                              onClick={() => setShowTemplateEditor(true)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Nueva Plantilla
                            </button>
                          </div>

                          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <PhysicalExamTemplates
                              onSelectTemplate={(template) => {
                                setSelectedTemplateToEdit(template);
                                setShowTemplateEditor(true);
                              }}
                              doctorId={userProfile?.id || ''}
                            />
                          </div>

                          {showTemplateEditor && (
                            <PhysicalExamTemplateEditor
                              template={selectedTemplateToEdit}
                              doctorId={userProfile?.id || ''}
                              onSave={(template) => {
                                setShowTemplateEditor(false);
                                setSelectedTemplateToEdit(null);
                                // Refresh templates component
                              }}
                              onClose={() => {
                                setShowTemplateEditor(false);
                                setSelectedTemplateToEdit(null);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}