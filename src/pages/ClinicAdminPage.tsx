import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Building, Shield, Settings, UserCheck, Activity } from 'lucide-react';
import PatientsList from '@/pages/PatientsList';
import ClinicStaffManagement from '@/components/ClinicStaffManagement';
import ClinicDashboardOverview from '@/components/clinic-admin/ClinicDashboardOverview';

export default function ClinicAdminPage() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'pacientes' | 'staff' | 'invite' | 'details' | 'subscription'>('resumen');

  useEffect(() => {
    const loadContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener clinic_id del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single();

      const currentClinicId = profile?.clinic_id ?? null;
      setClinicId(currentClinicId);

      // Verificar si es admin de clínica mediante relación
      if (currentClinicId) {
        const { data: rel } = await supabase
          .from('clinic_user_relationships')
          .select('role_in_clinic')
          .eq('user_id', user.id)
          .eq('clinic_id', currentClinicId)
          .eq('is_active', true)
          .maybeSingle();

        const role = rel?.role_in_clinic;
        // Roles considerados administrativos
        const adminRoles = ['owner', 'director', 'admin_staff'];
        const isClinicAdmin = adminRoles.includes(role) || profile?.role === 'super_admin';
        
        setIsAdmin(isClinicAdmin);
      }
    };
    loadContext();
  }, []);

  const renderTabs = () => (
    <div className="flex space-x-2 border-b border-gray-700 mb-6 overflow-x-auto">
      {[
        { key: 'resumen', label: 'Resumen', icon: Activity, requiredAdmin: false },
        { key: 'pacientes', label: 'Pacientes', icon: UserCheck, requiredAdmin: false },
        { key: 'staff', label: 'Personal', icon: Users, requiredAdmin: true },
        // Invite tab removed in favor of modal in StaffManagement
        { key: 'details', label: 'Detalles', icon: Building, requiredAdmin: false },
        { key: 'subscription', label: 'Suscripción', icon: Shield, requiredAdmin: true },
      ]
      .filter(tab => !tab.requiredAdmin || isAdmin)
      .map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key as any)}
          className={`px-4 py-2 border-b-2 whitespace-nowrap ${activeTab === key ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-300'} flex items-center space-x-2 transition-colors`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  // ... (Active checks remain same)

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center"><Settings className="h-6 w-6 mr-2" /> Administración de la Clínica</h1>
        </div>
        {renderTabs()}

        {activeTab === 'resumen' && <ClinicDashboardOverview clinicId={clinicId} />}

        {activeTab === 'pacientes' && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
            <PatientsList />
          </div>
        )}
        
        {activeTab === 'staff' && isAdmin && <ClinicStaffManagement clinicId={clinicId} />}
        {activeTab === 'details' && <ClinicDetailsForm clinicId={clinicId} readOnly={!isAdmin} />}
        {activeTab === 'subscription' && <SubscriptionPanel clinicId={clinicId} />}
      </div>
    </div>
  );
}





function ClinicDetailsForm({ clinicId, readOnly = false }: { clinicId: string; readOnly?: boolean }) {
  const [details, setDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', clinicId)
          .single();
        
        if (error) throw error;
        setDetails(data);
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clinicId]);

  const handleSave = async () => {
    if (!details) return;
    setSaving(true);
    setNotification(null);
    
    try {
      const updateData = {
        name: details.name || '',
        type: details.type || 'general',
        address: details.address || '',
        phone: details.phone || '',
        email: details.email || '',
        website: details.website || '',
        tax_id: details.tax_id || '',
        director_name: details.director_name || '',
        director_license: details.director_license || '',
        business_hours: details.business_hours || {},
        services_offered: details.services_offered || [],
        insurance_accepted: details.insurance_accepted || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clinics')
        .update(updateData)
        .eq('id', clinicId);
        
      if (error) throw error;
      
      setNotification({ type: 'success', message: 'Datos de la clínica actualizados correctamente' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400">Cargando información de la clínica...</div>;
  if (!details) return <div className="text-red-400">No se pudieron cargar los datos de la clínica</div>;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
      {notification && (
        <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {notification.message}
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre de la Clínica *" value={details.name} onChange={v => setDetails((d:any) => ({...d, name: v}))} required />
          <div>
            <label className="block text-sm text-gray-300 mb-1">Tipo de Clínica *</label>
            <select 
              value={details.type || 'general'} 
              onChange={e => setDetails((d:any) => ({...d, type: e.target.value}))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="general">Clínica General</option>
              <option value="specialty">Clínica de Especialidad</option>
              <option value="hospital">Hospital</option>
              <option value="medical_center">Centro Médico</option>
              <option value="private_practice">Consultorio Privado</option>
            </select>
          </div>
          <Field label="RFC/Tax ID" value={details.tax_id} onChange={v => setDetails((d:any) => ({...d, tax_id: v}))} />
          <Field label="Teléfono Principal" value={details.phone} onChange={v => setDetails((d:any) => ({...d, phone: v}))} />
          <Field label="Email de Contacto" value={details.email} onChange={v => setDetails((d:any) => ({...d, email: v}))} />
          <Field label="Sitio Web" value={details.website} onChange={v => setDetails((d:any) => ({...d, website: v}))} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Dirección</h3>
        <Field label="Dirección Completa" value={details.address} onChange={v => setDetails((d:any) => ({...d, address: v}))} textarea />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Director Médico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre del Director" value={details.director_name} onChange={v => setDetails((d:any) => ({...d, director_name: v}))} />
          <Field label="Cédula Profesional" value={details.director_license} onChange={v => setDetails((d:any) => ({...d, director_license: v}))} />
        </div>
      </div>



      {!readOnly && (
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleSave} 
            disabled={saving || !details.name} 
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {!details.name && (
            <span className="text-red-400 text-sm">* El nombre de la clínica es requerido</span>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionPanel({ clinicId }: { clinicId: string }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="text-gray-300">Administración de suscripción (próximamente).</div>
    </div>
  );
}

function Field({ label, value, onChange, required, textarea }: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className={textarea ? 'md:col-span-2' : ''}>
      <label className="block text-sm text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {textarea ? (
        <textarea 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
        />
      ) : (
        <input 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent" 
        />
      )}
    </div>
  );
}


