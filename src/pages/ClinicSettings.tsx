import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useClinic } from '../context/ClinicContext';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  Clock,
  CreditCard,
  Shield,
  Users,
  Save,
  ArrowLeft,
  Upload,
  Palette,
  FileText,
  Heart,
  Briefcase
} from 'lucide-react';

interface WorkingHours {
  open: string;
  close: string;
  is_open: boolean;
}

interface DaySchedule {
  [key: string]: WorkingHours;
}

const ClinicSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeClinic, refreshUserClinics } = useClinic();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'clinic',
    address: '',
    phone: '',
    email: '',
    website: '',
    license_number: '',
    director_name: '',
    director_license: '',
    tax_id: '',
    founding_date: '',
    emergency_phone: '',
    appointment_duration_minutes: 30,
    theme_color: '#3B82F6',
    logo_url: ''
  });

  const [workingHours, setWorkingHours] = useState<DaySchedule>({
    monday: { open: '09:00', close: '18:00', is_open: true },
    tuesday: { open: '09:00', close: '18:00', is_open: true },
    wednesday: { open: '09:00', close: '18:00', is_open: true },
    thursday: { open: '09:00', close: '18:00', is_open: true },
    friday: { open: '09:00', close: '18:00', is_open: true },
    saturday: { open: '09:00', close: '13:00', is_open: true },
    sunday: { open: '09:00', close: '13:00', is_open: false }
  });

  const [services, setServices] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash', 'card', 'transfer']);

  useEffect(() => {
    console.log('🔍 ClinicSettings useEffect triggered');
    console.log('🔍 Current activeClinic:', activeClinic);
    console.log('🔍 Current user:', user);
    
    // Add a small delay to ensure context is fully loaded
    const timer = setTimeout(() => {
      checkPermissionsAndLoadData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activeClinic, user]);

  const checkPermissionsAndLoadData = async () => {
    console.log('🔍 Starting checkPermissionsAndLoadData');
    
    // Wait a bit more if context is still loading
    if (!activeClinic || !user) {
      console.log('⏳ Waiting for context to load...', { activeClinic: !!activeClinic, user: !!user });
      setTimeout(() => {
        if (activeClinic && user) {
          checkPermissionsAndLoadData();
        } else {
          console.log('❌ Context still not loaded after delay, redirecting to dashboard');
          navigate('/dashboard');
        }
      }, 1000);
      return;
    }

    console.log('✅ Basic checks passed, checking admin permissions...');
    console.log('🔍 User ID:', user.id);
    console.log('🔍 Clinic ID:', activeClinic.id);

    try {
      // Check if user is admin
      console.log('🔍 Checking admin permissions for user:', user.id, 'in clinic:', activeClinic.id);
      
      const { data: membership, error: membershipError } = await supabase
        .from('clinic_members')
        .select('role')
        .eq('clinic_id', activeClinic.id)
        .eq('user_id', user.id)
        .single();

      console.log('🔍 Membership query result:', { membership, membershipError });

      if (membershipError) {
        console.error('❌ Error fetching clinic membership:', membershipError);
        
        // Try alternative approach: check profiles table
        console.log('🔄 Trying alternative approach: checking profiles table...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, clinic_id')
          .eq('id', user.id)
          .single();
        
        if (profileError || !profile || profile.clinic_id !== activeClinic.id || profile.role !== 'admin') {
          console.error('❌ Alternative approach also failed:', profileError);
          alert('Error verificando permisos de administrador');
          navigate('/dashboard');
          return;
        }
        
        console.log('✅ Alternative approach successful, user is admin via profiles');
        setIsAdmin(true);
        await loadClinicData();
        return;
      }

      console.log('🔍 User role in clinic:', membership?.role);

      if (membership?.role !== 'admin') {
        console.log('❌ User is not admin, role:', membership?.role);
        alert('Solo los administradores pueden acceder a la configuración');
        navigate('/dashboard');
        return;
      }

      console.log('✅ User is admin, loading clinic data...');
      setIsAdmin(true);
      await loadClinicData();

    } catch (error) {
      console.error('💥 Unexpected error in checkPermissionsAndLoadData:', error);
      alert('Error inesperado verificando permisos');
      navigate('/dashboard');
    }
  };

  const loadClinicData = async () => {
    if (!activeClinic) return;

    setLoading(true);
    try {
      const { data: clinic, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', activeClinic.id)
        .single();

      if (error) throw error;

      if (clinic) {
        setFormData({
          name: clinic.name || '',
          type: clinic.type || 'clinic',
          address: clinic.address || '',
          phone: clinic.phone || '',
          email: clinic.email || '',
          website: clinic.website || '',
          license_number: clinic.license_number || '',
          director_name: clinic.director_name || '',
          director_license: clinic.director_license || '',
          tax_id: clinic.tax_id || '',
          founding_date: clinic.founding_date || '',
          emergency_phone: clinic.emergency_phone || '',
          appointment_duration_minutes: clinic.appointment_duration_minutes || 30,
          theme_color: clinic.theme_color || '#3B82F6',
          logo_url: clinic.logo_url || ''
        });

        setWorkingHours(clinic.working_hours || workingHours);
        setServices(clinic.services || []);
        setSpecialties(clinic.specialties || []);
        setInsuranceProviders(clinic.insurance_providers || []);
        setPaymentMethods(clinic.payment_methods || ['cash', 'card', 'transfer']);
      }
    } catch (error) {
      console.error('Error loading clinic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkingHoursChange = (day: string, field: 'open' | 'close' | 'is_open', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleArrayAdd = (field: 'services' | 'specialties' | 'insuranceProviders', value: string) => {
    if (!value.trim()) return;
    
    switch (field) {
      case 'services':
        setServices(prev => [...prev, value]);
        break;
      case 'specialties':
        setSpecialties(prev => [...prev, value]);
        break;
      case 'insuranceProviders':
        setInsuranceProviders(prev => [...prev, value]);
        break;
    }
  };

  const handleArrayRemove = (field: 'services' | 'specialties' | 'insuranceProviders', index: number) => {
    switch (field) {
      case 'services':
        setServices(prev => prev.filter((_, i) => i !== index));
        break;
      case 'specialties':
        setSpecialties(prev => prev.filter((_, i) => i !== index));
        break;
      case 'insuranceProviders':
        setInsuranceProviders(prev => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClinic) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeClinic.id}/logo.${fileExt}`;
      const filePath = `clinic-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error al subir el logo');
    }
  };

  const handleSave = async () => {
    if (!activeClinic || !isAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          ...formData,
          working_hours: workingHours,
          services,
          specialties,
          insurance_providers: insuranceProviders,
          payment_methods: paymentMethods,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeClinic.id);

      if (error) throw error;

      await refreshUserClinics();
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving clinic settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Información General', icon: Building2 },
    { id: 'contact', label: 'Contacto', icon: Phone },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'services', label: 'Servicios', icon: Heart },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
    { id: 'appearance', label: 'Apariencia', icon: Palette }
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: { [key: string]: string } = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">
                Configuración de Clínica
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-gray-800 rounded-lg p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Información General
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre de la Clínica *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Establecimiento
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="clinic">Clínica</option>
                      <option value="hospital">Hospital</option>
                      <option value="medical_center">Centro Médico</option>
                      <option value="consultory">Consultorio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Número de Licencia
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      RFC/Tax ID
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Director/Responsable Médico
                    </label>
                    <input
                      type="text"
                      name="director_name"
                      value={formData.director_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cédula del Director
                    </label>
                    <input
                      type="text"
                      name="director_license"
                      value={formData.director_license}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha de Fundación
                    </label>
                    <input
                      type="date"
                      name="founding_date"
                      value={formData.founding_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duración de Cita (minutos)
                    </label>
                    <input
                      type="number"
                      name="appointment_duration_minutes"
                      value={formData.appointment_duration_minutes}
                      onChange={handleInputChange}
                      min="15"
                      max="120"
                      step="15"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Información de Contacto
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dirección
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Teléfono Principal
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Teléfono de Emergencia
                      </label>
                      <input
                        type="tel"
                        name="emergency_phone"
                        value={formData.emergency_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sitio Web
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Horarios de Atención
                </h2>

                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                      <div className="w-32">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={workingHours[day].is_open}
                            onChange={(e) => handleWorkingHoursChange(day, 'is_open', e.target.checked)}
                            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-white font-medium">
                            {dayNames[day]}
                          </span>
                        </label>
                      </div>

                      {workingHours[day].is_open && (
                        <>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-400">Apertura:</label>
                            <input
                              type="time"
                              value={workingHours[day].open}
                              onChange={(e) => handleWorkingHoursChange(day, 'open', e.target.value)}
                              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-400">Cierre:</label>
                            <input
                              type="time"
                              value={workingHours[day].close}
                              onChange={(e) => handleWorkingHoursChange(day, 'close', e.target.value)}
                              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Servicios y Especialidades
                </h2>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Servicios</h3>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Agregar servicio..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleArrayAdd('services', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {services.map((service, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600 text-white"
                        >
                          {service}
                          <button
                            onClick={() => handleArrayRemove('services', index)}
                            className="ml-2 text-white hover:text-gray-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Especialidades</h3>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Agregar especialidad..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleArrayAdd('specialties', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-600 text-white"
                        >
                          {specialty}
                          <button
                            onClick={() => handleArrayRemove('specialties', index)}
                            className="ml-2 text-white hover:text-gray-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Insurance Providers */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Aseguradoras</h3>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Agregar aseguradora..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleArrayAdd('insuranceProviders', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {insuranceProviders.map((provider, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-600 text-white"
                        >
                          {provider}
                          <button
                            onClick={() => handleArrayRemove('insuranceProviders', index)}
                            className="ml-2 text-white hover:text-gray-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Configuración de Facturación
                </h2>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">
                    Métodos de Pago Aceptados
                  </h3>
                  <div className="space-y-2">
                    {['cash', 'card', 'transfer', 'check', 'insurance'].map((method) => (
                      <label key={method} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={paymentMethods.includes(method)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPaymentMethods([...paymentMethods, method]);
                            } else {
                              setPaymentMethods(paymentMethods.filter(m => m !== method));
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-white">
                          {method === 'cash' && 'Efectivo'}
                          {method === 'card' && 'Tarjeta'}
                          {method === 'transfer' && 'Transferencia'}
                          {method === 'check' && 'Cheque'}
                          {method === 'insurance' && 'Seguro Médico'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Apariencia y Personalización
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Logo de la Clínica
                    </label>
                    <div className="flex items-center space-x-4">
                      {formData.logo_url && (
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
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
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          Subir Logo
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Color Principal
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        name="theme_color"
                        value={formData.theme_color}
                        onChange={handleInputChange}
                        className="h-10 w-20"
                      />
                      <span className="text-gray-400">{formData.theme_color}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicSettings;