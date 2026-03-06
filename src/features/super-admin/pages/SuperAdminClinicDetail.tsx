import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { ArrowLeft, Bell, Building2, CheckCircle, Globe, Mail, Save, Settings, Trash2, Upload, UserPlus, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AddMemberModal from '../components/AddMemberModal';
import { ClinicStaffService } from '@/lib/services/clinic-staff-service';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';

type ClinicRow = Database['public']['Tables']['clinics']['Row'];
type ClinicRelationshipRow = Database['public']['Tables']['clinic_user_relationships']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type NotificationSettings = {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  whatsapp_enabled?: boolean;
  appointment_reminders?: boolean;
  reminder_hours_before?: number;
};

type ClinicConfigRow = {
  id?: string;
  clinic_id: string;
  timezone: string;
  language: string;
  currency: string;
  default_consultation_duration: number;
  max_patients_per_day: number;
  enable_teleconsultation: boolean;
  enable_emergency_mode: boolean;
  theme_color: string;
  logo_url?: string | null;
  buffer_time_minutes?: number;
  require_diagnosis?: boolean;
  require_physical_exam?: boolean;
  enable_electronic_prescription?: boolean;
  require_patient_consent?: boolean;
  notification_settings?: NotificationSettings;
  data_retention_days?: number;
  enable_audit_log?: boolean;
  enable_billing?: boolean;
  tax_rate?: number;
};

type TabId = 'info' | 'members';

type ClinicFormValues = {
  name: string;
  address: string;
  type: string;
  is_active: boolean;
  phone: string;
  email: string;
  website: string;
  description: string;
  timezone: string;
  language: string;
  currency: string;
  default_consultation_duration: number;
  max_patients_per_day: number;
  enable_teleconsultation: boolean;
  enable_emergency_mode: boolean;
  theme_color: string;
  logo_url: string;
  buffer_time_minutes: number;
  require_diagnosis: boolean;
  require_physical_exam: boolean;
  enable_electronic_prescription: boolean;
  require_patient_consent: boolean;
  notification_settings: NotificationSettings;
  data_retention_days: number;
  enable_audit_log: boolean;
  enable_billing: boolean;
  tax_rate: number;
};

type MemberRow = ClinicRelationshipRow & {
  profiles: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'role'> | null;
};

const ROLE_OPTIONS = ['owner', 'director', 'admin_staff', 'doctor', 'nurse', 'staff', 'administrative_assistant'];
const ADMIN_ROLES = new Set(['owner', 'director', 'admin_staff']);

function roleBadgeClasses(role: string) {
  if (role === 'owner') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
  if (role === 'director') return 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20';
  if (role === 'admin_staff') return 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
  if (role === 'doctor') return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
  if (role === 'administrative_assistant') return 'bg-amber-600/20 text-amber-200 border border-amber-500/30';
  return 'bg-gray-600/20 text-gray-200 border border-gray-500/20';
}

function statusBadgeClasses(status: string) {
  if (status === 'approved') return 'bg-green-500/10 text-green-300 border border-green-500/20';
  if (status === 'rejected') return 'bg-red-500/10 text-red-300 border border-red-500/20';
  return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
}

export default function SuperAdminClinicDetail() {
  const navigate = useNavigate();
  const { clinicId } = useParams<{ clinicId: string }>();
  const { uploadClinicLogo } = useProfilePhotos();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [formValues, setFormValues] = useState<ClinicFormValues>({
    name: '',
    address: '',
    type: 'clinic',
    is_active: true,
    phone: '',
    email: '',
    website: '',
    description: '',
    timezone: 'America/Mexico_City',
    language: 'es',
    currency: 'MXN',
    default_consultation_duration: 30,
    max_patients_per_day: 20,
    enable_teleconsultation: false,
    enable_emergency_mode: false,
    theme_color: '#3B82F6',
    logo_url: '',
    buffer_time_minutes: 5,
    require_diagnosis: true,
    require_physical_exam: false,
    enable_electronic_prescription: false,
    require_patient_consent: true,
    notification_settings: {
      email_enabled: true,
      sms_enabled: false,
      whatsapp_enabled: false,
      appointment_reminders: true,
      reminder_hours_before: 24,
    },
    data_retention_days: 3650,
    enable_audit_log: true,
    enable_billing: false,
    tax_rate: 16,
  });
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !clinicId) return;
      try {
        setLogoUploading(true);
        const { url, error } = await uploadClinicLogo(clinicId, file);
        if (error) {
          alert(error);
          return;
        }
        if (url) {
          setFormValues((p) => ({ ...p, logo_url: url }));
          const { error: configError } = await supabase
            .from('clinic_configurations')
            .update({ logo_url: url })
            .eq('clinic_id', clinicId);
          if (configError) throw configError;
        }
      } catch (err) {
        alert((err as Error)?.message || 'Error al subir el logo');
      } finally {
        setLogoUploading(false);
        e.target.value = '';
      }
    },
    [clinicId, uploadClinicLogo]
  );

  const loadMembers = useCallback(async () => {
    if (!clinicId) return;

    try {
      setMembersLoading(true);
      const { data, error } = await supabase
        .from('clinic_user_relationships')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            role
          )
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMembers((data as MemberRow[]) || []);
    } catch (error) {
      console.error('Error loading clinic members:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [clinicId]);

  const loadData = useCallback(async () => {
    if (!clinicId) return;

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.role !== 'super_admin') {
        setAccessDenied(true);
        return;
      }

      const { data: clinicData, error } = await supabase.from('clinics').select('*').eq('id', clinicId).single();
      if (error) throw error;

      const { data: configData } = await supabase
        .from('clinic_configurations')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle();

      const c = clinicData as Record<string, unknown>;
      const cfg = (configData || {}) as ClinicConfigRow;

      setClinic(clinicData as ClinicRow);
      setFormValues({
        name: (c?.name as string) || '',
        address: (c?.address as string) || '',
        type: (c?.type as string) || 'clinic',
        is_active: (c?.is_active as boolean) ?? true,
        phone: (c?.phone as string) || '',
        email: (c?.email as string) || '',
        website: (c?.website as string) || '',
        description: (c?.description as string) || '',
        timezone: cfg?.timezone || 'America/Mexico_City',
        language: cfg?.language || 'es',
        currency: cfg?.currency || 'MXN',
        default_consultation_duration: cfg?.default_consultation_duration ?? 30,
        max_patients_per_day: cfg?.max_patients_per_day ?? 20,
        enable_teleconsultation: cfg?.enable_teleconsultation ?? false,
        enable_emergency_mode: cfg?.enable_emergency_mode ?? false,
        theme_color: cfg?.theme_color || '#3B82F6',
        logo_url: (cfg?.logo_url as string) || (c?.logo_url as string) || '',
        buffer_time_minutes: cfg?.buffer_time_minutes ?? 5,
        require_diagnosis: cfg?.require_diagnosis ?? true,
        require_physical_exam: cfg?.require_physical_exam ?? false,
        enable_electronic_prescription: cfg?.enable_electronic_prescription ?? false,
        require_patient_consent: cfg?.require_patient_consent ?? true,
        notification_settings: (cfg?.notification_settings as NotificationSettings) || {
          email_enabled: true,
          sms_enabled: false,
          whatsapp_enabled: false,
          appointment_reminders: true,
          reminder_hours_before: 24,
        },
        data_retention_days: cfg?.data_retention_days ?? 3650,
        enable_audit_log: cfg?.enable_audit_log ?? true,
        enable_billing: cfg?.enable_billing ?? false,
        tax_rate: Number(cfg?.tax_rate) || 16,
      });

      await loadMembers();
    } catch (error) {
      console.error('Error loading clinic detail:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, loadMembers, navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveClinic = async () => {
    if (!clinicId) return;
    if (!formValues.name.trim()) {
      alert('El nombre de la clínica es obligatorio.');
      return;
    }

    try {
      setSavingClinic(true);

      const clinicPayload: Record<string, unknown> = {
        name: formValues.name.trim(),
        address: formValues.address.trim() || null,
        type: formValues.type,
        is_active: formValues.is_active,
        phone: formValues.phone.trim() || null,
        email: formValues.email.trim() || null,
        website: formValues.website.trim() || null,
        description: formValues.description.trim() || null,
      };

      const { error: clinicError } = await supabase.from('clinics').update(clinicPayload).eq('id', clinicId);
      if (clinicError) throw clinicError;

      const configPayload = {
        clinic_id: clinicId,
        timezone: formValues.timezone,
        language: formValues.language,
        currency: formValues.currency,
        default_consultation_duration: Math.max(1, formValues.default_consultation_duration),
        max_patients_per_day: Math.max(1, formValues.max_patients_per_day),
        enable_teleconsultation: formValues.enable_teleconsultation,
        enable_emergency_mode: formValues.enable_emergency_mode,
        theme_color: formValues.theme_color,
        logo_url: formValues.logo_url.trim() || null,
        buffer_time_minutes: Math.max(0, formValues.buffer_time_minutes),
        require_diagnosis: formValues.require_diagnosis,
        require_physical_exam: formValues.require_physical_exam,
        enable_electronic_prescription: formValues.enable_electronic_prescription,
        require_patient_consent: formValues.require_patient_consent,
        notification_settings: formValues.notification_settings,
        data_retention_days: Math.max(365, formValues.data_retention_days),
        enable_audit_log: formValues.enable_audit_log,
        enable_billing: formValues.enable_billing,
        tax_rate: formValues.tax_rate,
      };

      const { error: configError } = await supabase
        .from('clinic_configurations')
        .upsert(configPayload, { onConflict: 'clinic_id' });
      if (configError) throw configError;

      setClinic((prev) =>
        prev ? { ...prev, ...clinicPayload, name: formValues.name.trim(), address: formValues.address.trim() || null } : prev
      );
      alert('Datos de clínica actualizados correctamente.');
    } catch (error) {
      console.error('Error updating clinic:', error);
      alert('No se pudo actualizar la información de la clínica.');
    } finally {
      setSavingClinic(false);
    }
  };

  const handleChangeMemberRole = async (relationshipId: string, nextRole: string) => {
    try {
      const { error } = await supabase
        .from('clinic_user_relationships')
        .update({
          role_in_clinic:
            nextRole as Database['public']['Tables']['clinic_user_relationships']['Update']['role_in_clinic'],
        })
        .eq('id', relationshipId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((member) =>
          member.id === relationshipId ? { ...member, role_in_clinic: nextRole as MemberRow['role_in_clinic'] } : member
        )
      );
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('No se pudo actualizar el rol del usuario.');
    }
  };

  const handleRemoveMember = async (relationshipId: string) => {
    const confirmDelete = window.confirm('¿Seguro que deseas quitar este miembro de la clínica?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('clinic_user_relationships').delete().eq('id', relationshipId);
      if (error) throw error;
      setMembers((prev) => prev.filter((member) => member.id !== relationshipId));
    } catch (error) {
      console.error('Error removing member from clinic:', error);
      alert('No se pudo eliminar al miembro de la clínica.');
    }
  };

  const handleApproveMember = async (userId: string) => {
    if (!clinicId) return;
    try {
      const result = await ClinicStaffService.approveUser(userId, clinicId);
      if (result.success) {
        await loadMembers();
      } else {
        alert(result.message || 'No se pudo aprobar la solicitud.');
      }
    } catch (error) {
      console.error('Error approving member:', error);
      alert('No se pudo aprobar la solicitud.');
    }
  };

  const existingUserIds = useMemo(() => members.map((member) => member.user_id), [members]);
  const adminCount = useMemo(
    () => members.filter((member) => ADMIN_ROLES.has(member.role_in_clinic)).length,
    [members]
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando detalle de clínica...</div>;
  }

  if (accessDenied) {
    return (
      <div className="p-8 text-center text-red-300">
        Acceso restringido. Este módulo está disponible solo para super administradores.
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-8 text-center text-gray-400">
        No se encontró la clínica solicitada.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1218] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/super-admin')}
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al panel super admin
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg border border-gray-700 bg-[#11151F] overflow-hidden flex items-center justify-center">
                {formValues.logo_url ? (
                  <img
                    src={formValues.logo_url}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const next = (e.target as HTMLImageElement).nextElementSibling;
                      if (next) (next as HTMLElement).classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Building2 className={`h-6 w-6 text-cyan-400 ${formValues.logo_url ? 'hidden' : ''}`} aria-hidden />
              </div>
              {clinic.name}
            </h1>
            <p className="text-sm text-gray-400">
              Gestiona información general, administradores y personal asociado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A1F2B] border border-gray-800 rounded-lg px-4 py-3">
              <div className="text-xs text-gray-400">Miembros totales</div>
              <div className="text-xl font-semibold">{members.length}</div>
            </div>
            <div className="bg-[#1A1F2B] border border-gray-800 rounded-lg px-4 py-3">
              <div className="text-xs text-gray-400">Admins de clínica</div>
              <div className="text-xl font-semibold">{adminCount}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-b border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Información
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Personal
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="bg-[#1A1F2B] border border-gray-800 rounded-xl p-6 space-y-8">
            {/* Datos básicos */}
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4">
                <Building2 className="h-4 w-4" />
                Datos básicos
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Nombre de clínica</label>
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Tipo</label>
                  <select
                    value={formValues.type}
                    onChange={(e) => setFormValues((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="clinic">Clínica</option>
                    <option value="consultorio_personal">Consultorio personal</option>
                    <option value="hospital">Hospital</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-2">Dirección</label>
                  <input
                    type="text"
                    value={formValues.address}
                    onChange={(e) => setFormValues((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Dirección completa"
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Teléfono</label>
                  <input
                    type="text"
                    value={formValues.phone}
                    onChange={(e) => setFormValues((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Ej. 999 123 4567"
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Correo</label>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setFormValues((p) => ({ ...p, email: e.target.value }))}
                    placeholder="contacto@clinica.com"
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Sitio web</label>
                  <input
                    type="url"
                    value={formValues.website}
                    onChange={(e) => setFormValues((p) => ({ ...p, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Activa</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.is_active}
                      onChange={(e) => setFormValues((p) => ({ ...p, is_active: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Clínica activa</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-2">Descripción</label>
                  <textarea
                    value={formValues.description}
                    onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Breve descripción de la clínica"
                    rows={3}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Configuración operativa */}
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4">
                <Settings className="h-4 w-4" />
                Configuración operativa
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Zona horaria</label>
                  <select
                    value={formValues.timezone}
                    onChange={(e) => setFormValues((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="America/Tijuana">America/Tijuana</option>
                    <option value="America/Monterrey">America/Monterrey</option>
                    <option value="America/Cancun">America/Cancun</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Idioma</label>
                  <select
                    value={formValues.language}
                    onChange={(e) => setFormValues((p) => ({ ...p, language: e.target.value }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Moneda</label>
                  <select
                    value={formValues.currency}
                    onChange={(e) => setFormValues((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Duración consulta (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={formValues.default_consultation_duration}
                    onChange={(e) => setFormValues((p) => ({ ...p, default_consultation_duration: parseInt(e.target.value, 10) || 30 }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Pacientes máx. por día</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={formValues.max_patients_per_day}
                    onChange={(e) => setFormValues((p) => ({ ...p, max_patients_per_day: parseInt(e.target.value, 10) || 20 }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Tiempo de buffer (min)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={formValues.buffer_time_minutes}
                    onChange={(e) => setFormValues((p) => ({ ...p, buffer_time_minutes: parseInt(e.target.value, 10) || 5 }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.enable_teleconsultation}
                      onChange={(e) => setFormValues((p) => ({ ...p, enable_teleconsultation: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Teleconsulta</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.enable_emergency_mode}
                      onChange={(e) => setFormValues((p) => ({ ...p, enable_emergency_mode: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Modo emergencia</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formValues.require_diagnosis}
                      onChange={(e) => setFormValues((p) => ({ ...p, require_diagnosis: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Requerir diagnóstico</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formValues.require_physical_exam}
                      onChange={(e) => setFormValues((p) => ({ ...p, require_physical_exam: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Requerir expl. física</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formValues.enable_electronic_prescription}
                      onChange={(e) => setFormValues((p) => ({ ...p, enable_electronic_prescription: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Receta electrónica</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Apariencia y facturación */}
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4">
                <Globe className="h-4 w-4" />
                Apariencia y facturación
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Color del tema</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={formValues.theme_color}
                      onChange={(e) => setFormValues((p) => ({ ...p, theme_color: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border border-gray-700 bg-[#11151F]"
                    />
                    <input
                      type="text"
                      value={formValues.theme_color}
                      onChange={(e) => setFormValues((p) => ({ ...p, theme_color: e.target.value }))}
                      className="flex-1 bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-2">Logo de la clínica</label>
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg border border-gray-700 bg-[#11151F] overflow-hidden flex items-center justify-center">
                      {formValues.logo_url ? (
                        <img
                          src={formValues.logo_url}
                          alt="Logo de la clínica"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Building2 className="w-10 h-10 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-50 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          {logoUploading ? 'Subiendo...' : 'Subir logo'}
                        </button>
                      </div>
                      <input
                        type="url"
                        value={formValues.logo_url}
                        onChange={(e) => setFormValues((p) => ({ ...p, logo_url: e.target.value }))}
                        placeholder="O ingresar URL manualmente..."
                        className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Retención datos (días)</label>
                  <input
                    type="number"
                    min={365}
                    value={formValues.data_retention_days}
                    onChange={(e) => setFormValues((p) => ({ ...p, data_retention_days: parseInt(e.target.value, 10) || 3650 }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.enable_audit_log}
                      onChange={(e) => setFormValues((p) => ({ ...p, enable_audit_log: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Bitácora de auditoría</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formValues.require_patient_consent}
                      onChange={(e) => setFormValues((p) => ({ ...p, require_patient_consent: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Consentimiento informado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={formValues.enable_billing}
                      onChange={(e) => setFormValues((p) => ({ ...p, enable_billing: e.target.checked }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Facturación habilitada</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">IVA (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formValues.tax_rate}
                    onChange={(e) => setFormValues((p) => ({ ...p, tax_rate: parseFloat(e.target.value) || 16 }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Notificaciones */}
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4">
                <Bell className="h-4 w-4" />
                Notificaciones
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col justify-start gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.notification_settings?.email_enabled ?? true}
                      onChange={(e) => setFormValues((p) => ({ ...p, notification_settings: { ...p.notification_settings, email_enabled: e.target.checked } }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Notificaciones por correo</span>
                  </label>
                </div>
                <div className="flex flex-col justify-start gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.notification_settings?.sms_enabled ?? false}
                      onChange={(e) => setFormValues((p) => ({ ...p, notification_settings: { ...p.notification_settings, sms_enabled: e.target.checked } }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Notificaciones por SMS</span>
                  </label>
                </div>
                <div className="flex flex-col justify-start gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues.notification_settings?.appointment_reminders ?? true}
                      onChange={(e) => setFormValues((p) => ({ ...p, notification_settings: { ...p.notification_settings, appointment_reminders: e.target.checked } }))}
                      className="rounded border-gray-600 bg-[#11151F] text-cyan-500 focus:ring-cyan-500/40"
                    />
                    <span className="text-sm text-gray-300">Recordatorios de citas autom.</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Recordatorio antes de (horas)</label>
                  <input
                    type="number"
                    min={1}
                    value={formValues.notification_settings?.reminder_hours_before ?? 24}
                    onChange={(e) => setFormValues((p) => ({ ...p, notification_settings: { ...p.notification_settings, reminder_hours_before: parseInt(e.target.value, 10) || 24 } }))}
                    className="w-full bg-[#11151F] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-500">
                ID de clínica: <span className="font-mono">{clinic.id}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveClinic}
                disabled={savingClinic}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Save className="h-4 w-4" />
                {savingClinic ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1F2B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Personal asociado
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Controla administradores y médicos de esta clínica.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAddMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Agregar miembro
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="p-4 font-medium">Usuario</th>
                    <th className="p-4 font-medium">Rol en clínica</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {membersLoading && (
                    <tr>
                      <td className="p-4 text-gray-400 text-sm" colSpan={4}>
                        Cargando miembros...
                      </td>
                    </tr>
                  )}

                  {!membersLoading && members.length === 0 && (
                    <tr>
                      <td className="p-4 text-gray-500 text-sm" colSpan={4}>
                        Esta clínica aún no tiene personal asociado.
                      </td>
                    </tr>
                  )}

                  {!membersLoading &&
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium text-white">
                              {member.profiles?.full_name || 'Usuario sin nombre'}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.profiles?.email || 'Sin correo'}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Rol global: {member.profiles?.role || 'sin definir'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2 max-w-[220px]">
                            <span className={`inline-flex self-start px-2 py-1 rounded text-xs ${roleBadgeClasses(member.role_in_clinic)}`}>
                              {member.role_in_clinic}
                            </span>
                            <select
                              value={member.role_in_clinic}
                              onChange={(event) =>
                                void handleChangeMemberRole(member.id, event.target.value)
                              }
                              className="bg-[#11151F] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs ${statusBadgeClasses(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => void handleApproveMember(member.user_id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-500/10 text-green-300 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Aceptar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleRemoveMember(member.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Quitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddMemberModal
        isOpen={addMemberModalOpen}
        clinicId={clinic.id}
        existingUserIds={existingUserIds}
        onClose={() => setAddMemberModalOpen(false)}
        onMemberAdded={loadMembers}
      />
    </div>
  );
}
