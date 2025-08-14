import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Settings,
  Building2,
  ArrowLeft,
  Save,
  Clock,
  Calendar,
  Shield,
  Bell,
  CreditCard,
  FileText,
  Globe,
  Mail,
  Phone,
  MapPin,
  User,
  Hash
} from 'lucide-react';

interface ClinicData {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  director_name: string;
  director_license: string;
  business_hours: any;
  services_offered: string[];
  insurance_accepted: string[];
  is_active: boolean;
  settings: any;
}

export default function ClinicSettings() {
  const { profile } = useAuth();
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'billing' | 'notifications'>('general');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadClinicData();
    }
  }, [profile]);

  const loadClinicData = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', profile.clinic_id)
        .single();

      if (error) throw error;

      setClinicData(data);
    } catch (error) {
      console.error('Error loading clinic data:', error);
      setNotification({ type: 'error', message: 'Error al cargar los datos de la clínica' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clinicData || !profile?.clinic_id) return;

    try {
      setSaving(true);
      setNotification(null);

      const { error } = await supabase
        .from('clinics')
        .update({
          name: clinicData.name,
          type: clinicData.type,
          address: clinicData.address,
          phone: clinicData.phone,
          email: clinicData.email,
          website: clinicData.website,
          tax_id: clinicData.tax_id,
          director_name: clinicData.director_name,
          director_license: clinicData.director_license,
          business_hours: clinicData.business_hours,
          services_offered: clinicData.services_offered,
          insurance_accepted: clinicData.insurance_accepted,
          settings: clinicData.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.clinic_id);

      if (error) throw error;

      setNotification({ type: 'success', message: 'Configuración guardada exitosamente' });
    } catch (error) {
      console.error('Error saving clinic settings:', error);
      setNotification({ type: 'error', message: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ClinicData, value: any) => {
    if (clinicData) {
      setClinicData({ ...clinicData, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!clinicData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No se encontraron datos de la clínica</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/clinic/summary"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Configuración de la Clínica</h1>
                <p className="text-sm text-gray-400">Administra la información y preferencias de tu clínica</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg ${
            notification.type === 'success' 
              ? 'bg-green-900/50 border border-green-700 text-green-300' 
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              <TabButton
                active={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
                icon={Building2}
                label="Información General"
              />
              <TabButton
                active={activeTab === 'schedule'}
                onClick={() => setActiveTab('schedule')}
                icon={Clock}
                label="Horarios"
              />
              <TabButton
                active={activeTab === 'billing'}
                onClick={() => setActiveTab('billing')}
                icon={CreditCard}
                label="Facturación"
              />
              <TabButton
                active={activeTab === 'notifications'}
                onClick={() => setActiveTab('notifications')}
                icon={Bell}
                label="Notificaciones"
              />
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              {activeTab === 'general' && (
                <GeneralSettings 
                  clinicData={clinicData} 
                  updateField={updateField}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleSettings 
                  clinicData={clinicData} 
                  updateField={updateField}
                />
              )}
              {activeTab === 'billing' && (
                <BillingSettings 
                  clinicData={clinicData} 
                  updateField={updateField}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationSettings 
                  clinicData={clinicData} 
                  updateField={updateField}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        active 
          ? 'bg-gray-800 text-white border border-gray-700' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function GeneralSettings({ 
  clinicData, 
  updateField 
}: { 
  clinicData: ClinicData; 
  updateField: (field: keyof ClinicData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Información General</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nombre de la Clínica *
          </label>
          <input
            type="text"
            value={clinicData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tipo de Clínica
          </label>
          <select
            value={clinicData.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="general">Clínica General</option>
            <option value="specialty">Clínica de Especialidad</option>
            <option value="hospital">Hospital</option>
            <option value="medical_center">Centro Médico</option>
            <option value="private_practice">Consultorio Privado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Phone className="h-4 w-4 inline mr-1" />
            Teléfono
          </label>
          <input
            type="tel"
            value={clinicData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Mail className="h-4 w-4 inline mr-1" />
            Email
          </label>
          <input
            type="email"
            value={clinicData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Globe className="h-4 w-4 inline mr-1" />
            Sitio Web
          </label>
          <input
            type="url"
            value={clinicData.website}
            onChange={(e) => updateField('website', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Hash className="h-4 w-4 inline mr-1" />
            RFC/Tax ID
          </label>
          <input
            type="text"
            value={clinicData.tax_id}
            onChange={(e) => updateField('tax_id', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <MapPin className="h-4 w-4 inline mr-1" />
            Dirección Completa
          </label>
          <textarea
            value={clinicData.address}
            onChange={(e) => updateField('address', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Director Médico
          </label>
          <input
            type="text"
            value={clinicData.director_name}
            onChange={(e) => updateField('director_name', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <FileText className="h-4 w-4 inline mr-1" />
            Cédula del Director
          </label>
          <input
            type="text"
            value={clinicData.director_license}
            onChange={(e) => updateField('director_license', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleSettings({ 
  clinicData, 
  updateField 
}: { 
  clinicData: ClinicData; 
  updateField: (field: keyof ClinicData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Horarios de Atención</h2>
      <p className="text-gray-400">
        Configuración de horarios próximamente disponible.
      </p>
    </div>
  );
}

function BillingSettings({ 
  clinicData, 
  updateField 
}: { 
  clinicData: ClinicData; 
  updateField: (field: keyof ClinicData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Facturación y Pagos</h2>
      <p className="text-gray-400">
        Configuración de facturación próximamente disponible.
      </p>
    </div>
  );
}

function NotificationSettings({ 
  clinicData, 
  updateField 
}: { 
  clinicData: ClinicData; 
  updateField: (field: keyof ClinicData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Preferencias de Notificaciones</h2>
      <p className="text-gray-400">
        Configuración de notificaciones próximamente disponible.
      </p>
    </div>
  );
}
