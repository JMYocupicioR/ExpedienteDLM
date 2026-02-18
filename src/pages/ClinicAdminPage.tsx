import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';
import { Users, Building, Shield, Settings, UserCheck, Activity, DoorOpen, Upload, Loader2, ImageIcon } from 'lucide-react';
import PatientsList from '@/pages/PatientsList';
import ClinicStaffManagement from '@/components/ClinicStaffManagement';
import ClinicDashboardOverview from '@/components/clinic-admin/ClinicDashboardOverview';
import RoomManagement from '@/components/clinic-admin/RoomManagement';

export default function ClinicAdminPage() {
  const { activeClinic, userClinics } = useClinic();
  const { getClinicLogoUrl } = useProfilePhotos();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'pacientes' | 'staff' | 'consultorios' | 'invite' | 'details' | 'subscription'>('resumen');

  useEffect(() => {
    const resolvedClinicId = activeClinic?.id ?? null;
    setClinicId(resolvedClinicId);

    if (resolvedClinicId) {
      const membership = userClinics?.find((m) => m.clinic_id === resolvedClinicId);
      const isAdminRole = membership?.role === 'admin' || membership?.role === 'owner' || membership?.role === 'director';
      setIsAdmin(!!isAdminRole);

      getClinicLogoUrl(resolvedClinicId).then(setClinicLogoUrl).catch(() => {});
    }
  }, [activeClinic?.id, userClinics, getClinicLogoUrl]);

  const renderTabs = () => (
    <div className="flex space-x-2 border-b border-gray-700 mb-6 overflow-x-auto">
      {[
        { key: 'resumen', label: 'Resumen', icon: Activity, requiredAdmin: false },
        { key: 'pacientes', label: 'Pacientes', icon: UserCheck, requiredAdmin: false },
        { key: 'staff', label: 'Personal', icon: Users, requiredAdmin: true },
        { key: 'consultorios', label: 'Consultorios', icon: DoorOpen, requiredAdmin: true },
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
          <div className="flex items-center gap-4">
            {clinicLogoUrl ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-gray-600 bg-gray-700 flex-shrink-0">
                <img src={clinicLogoUrl} alt="Logo clínica" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 border-gray-600 bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Building className="h-7 w-7 text-gray-500" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-cyan-400" />
                Administración de la Clínica
              </h1>
              {activeClinic?.name && (
                <p className="text-sm text-gray-400 mt-0.5">{activeClinic.name}</p>
              )}
            </div>
          </div>
        </div>
        {renderTabs()}

        {activeTab === 'resumen' && <ClinicDashboardOverview clinicId={clinicId} />}

        {activeTab === 'pacientes' && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
            <PatientsList />
          </div>
        )}
        
        {activeTab === 'staff' && isAdmin && <ClinicStaffManagement clinicId={clinicId} />}
        {activeTab === 'consultorios' && isAdmin && <RoomManagement clinicId={clinicId} />}
        {activeTab === 'details' && <ClinicDetailsForm clinicId={clinicId} readOnly={!isAdmin} />}
        {activeTab === 'subscription' && <SubscriptionPanel clinicId={clinicId} />}
      </div>
    </div>
  );
}





function ClinicDetailsForm({ clinicId, readOnly = false }: { clinicId: string; readOnly?: boolean }) {
  const { uploadClinicLogo } = useProfilePhotos();
  const [details, setDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;

    try {
      setLogoUploading(true);
      setNotification(null);
      const result = await uploadClinicLogo(clinicId, file);
      if (result.error) throw new Error(result.error);
      if (result.url) {
        setDetails((d: any) => ({ ...d, logo_url: result.url }));
        setNotification({ type: 'success', message: 'Logo actualizado correctamente' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al subir el logo' });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

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

      {/* Logo de la Clínica */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-cyan-400" />
          Logo Público de la Clínica
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {details.logo_url ? (
              <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-600 bg-gray-700">
                <img
                  src={details.logo_url}
                  alt="Logo de la clínica"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-600 bg-gray-700/50 flex flex-col items-center justify-center">
                <Building className="h-10 w-10 text-gray-500 mb-1" />
                <span className="text-xs text-gray-500">Sin logo</span>
              </div>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center cursor-pointer"
              >
                {logoUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-white" />
                )}
              </button>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300 mb-2">
              Este logo aparecerá en recetas, documentos y el perfil público de tu clínica.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Formatos: JPG, PNG, WebP o SVG. Tamaño máximo: 5MB.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {logoUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="h-4 w-4" /> {details.logo_url ? 'Cambiar logo' : 'Subir logo'}</>
                )}
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
      
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


