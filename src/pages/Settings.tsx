import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, User, Bell, Lock, Database, 
  Monitor, Globe, Shield, Save, CheckCircle, Building, Palette,
  UploadCloud, Image as ImageIcon, Loader2, Eye, EyeOff,
  Camera, Mail, Calendar, Clock, Smartphone, Key,
  Stethoscope, FileText, Activity, AlertCircle, Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
  show: boolean;
}

interface ProfileData {
  full_name: string;
  email: string;
  specialty: string;
  license_number: string;
  phone: string;
  clinic_name: string;
  clinic_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  photo_url?: string;
  clinic_logo_url?: string;
}

interface ExtendedProfile {
  id: string;
  email: string;
  role: string;
  specialty: string;
  full_name: string;
  license_number: string;
  phone: string;
  clinic_name?: string;
  clinic_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  photo_url?: string;
  clinic_logo_url?: string;
}

// Componente para subir imágenes
function ImageUploader({
  label,
  currentImageUrl,
  onFileSelect,
  aspectRatio = 'aspect-square',
  description
}: {
  label: string;
  currentImageUrl?: string;
  onFileSelect: (file: File) => void;
  aspectRatio?: 'aspect-square' | 'aspect-video';
  description?: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        {description && (
          <p className="text-xs text-gray-400 mb-2">{description}</p>
        )}
      </div>
      <div className={`relative w-32 h-32 ${aspectRatio === 'aspect-video' ? 'w-48 h-28' : ''} rounded-xl border-2 border-dashed border-gray-600 hover:border-cyan-500 transition-colors flex items-center justify-center bg-gray-800/50 overflow-hidden group`}>
        {preview ? (
          <>
            <img 
              src={preview} 
              alt={label} 
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </>
        ) : (
          <div className="text-center">
            <ImageIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Sin imagen</p>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors border border-gray-600"
      >
        <UploadCloud className="h-4 w-4" />
        <span>Cambiar Imagen</span>
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, profile } = useAuth();
  const { theme, setTheme, fontScale, setFontScale, accentPrimary, accentSecondary, setAccentColors, contrastMode, setContrastMode } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({ type: 'info', message: '', show: false });
  
  // Form data states
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: '',
    specialty: '',
    license_number: '',
    phone: '',
    clinic_name: '',
    clinic_address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });
  
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [clinicLogoFile, setClinicLogoFile] = useState<File | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const sections: SettingSection[] = [
    {
      id: 'profile',
      title: 'Perfil y Clínica',
      description: 'Información personal y de la clínica',
      icon: User
    },
    {
      id: 'clinic',
      title: 'Configuración Médica',
      description: 'Especialidades y configuraciones médicas',
      icon: Stethoscope
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configurar alertas y avisos',
      icon: Bell
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Contraseña y autenticación',
      icon: Lock
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Tema y configuración visual',
      icon: Palette
    }
  ];

  if (profile?.role === 'super_admin') {
    sections.push(
      {
        id: 'system',
        title: 'Sistema',
        description: 'Configuraciones del sistema',
        icon: Database
      },
      {
        id: 'privacy',
        title: 'Privacidad',
        description: 'Políticas de datos y HIPAA',
        icon: Shield
      }
    );
  }

  // Load user data on component mount
  useEffect(() => {
    if (profile) {
      const extendedProfile = profile as ExtendedProfile;
      setProfileData({
        full_name: extendedProfile.full_name || '',
        email: extendedProfile.email || '',
        specialty: extendedProfile.specialty || '',
        license_number: extendedProfile.license_number || '',
        phone: extendedProfile.phone || '',
        clinic_name: extendedProfile.clinic_name || '',
        clinic_address: {
          street: extendedProfile.clinic_address?.street || '',
          city: extendedProfile.clinic_address?.city || '',
          state: extendedProfile.clinic_address?.state || '',
          zip: extendedProfile.clinic_address?.zip || ''
        },
        photo_url: extendedProfile.photo_url,
        clinic_logo_url: extendedProfile.clinic_logo_url
      });
    }
  }, [profile]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const updatedData: Partial<ProfileData> = {
        full_name: formData.get('full_name') as string,
        specialty: formData.get('specialty') as string,
        license_number: formData.get('license_number') as string,
        phone: formData.get('phone') as string,
        clinic_name: formData.get('clinic_name') as string,
        clinic_address: {
          street: formData.get('clinic_street') as string,
          city: formData.get('clinic_city') as string,
          state: formData.get('clinic_state') as string,
          zip: formData.get('clinic_zip') as string,
        }
      };

      // Upload profile picture if selected
      if (profilePictureFile) {
        const photoUrl = await uploadFile(profilePictureFile, 'profile_pictures');
        updatedData.photo_url = photoUrl;
      }

      // Upload clinic logo if selected
      if (clinicLogoFile) {
        const logoUrl = await uploadFile(clinicLogoFile, 'clinic_logos');
        updatedData.clinic_logo_url = logoUrl;
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfileData(prev => ({ ...prev, ...updatedData }));
      showNotification('success', 'Perfil actualizado correctamente');
      setProfilePictureFile(null);
      setClinicLogoFile(null);

    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('error', 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    showNotification('success', 'Configuración guardada correctamente');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <form onSubmit={handleProfileSave} className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <User className="h-6 w-6 mr-3 text-cyan-400" />
                Perfil y Clínica
              </h3>
              <p className="text-gray-400">
                Gestiona tu información personal y los detalles de tu clínica. Esta información aparecerá en tus recetas y documentos médicos.
              </p>
            </div>

            {/* Profile Images */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Camera className="h-5 w-5 mr-2 text-cyan-400" />
                Imágenes de Perfil
              </h4>
              <div className="grid md:grid-cols-2 gap-8">
                <ImageUploader
                  label="Foto de Perfil"
                  description="Esta imagen aparecerá en tu perfil y firma digital"
                  currentImageUrl={profileData.photo_url}
                  onFileSelect={setProfilePictureFile}
                  aspectRatio="aspect-square"
                />
                <ImageUploader
                  label="Logo de la Clínica"
                  description="Logo que aparecerá en tus recetas y documentos"
                  currentImageUrl={profileData.clinic_logo_url}
                  onFileSelect={setClinicLogoFile}
                  aspectRatio="aspect-video"
                />
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <User className="h-5 w-5 mr-2 text-cyan-400" />
                Información Personal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={profileData.full_name}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="Dr. Juan Pérez García"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={profileData.phone}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="+52 555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Especialidad *
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    defaultValue={profileData.specialty}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="Cardiología, Medicina General, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cédula Profesional *
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    defaultValue={profileData.license_number}
                    required
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="12345678"
                  />
                </div>
              </div>
            </div>

            {/* Clinic Information */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Building className="h-5 w-5 mr-2 text-cyan-400" />
                Información de la Clínica
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de la Clínica
                  </label>
                  <input
                    type="text"
                    name="clinic_name"
                    defaultValue={profileData.clinic_name}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="Clínica Médica Integral"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="clinic_street"
                    defaultValue={profileData.clinic_address.street}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="Av. Revolución 1234, Col. Centro"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="clinic_city"
                      defaultValue={profileData.clinic_address.city}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      placeholder="Ciudad de México"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Estado
                    </label>
                    <input
                      type="text"
                      name="clinic_state"
                      defaultValue={profileData.clinic_address.state}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="clinic_zip"
                      defaultValue={profileData.clinic_address.zip}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      placeholder="06000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        );

      case 'clinic':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Stethoscope className="h-6 w-6 mr-3 text-cyan-400" />
                Configuración Médica
              </h3>
              <p className="text-gray-400">
                Configura aspectos específicos de tu práctica médica y especialidades.
              </p>
            </div>

            {/* Medical Specialties */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-cyan-400" />
                Especialidades y Certificaciones
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Especialidad Principal
                    </label>
                    <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                      <option value="">Seleccionar especialidad</option>
                      <option value="medicina-general">Medicina General</option>
                      <option value="cardiologia">Cardiología</option>
                      <option value="dermatologia">Dermatología</option>
                      <option value="neurologia">Neurología</option>
                      <option value="pediatria">Pediatría</option>
                      <option value="ginecologia">Ginecología</option>
                      <option value="traumatologia">Traumatología</option>
                      <option value="psiquiatria">Psiquiatría</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subespecialidades
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Ej: Cardiología Intervencionista"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Certificaciones Adicionales
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Listado de certificaciones, diplomas, y cursos relevantes"
                  />
                </div>
              </div>
            </div>

            {/* Medical Practice Settings */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-cyan-400" />
                Configuración de Práctica
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Horario de Consultas
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Lunes a Viernes</span>
                        <div className="flex space-x-2">
                          <input
                            type="time"
                            defaultValue="09:00"
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            defaultValue="18:00"
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Sábados</span>
                        <div className="flex space-x-2">
                          <input
                            type="time"
                            defaultValue="09:00"
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            defaultValue="14:00"
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duración de Consulta (minutos)
                    </label>
                    <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                      <option value="15">15 minutos</option>
                      <option value="20">20 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Consultas
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Consultas presenciales</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Teleconsultas</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Consultas de urgencia</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Idiomas de Atención
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Español</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Inglés</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500" />
                        <span className="ml-2 text-gray-300">Francés</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prescription Settings */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-cyan-400" />
                Configuración de Recetas
              </h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Formato de Receta Preferido
                    </label>
                    <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                      <option value="tradicional">Formato Tradicional</option>
                      <option value="moderno">Formato Moderno</option>
                      <option value="minimal">Formato Minimalista</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Incluir QR en Recetas
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                      <span className="ml-3 text-gray-300">Código QR para validación</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Medicamentos Frecuentes
                  </label>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3">Configura una lista de medicamentos que prescribes frecuentemente para acceso rápido.</p>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm">
                      <FileText className="h-4 w-4" />
                      <span>Gestionar Lista de Medicamentos</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="h-5 w-5" />
                <span>Guardar Configuración Médica</span>
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Bell className="h-6 w-6 mr-3 text-cyan-400" />
                Notificaciones
              </h3>
              <p className="text-gray-400">
                Configura cómo y cuándo recibir notificaciones sobre tu práctica médica.
              </p>
            </div>

            {/* Email Notifications */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-cyan-400" />
                Notificaciones por Email
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">Nuevos pacientes</p>
                    <p className="text-gray-400 text-sm">Recibir notificaciones cuando se registren nuevos pacientes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">Citas próximas</p>
                    <p className="text-gray-400 text-sm">Recordatorios de citas programadas para el día siguiente</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">Resultados de estudios</p>
                    <p className="text-gray-400 text-sm">Notificaciones cuando los resultados de laboratorio estén listos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Actualizaciones del sistema</p>
                    <p className="text-gray-400 text-sm">Notificaciones sobre nuevas funciones y mantenimiento</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Push Notifications */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-cyan-400" />
                Notificaciones Push
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">Citas de emergencia</p>
                    <p className="text-gray-400 text-sm">Notificaciones inmediatas para citas urgentes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Recordatorios de medicación</p>
                    <p className="text-gray-400 text-sm">Recordatorios para seguimiento de medicación de pacientes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Schedule */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-cyan-400" />
                Horario de Notificaciones
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    No molestar desde
                  </label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hasta
                  </label>
                  <input
                    type="time"
                    defaultValue="07:00"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Durante este horario solo recibirás notificaciones de emergencia.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="h-5 w-5" />
                <span>Guardar Notificaciones</span>
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Lock className="h-6 w-6 mr-3 text-cyan-400" />
                Seguridad
              </h3>
              <p className="text-gray-400">
                Gestiona la seguridad de tu cuenta y controla el acceso a tu información médica.
              </p>
            </div>

            {/* Password Change */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Key className="h-5 w-5 mr-2 text-cyan-400" />
                Cambiar Contraseña
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-12"
                      placeholder="Ingresa tu contraseña actual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-12"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Usa al menos 8 caracteres con una combinación de letras, números y símbolos.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-12"
                      placeholder="Confirma tu nueva contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium">
                  <Lock className="h-5 w-5" />
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-cyan-400" />
                Autenticación de Dos Factores
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Activar 2FA</p>
                    <p className="text-gray-400 text-sm">Añade una capa extra de seguridad con autenticación de dos factores</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-medium text-sm">Recomendación de Seguridad</p>
                      <p className="text-yellow-200 text-sm">
                        Activar la autenticación de dos factores es altamente recomendado para proteger información médica sensible.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-cyan-400" />
                Sesiones Activas
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div>
                      <p className="text-white font-medium">Sesión Actual</p>
                      <p className="text-gray-400 text-sm">Chrome en Windows • Ciudad de México</p>
                      <p className="text-gray-400 text-xs">Última actividad: Ahora</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-600 text-green-100 text-xs rounded-full">
                    Actual
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div>
                      <p className="text-white font-medium">Safari en iPhone</p>
                      <p className="text-gray-400 text-sm">Ciudad de México</p>
                      <p className="text-gray-400 text-xs">Última actividad: Hace 2 horas</p>
                    </div>
                  </div>
                  <button className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-cyan-400" />
                Configuración de Privacidad
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">Auditoría de acceso</p>
                    <p className="text-gray-400 text-sm">Registrar todos los accesos a expedientes médicos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Tiempo de sesión automática</p>
                    <p className="text-gray-400 text-sm">Cerrar sesión automáticamente por inactividad</p>
                  </div>
                  <select className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="h-5 w-5" />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Palette className="h-6 w-6 mr-3 text-cyan-400" />
                Apariencia
              </h3>
              <p className="text-gray-400">
                Personaliza la apariencia de la aplicación según tus preferencias.
              </p>
            </div>

            {/* Theme Settings */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-cyan-400" />
                Tema de la Aplicación
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input type="radio" name="theme" value="light" id="theme-light" className="sr-only peer" checked={theme==='light'} onChange={() => setTheme('light')} />
                  <label htmlFor="theme-light" className="flex flex-col items-center p-4 bg-white border-2 border-gray-300 rounded-xl cursor-pointer hover:border-cyan-500 peer-checked:border-cyan-500 peer-checked:ring-2 peer-checked:ring-cyan-500 transition-all">
                    <div className="w-16 h-12 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
                      <div className="w-8 h-6 bg-white rounded shadow-sm border border-gray-200"></div>
                    </div>
                    <span className="text-gray-800 font-medium">Claro</span>
                    <span className="text-gray-600 text-sm">Modo día</span>
                  </label>
                </div>
                <div className="relative">
                  <input type="radio" name="theme" value="dark" id="theme-dark" className="sr-only peer" checked={theme==='dark'} onChange={() => setTheme('dark')} />
                  <label htmlFor="theme-dark" className="flex flex-col items-center p-4 bg-gray-800 border-2 border-cyan-500 rounded-xl cursor-pointer hover:border-cyan-400 peer-checked:border-cyan-500 peer-checked:ring-2 peer-checked:ring-cyan-500 transition-all">
                    <div className="w-16 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg mb-3 flex items-center justify-center">
                      <div className="w-8 h-6 bg-gray-600 rounded shadow-sm"></div>
                    </div>
                    <span className="text-white font-medium">Oscuro</span>
                    <span className="text-gray-400 text-sm">Modo noche</span>
                  </label>
                </div>
                <div className="relative">
                  <input type="radio" name="theme" value="auto" id="theme-auto" className="sr-only peer" checked={theme==='system'} onChange={() => setTheme('system')} />
                  <label htmlFor="theme-auto" className="flex flex-col items-center p-4 bg-gradient-to-br from-white to-gray-800 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-cyan-500 peer-checked:border-cyan-500 peer-checked:ring-2 peer-checked:ring-cyan-500 transition-all">
                    <div className="w-16 h-12 bg-gradient-to-r from-gray-100 to-gray-700 rounded-lg mb-3 flex items-center justify-center">
                      <div className="w-8 h-6 bg-gradient-to-r from-white to-gray-600 rounded shadow-sm border border-gray-200"></div>
                    </div>
                    <span className="text-white font-medium">Automático</span>
                    <span className="text-gray-400 text-sm">Sistema</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Language and Region */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-cyan-400" />
                Idioma y Región
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma de la Interfaz
                  </label>
                  <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Zona Horaria
                  </label>
                  <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                    <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Color Customization */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Palette className="h-5 w-5 mr-2 text-cyan-400" />
                Personalización de Colores
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Color Principal
                  </label>
                  <div className="grid grid-cols-7 gap-3">
                    {['#0ea5e9','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444'].map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setAccentColors(color, accentSecondary)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${accentPrimary === color ? 'border-white ring-2 ring-cyan-500' : 'border-gray-600 hover:border-gray-400'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Color Secundario
                  </label>
                  <div className="grid grid-cols-7 gap-3">
                    {['#6366f1','#3b82f6','#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444'].map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setAccentColors(accentPrimary, color)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${accentSecondary === color ? 'border-white ring-2 ring-cyan-500' : 'border-gray-600 hover:border-gray-400'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Modo de alto contraste</p>
                    <p className="text-gray-400 text-sm">Mejora la legibilidad para mejor accesibilidad</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={contrastMode==='high'} onChange={(e)=>setContrastMode(e.target.checked?'high':'normal')} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-cyan-400" />
                Configuración de Pantalla
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tamaño de Fuente
                  </label>
                  <input
                    type="range"
                    min={0.9}
                    max={1.25}
                    step={0.05}
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-400 text-xs mt-1">Escala: {Math.round(fontScale*100)}%</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Animaciones reducidas</p>
                    <p className="text-gray-400 text-sm">Disminuye las animaciones para mejor rendimiento</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="h-5 w-5" />
                <span>Guardar Apariencia</span>
              </button>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Database className="h-6 w-6 mr-3 text-cyan-400" />
                Sistema
              </h3>
              <p className="text-gray-400">
                Configuraciones avanzadas del sistema y mantenimiento.
              </p>
            </div>

            {/* Admin Warning */}
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-yellow-300 font-medium mb-2">Configuraciones de Administrador</h4>
                  <p className="text-yellow-200 text-sm">
                    Solo usuarios con permisos de administrador pueden modificar estas configuraciones.
                    Los cambios pueden afectar el funcionamiento del sistema.
                  </p>
                </div>
              </div>
            </div>

            {/* System Controls */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Database className="h-5 w-5 mr-2 text-cyan-400" />
                Control del Sistema
              </h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">Modo de mantenimiento</p>
                    <p className="text-gray-400 text-sm">Bloquear acceso temporal al sistema para mantenimiento</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-white font-medium">Registro detallado</p>
                    <p className="text-gray-400 text-sm">Activar logs detallados para auditoría y debugging</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Respaldos automáticos</p>
                    <p className="text-gray-400 text-sm">Realizar respaldos automáticos de la base de datos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-cyan-400" />
                Acciones del Sistema
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center space-x-3 p-4 bg-blue-900/30 border border-blue-700 rounded-lg hover:bg-blue-900/50 transition-colors">
                  <Database className="h-5 w-5 text-blue-400" />
                  <span className="text-blue-300 font-medium">Optimizar Base de Datos</span>
                </button>
                <button className="flex items-center space-x-3 p-4 bg-green-900/30 border border-green-700 rounded-lg hover:bg-green-900/50 transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 font-medium">Verificar Integridad</span>
                </button>
                <button className="flex items-center space-x-3 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg hover:bg-yellow-900/50 transition-colors">
                  <Activity className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-300 font-medium">Ver Logs del Sistema</span>
                </button>
                <button className="flex items-center space-x-3 p-4 bg-purple-900/30 border border-purple-700 rounded-lg hover:bg-purple-900/50 transition-colors">
                  <FileText className="h-5 w-5 text-purple-400" />
                  <span className="text-purple-300 font-medium">Generar Reporte</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                <Shield className="h-6 w-6 mr-3 text-cyan-400" />
                Privacidad y Cumplimiento
              </h3>
              <p className="text-gray-400">
                Información sobre cumplimiento normativo y protección de datos médicos.
              </p>
            </div>

            {/* HIPAA Compliance */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
              <h4 className="text-blue-300 font-medium mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Cumplimiento HIPAA
              </h4>
              <div className="space-y-4">
                <p className="text-blue-200 text-sm leading-relaxed">
                  Este sistema cumple con las regulaciones HIPAA (Health Insurance Portability and Accountability Act) 
                  para la protección de información médica protegida (PHI).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-blue-200 text-sm">Cifrado de datos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-blue-200 text-sm">Auditoría de accesos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-blue-200 text-sm">Control de acceso</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-blue-200 text-sm">Respaldos seguros</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Protection */}
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
              <h4 className="text-green-300 font-medium mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Protección de Datos
              </h4>
              <div className="space-y-4">
                <p className="text-green-200 text-sm leading-relaxed">
                  Implementamos múltiples capas de seguridad para proteger la información médica:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-green-200 text-sm">Cifrado AES-256 en tránsito y en reposo</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-green-200 text-sm">Autenticación multifactor disponible</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-green-200 text-sm">Monitoreo de actividad en tiempo real</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-green-200 text-sm">Respaldos automáticos y seguros</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-cyan-400" />
                Retención de Datos
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Expedientes médicos</span>
                  <span className="text-cyan-400 font-medium">7 años</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Logs de auditoría</span>
                  <span className="text-cyan-400 font-medium">3 años</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Datos de sesión</span>
                  <span className="text-cyan-400 font-medium">30 días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Respaldos</span>
                  <span className="text-cyan-400 font-medium">5 años</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-medium text-white mb-6 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-cyan-400" />
                Contacto de Privacidad
              </h4>
              <p className="text-gray-300 mb-4">
                Para consultas sobre privacidad y manejo de datos, contacta a nuestro oficial de privacidad:
              </p>
              <div className="space-y-2">
                <p className="text-cyan-400">privacy@deepluxmed.com</p>
                <p className="text-gray-400 text-sm">Tiempo de respuesta: 24-48 horas</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-gradient)' }}>
      {/* Notification Component */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-6 py-4 rounded-lg shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-green-900 border-green-700 text-green-100' 
              : notification.type === 'error'
              ? 'bg-red-900 border-red-700 text-red-100'
              : 'bg-blue-900 border-blue-700 text-blue-100'
          }`}>
            <div className="flex items-center space-x-3">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {notification.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {notification.type === 'info' && <Info className="h-5 w-5" />}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center">
            <SettingsIcon className="h-8 w-8 mr-3 text-cyan-400" />
            Configuraciones
          </h1>
          <p className="text-gray-400 text-lg">
            Gestiona tu cuenta, perfil y preferencias del sistema médico
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-4 sticky top-8">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                        ${activeSection === section.id 
                          ? 'bg-cyan-600 text-white shadow-lg scale-105' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:scale-102'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{section.title}</p>
                        <p className="text-xs opacity-80 truncate">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
              
              {/* User Info in Sidebar */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center space-x-3 px-4 py-3 bg-gray-700/30 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {profileData.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{profileData.full_name || 'Usuario'}</p>
                    <p className="text-gray-400 text-xs truncate">{profileData.specialty || 'Médico'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden">
              <div className="p-6 md:p-8">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}