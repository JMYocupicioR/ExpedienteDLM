import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Award, Calendar, Phone, Mail, MapPin, 
  Stethoscope, Users, Building, FileText, Star, 
  Edit3, Save, X, DoorOpen, Clock,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';
import { EnhancedProfile, Clinic } from '@/lib/database.types';
import PhotoUploader from '@/components/shared/PhotoUploader';
import MedicalStatsCard from '@/components/MedicalStatsCard';
import ActivityFeed from '@/components/shared/ActivityFeed';
import ClinicStatusCard from '@/components/ClinicStatusCard';

type ProfileWithAssociations = EnhancedProfile & {
  clinic?: {
    id: string;
    name: string;
    type: string;
    address?: string;
    phone?: string;
  } | null;
  specialty?: {
    name: string;
    category: string;
    description?: string;
  } | null;
};

interface ProfileStats {
  totalPatients: number;
  totalConsultations: number;
  totalPrescriptions: number;
  monthlyConsultations: number;
  averageRating: number;
  experienceYears: number;
}

interface RecentActivity {
  id: string;
  type: 'consultation' | 'prescription' | 'patient_created';
  title: string;
  description: string;
  date: string;
  patientName?: string;
}

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function PhysicalPresenceScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: Array<{ day: number; start: string; end: string }>;
  onChange: (s: Array<{ day: number; start: string; end: string }>) => void;
}) {
  const updateSlot = (day: number, start: string, end: string) => {
    const rest = schedule.filter((s) => s.day !== day);
    if (start && end) {
      onChange([...rest, { day, start, end }].sort((a, b) => a.day - b.day));
    } else {
      onChange(rest);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
      <p className="text-sm text-gray-400">Define tu horario de presencia física en el consultorio</p>
      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const slot = schedule.find((s) => s.day === day);
        return (
          <div key={day} className="flex items-center gap-3 flex-wrap">
            <span className="w-24 text-sm text-gray-400">{DAY_LABELS[day]}</span>
            <input
              type="time"
              value={slot?.start || ''}
              onChange={(e) => updateSlot(day, e.target.value, slot?.end || '')}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            />
            <span className="text-gray-500">-</span>
            <input
              type="time"
              value={slot?.end || ''}
              onChange={(e) => updateSlot(day, slot?.start || '', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        );
      })}
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    uploadProfilePhoto, 
    uploadPrescriptionIcon, 
    deleteProfilePhoto, 
    deletePrescriptionIcon,
    getProfilePhotoUrl,
    getPrescriptionIconUrl 
  } = useProfilePhotos();
  
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile data
  const [profileData, setProfileData] = useState<ProfileWithAssociations | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [prescriptionIcon, setPrescriptionIcon] = useState<string | null>(null);

  // Clinic management
  const [availableClinics, setAvailableClinics] = useState<Clinic[]>([]);
  const [isIndependentDoctor, setIsIndependentDoctor] = useState(false);

  // Statistics and activity
  const [stats, setStats] = useState<ProfileStats>({
    totalPatients: 0,
    totalConsultations: 0,
    totalPrescriptions: 0,
    monthlyConsultations: 0,
    averageRating: 0,
    experienceYears: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Form data for editing
  const [editData, setEditData] = useState({
    full_name: '',
    phone: '',
    address: '',
    bio: '',
    consultation_fee: '',
    languages: '',
    certifications: '',
    awards: '',
    emergency_contact: '',
    clinic_id: null as string | null,
    is_independent: false,
    primary_room_id: null as string | null,
    accepts_appointments: true,
    physical_presence_schedule: [] as Array<{ day: number; start: string; end: string }>,
  });

  // Rooms and assignments for doctors with clinic
  const [availableRooms, setAvailableRooms] = useState<Array<{ id: string; room_number: string; room_name: string | null; floor: string | null }>>([]);
  const [myRoomAssignments, setMyRoomAssignments] = useState<Array<{ room_id: string; is_primary: boolean }>>([]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadUserProfile(user.id);
    }
    // La protección de ruta en App.tsx redirige automáticamente si no hay usuario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const loadUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load profile with plain select only (no embeds) - avoids FK/schema mismatches
      // (specialty_id/clinic_id embeds can fail if FKs or tables don't exist)
      const { data: rawProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!rawProfile) {
        setError('Perfil no encontrado');
        setProfileData(null);
        setLoading(false);
        return;
      }

      const enhancedProfile = rawProfile as Record<string, unknown>;
      const addInfo = (enhancedProfile.additional_info || {}) as Record<string, unknown>;

      // Optionally fetch clinic when clinic_id exists (separate query, no embed)
      let clinic: ProfileWithAssociations['clinic'] = null;
      if (enhancedProfile?.clinic_id) {
        try {
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('id, name, type, address, phone')
            .eq('id', enhancedProfile.clinic_id)
            .maybeSingle();
          clinic = clinicData || null;
        } catch {
          clinic = null;
        }
      }

      setProfileData({
        ...enhancedProfile,
        clinic,
        // specialty: profiles has string column; ProfileWithAssociations expects object with .name
        specialty: (enhancedProfile as any)?.specialty
          ? typeof (enhancedProfile as any).specialty === 'object'
            ? (enhancedProfile as any).specialty
            : { name: (enhancedProfile as any).specialty, category: '', description: '' }
          : null
      } as ProfileWithAssociations);

      // Determine if user is independent doctor
      const isIndependent = !enhancedProfile.clinic_id;
      setIsIndependentDoctor(isIndependent);

      const acceptsAppointments = (enhancedProfile.accepts_appointments ?? addInfo?.accepts_appointments) !== false;
      const physSchedule = (enhancedProfile.physical_presence_schedule ?? addInfo?.physical_presence_schedule ?? []) as Array<{ day: number; start: string; end: string }>;

      setEditData({
        full_name: String(enhancedProfile.full_name || ''),
        phone: String(enhancedProfile.phone || ''),
        address: String(addInfo?.address || ''),
        bio: String(addInfo?.bio || ''),
        consultation_fee: String(addInfo?.consultation_fee || ''),
        languages: Array.isArray(addInfo?.languages) ? (addInfo.languages as string[]).join(', ') : '',
        certifications: Array.isArray(addInfo?.certifications) ? (addInfo.certifications as string[]).join(', ') : '',
        awards: Array.isArray(addInfo?.awards) ? (addInfo.awards as string[]).join(', ') : '',
        emergency_contact: String(addInfo?.emergency_contact || ''),
        clinic_id: (enhancedProfile.clinic_id as string) || null,
        is_independent: isIndependent,
        primary_room_id: null as string | null,
        accepts_appointments: acceptsAppointments,
        physical_presence_schedule: Array.isArray(physSchedule) ? physSchedule : [],
      });

      // Load available clinics (non-blocking; may fail for some roles)
      loadAvailableClinics().catch(() => {});

      // Load rooms and assignments for doctors with clinic
      if (enhancedProfile.clinic_id && (enhancedProfile.role === 'doctor' || (enhancedProfile as { role?: string }).role === 'health_staff')) {
        loadRoomsAndAssignments(enhancedProfile.clinic_id as string, userId).catch(() => {});
      }

      // Load profile photos from storage (non-blocking)
      getProfilePhotoUrl().then(setProfilePhoto).catch(() => {});
      getPrescriptionIconUrl().then(setPrescriptionIcon).catch(() => {});

      // Load statistics and activity (non-blocking; may fail for assistants due to RLS)
      loadProfileStats(userId, enhancedProfile as EnhancedProfile).catch(() => {});
      loadRecentActivity(userId).catch(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableClinics = async () => {
    try {
      const { data: clinics, error } = await supabase
        .from('clinics')
        .select('*')
        .order('name');

      if (error) throw error;

      setAvailableClinics(clinics || []);
    } catch (err) {
      console.error('Error loading clinics:', err);
    }
  };

  const loadRoomsAndAssignments = async (clinicId: string, userId: string) => {
    try {
      const { data: rooms } = await supabase
        .from('clinic_rooms')
        .select('id, room_number, room_name, floor')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('room_number');
      setAvailableRooms((rooms as Array<{ id: string; room_number: string; room_name: string | null; floor: string | null }>) || []);

      const { data: assignments } = await supabase
        .from('room_assignments')
        .select('room_id, is_primary')
        .eq('staff_id', userId)
        .eq('clinic_id', clinicId);
      const list = (assignments || []) as Array<{ room_id: string; is_primary: boolean }>;
      setMyRoomAssignments(list);

      const primary = list.find((a) => a.is_primary);
      const primaryRoomId = primary?.room_id ?? list[0]?.room_id ?? null;
      setEditData((prev) => ({ ...prev, primary_room_id: primaryRoomId }));
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const loadProfileStats = async (userId: string, currentProfile: EnhancedProfile) => {
    try {
      let patientCount = 0;
      let consultationCount = 0;
      let monthlyCount = 0;

      // Assistants may be blocked by RLS on consultations - check for errors
      const { count: pCount, error: pErr } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('primary_doctor_id', userId);
      patientCount = pErr ? 0 : (pCount ?? 0);

      const { count: cCount, error: cErr } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', userId);
      consultationCount = cErr ? 0 : (cCount ?? 0);

      if (!cErr) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { count: mCount } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', userId)
          .gte('created_at', `${currentMonth}-01`);
        monthlyCount = mCount ?? 0;
      }

      const experienceYears = currentProfile.hire_date
        ? Math.floor((new Date().getTime() - new Date(currentProfile.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;

      setStats({
        totalPatients: patientCount,
        totalConsultations: consultationCount,
        totalPrescriptions: 0,
        monthlyConsultations: monthlyCount,
        averageRating: 4.8,
        experienceYears
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadRecentActivity = async (userId: string) => {
    try {
      // Load recent consultations (no embed - PostgREST schema cache doesn't expose consultations->patients FK)
      const { data: consultations, error: consultErr } = await supabase
        .from('consultations')
        .select('id, created_at, diagnosis, patient_id')
        .eq('doctor_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Resolve patient names (separate query avoids PostgREST embed/PGRST200)
      const patientIds = [...new Set((consultations ?? []).map((c: { patient_id: string }) => c.patient_id).filter(Boolean))];
      const patientNames: Record<string, string> = {};
      if (patientIds.length > 0) {
        const { data: patientRows } = await supabase
          .from('patients')
          .select('id, full_name')
          .in('id', patientIds);
        (patientRows ?? []).forEach((p: { id: string; full_name: string }) => { patientNames[p.id] = p.full_name ?? ''; });
      }

      // Load recent patients
      const { data: patients, error: patientsErr } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('primary_doctor_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];
      const consultList = consultErr ? [] : (consultations ?? []);
      const patientList = patientsErr ? [] : (patients ?? []);

      // Add consultations to activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      consultList.forEach((consultation: any) => {
        activities.push({
          id: consultation.id,
          type: 'consultation',
          title: 'Consulta realizada',
          description: consultation.diagnosis || 'Consulta médica',
          date: consultation.created_at,
          patientName: consultation.patient_id ? patientNames[consultation.patient_id] : undefined
        });
      });

      // Add patients to activity
      patientList.forEach(patient => {
        activities.push({
          id: patient.id,
          type: 'patient_created',
          title: 'Nuevo paciente registrado',
          description: `${patient.full_name} se registró como paciente`,
          date: patient.created_at,
          patientName: patient.full_name
        });
      });

      // Sort by date and limit
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 10));

    } catch (err) {
      console.error('Error loading activity:', err);
    }
  };



  const getOrCreatePersonalClinic = async (userId: string) => {
    try {
      // 1. Check if user already has a personal clinic relationship
      const { data: existingRelationships } = await supabase
        .from('clinic_user_relationships')
        .select('clinic_id, clinic:clinics(id, type)')
        .eq('user_id', userId)
        .eq('status', 'approved');
        
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const personalClinic = existingRelationships?.find((r: any) => r.clinic?.type === 'consultorio_personal');
      
      if (personalClinic) {
        return personalClinic.clinic_id;
      }

      // 2. Identify the personal clinic if it exists but relationship is missing (unlikely but good safety)
      // This step can be skipped if we assume strict data integrity, but checking created_by or similar would be better.
      // For now, if no relationship, we create a new one.

      // 3. Create new clinic
      const { data: newClinic, error: createError } = await supabase
        .from('clinics')
        .insert({
          name: `Consultorio de ${editData.full_name || 'Dr. ' + profileData?.full_name}`,
          type: 'consultorio_personal',
          address: editData.address,
          phone: editData.phone,
          director_name: editData.full_name || profileData?.full_name,
          is_active: true
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // 4. Create relationship
      const { error: relError } = await supabase
        .from('clinic_user_relationships')
        .insert({
          clinic_id: newClinic.id,
          user_id: userId,
          role_in_clinic: 'doctor', // Default role for personal clinic
          status: 'approved',
          is_active: true,
          start_date: new Date().toISOString()
        });
        
      if (relError) throw relError;
      
      return newClinic.id;
    } catch (error) {
      console.error('Error getting/creating personal clinic:', error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Validate clinic selection
      if (!editData.is_independent && !editData.clinic_id) {
        throw new Error('Debe seleccionar una clínica o marcar "Médico Independiente"');
      }

      let targetClinicId = editData.clinic_id;

      if (editData.is_independent) {
        try {
          // Pass user.id explicitly, safe because of check above
          targetClinicId = await getOrCreatePersonalClinic(user.id);
        } catch (clinicErr) {
          console.error(clinicErr);
          throw new Error('Error al configurar el consultorio personal');
        }
      }

      const updateData: Record<string, unknown> = {
        full_name: editData.full_name,
        phone: editData.phone,
        clinic_id: targetClinicId,
        additional_info: {
          ...profileData?.additional_info,
          address: editData.address,
          bio: editData.bio,
          consultation_fee: editData.consultation_fee,
          languages: editData.languages.split(',').map(l => l.trim()).filter(l => l),
          certifications: editData.certifications.split(',').map(c => c.trim()).filter(c => c),
          awards: editData.awards.split(',').map(a => a.trim()).filter(a => a),
          emergency_contact: editData.emergency_contact,
          accepts_appointments: editData.accepts_appointments,
          physical_presence_schedule: editData.physical_presence_schedule,
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update room assignment if doctor has clinic and selected a room
      if (targetClinicId && editData.primary_room_id && profileData?.role === 'doctor') {
        const room = availableRooms.find((r) => r.id === editData.primary_room_id);
        if (room) {
          await supabase.from('room_assignments').upsert(
            { room_id: editData.primary_room_id, staff_id: user.id, clinic_id: targetClinicId, is_primary: true },
            { onConflict: 'room_id,staff_id' }
          );
          const otherAssignments = myRoomAssignments.filter((a) => a.room_id !== editData.primary_room_id);
          for (const a of otherAssignments) {
            await supabase
              .from('room_assignments')
              .update({ is_primary: false })
              .eq('room_id', a.room_id)
              .eq('staff_id', user.id);
          }
        }
      }

      setSuccess('Perfil actualizado correctamente');
      setEditing(false);
      await loadUserProfile(user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };



  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Perfil no encontrado</h2>
          <p className="text-gray-400">No se pudo cargar la información del perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Mi Perfil Profesional
            </h1>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              {editing ? <X className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
              {editing ? 'Cancelar' : 'Editar Perfil'}
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Card */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
              <div className="text-center">
                {/* Profile Photo */}
                <div className="mb-4 flex justify-center">
                  <PhotoUploader
                    currentPhoto={profilePhoto}
                    onUpload={uploadProfilePhoto}
                    onDelete={deleteProfilePhoto}
                    type="profile"
                    size="lg"
                    shape="circle"
                    disabled={!editing}
                    placeholder={<User className="h-16 w-16 text-gray-400" />}
                  />
                </div>

                {editing ? (
                  <input
                    type="text"
                    value={editData.full_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="text-2xl font-bold bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 w-full text-center"
                  />
                ) : (
                  <h2 className="text-2xl font-bold mb-2">{profileData.full_name}</h2>
                )}

                <div className="flex items-center justify-center mb-2">
                  {profileData.role === 'doctor' && <Stethoscope className="h-5 w-5 text-cyan-400 mr-2" />}
                  {profileData.role === 'health_staff' && <Users className="h-5 w-5 text-green-400 mr-2" />}
                  {profileData.role === 'admin_staff' && <Building className="h-5 w-5 text-purple-400 mr-2" />}
                  {profileData.role === 'administrative_assistant' && <Users className="h-5 w-5 text-amber-400 mr-2" />}
                  <span className="text-gray-300 capitalize">
                    {profileData.role === 'doctor' ? 'Médico' : 
                     profileData.role === 'health_staff' ? 'Personal de Salud' :
                     profileData.role === 'admin_staff' ? 'Personal Administrativo' :
                     profileData.role === 'administrative_assistant' ? 'Asistente Administrativo' :
                     profileData.role}
                  </span>
                </div>

                {profileData.specialty && (
                  <p className="text-cyan-400 mb-4">
                    {typeof profileData.specialty === 'object' ? profileData.specialty.name : String(profileData.specialty)}
                  </p>
                )}

                {profileData.additional_info?.bio && !editing && (
                  <p className="text-gray-400 text-sm">{profileData.additional_info.bio as string}</p>
                )}

                {editing && (
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Descripción profesional..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm mt-2"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Phone className="h-5 w-5 text-cyan-400 mr-2" />
                Información de Contacto
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-300">{profileData.email}</span>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-3" />
                  {editing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm flex-1"
                      placeholder="Teléfono"
                    />
                  ) : (
                    <span className="text-gray-300">{profileData.phone || 'No especificado'}</span>
                  )}
                </div>

                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-1" />
                  {editing ? (
                    <input
                      type="text"
                      value={editData.address}
                      onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm flex-1"
                      placeholder="Dirección"
                    />
                  ) : (
                    <span className="text-gray-300">{(profileData.additional_info?.address as string) || 'No especificada'}</span>
                  )}
                </div>

                {profileData.license_number && (
                  <div className="flex items-center">
                    <Award className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-300">Cédula: {profileData.license_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clinic Association */}
            {profileData.role === 'doctor' && (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="h-5 w-5 text-cyan-400 mr-2" />
                  Asociación de Clínica
                </h3>

                {editing ? (
                  <div className="space-y-4">
                    {/* Toggle Independent Doctor */}
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-cyan-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-200">Médico Independiente</p>
                          <p className="text-xs text-gray-400">Trabajar sin clínica asignada</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.is_independent}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            is_independent: e.target.checked,
                            clinic_id: e.target.checked ? null : prev.clinic_id
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                    </div>

                    {/* Clinic Selector */}
                    {!editData.is_independent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Seleccionar Clínica
                        </label>
                        <select
                          value={editData.clinic_id || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            clinic_id: e.target.value || null
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="">Sin clínica</option>
                          {availableClinics.map(clinic => (
                            <option key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {isIndependentDoctor ? (
                      <>
                        <User className="h-4 w-4 text-cyan-400 mr-3" />
                        <span className="text-cyan-400">Médico Independiente</span>
                      </>
                    ) : profileData.clinic ? (
                      <>
                        <Building className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-gray-300">{profileData.clinic.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Sin clínica asignada</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mi Consultorio - for doctors with clinic */}
            {profileData.role === 'doctor' && profileData.clinic && !editData.is_independent && (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DoorOpen className="h-5 w-5 text-cyan-400 mr-2" />
                  Mi Consultorio
                </h3>
                {editing ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Consultorio asignado</label>
                    <select
                      value={editData.primary_room_id || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, primary_room_id: e.target.value || null }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="">Sin asignar</option>
                      {availableRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.room_number} {r.room_name ? `- ${r.room_name}` : ''} {r.floor ? `(Piso ${r.floor})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-gray-300">
                    {editData.primary_room_id ? (
                      (() => {
                        const r = availableRooms.find((x) => x.id === editData.primary_room_id);
                        return r ? (
                          <span>{r.room_number} {r.room_name ? `- ${r.room_name}` : ''}</span>
                        ) : (
                          <span className="text-gray-500">Consultorio asignado</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">Sin consultorio asignado</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Consulta por Citas - for doctors */}
            {profileData.role === 'doctor' && (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="h-5 w-5 text-cyan-400 mr-2" />
                  Consulta por Citas
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">
                      {editData.accepts_appointments
                        ? 'Los pacientes pueden agendar citas contigo'
                        : 'Modo horario libre: atención sin citas previas'}
                    </p>
                  </div>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setEditData((prev) => ({ ...prev, accepts_appointments: !prev.accepts_appointments }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editData.accepts_appointments ? 'bg-cyan-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          editData.accepts_appointments ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded text-sm ${editData.accepts_appointments ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {editData.accepts_appointments ? 'Por citas' : 'Horario libre'}
                    </span>
                  )}
                </div>
                {editing && !editData.accepts_appointments && (
                  <PhysicalPresenceScheduleEditor
                    schedule={editData.physical_presence_schedule}
                    onChange={(s) => setEditData((prev) => ({ ...prev, physical_presence_schedule: s }))}
                  />
                )}
                {!editing && !editData.accepts_appointments && editData.physical_presence_schedule.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Horario de presencia física:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => {
                        const slot = editData.physical_presence_schedule.find((s) => s.day === i);
                        return slot ? (
                          <li key={i}>{d}: {slot.start} - {slot.end}</li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Icon */}
            {(profileData.role === 'doctor' || editing) && (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-cyan-400 mr-2" />
                  Icono para Recetas
                </h3>

                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <PhotoUploader
                      currentPhoto={prescriptionIcon}
                      onUpload={uploadPrescriptionIcon}
                      onDelete={deletePrescriptionIcon}
                      type="prescription"
                      size="md"
                      shape="rounded"
                      disabled={!editing}
                      placeholder={<FileText className="h-8 w-8 text-gray-400" />}
                    />
                  </div>

                  <p className="text-xs text-gray-400">
                    Este icono aparecerá en tus recetas médicas
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats and Activity */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MedicalStatsCard
                title="Pacientes Totales"
                value={stats.totalPatients}
                icon={Users}
                color="blue"
                subtitle="Registrados en tu clínica"
              />

              <MedicalStatsCard
                title="Consultas Realizadas"
                value={stats.totalConsultations}
                icon={Stethoscope}
                color="green"
                subtitle="Total histórico"
              />

              <MedicalStatsCard
                title="Este Mes"
                value={stats.monthlyConsultations}
                icon={Calendar}
                color="purple"
                subtitle="Consultas del mes actual"
              />

              {stats.experienceYears > 0 && (
                <MedicalStatsCard
                  title="Experiencia"
                  value={`${stats.experienceYears} años`}
                  icon={Award}
                  color="orange"
                  subtitle="Desde tu fecha de contratación"
                />
              )}

              <MedicalStatsCard
                title="Calificación"
                value={`${stats.averageRating}/5.0`}
                icon={Star}
                color="cyan"
                subtitle="Promedio de pacientes"
              />

              {stats.totalPrescriptions > 0 && (
                <MedicalStatsCard
                  title="Prescripciones"
                  value={stats.totalPrescriptions}
                  icon={FileText}
                  color="green"
                  subtitle="Recetas emitidas"
                />
              )}
            </div>

            {/* Professional Info */}
            {editing && (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
                <h3 className="text-xl font-semibold mb-6">Información Profesional</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tarifa de Consulta
                    </label>
                    <input
                      type="text"
                      value={editData.consultation_fee}
                      onChange={(e) => setEditData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="$500 MXN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Idiomas
                    </label>
                    <input
                      type="text"
                      value={editData.languages}
                      onChange={(e) => setEditData(prev => ({ ...prev, languages: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Español, Inglés, Francés"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Certificaciones
                    </label>
                    <input
                      type="text"
                      value={editData.certifications}
                      onChange={(e) => setEditData(prev => ({ ...prev, certifications: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Separar con comas"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Premios y Reconocimientos
                    </label>
                    <input
                      type="text"
                      value={editData.awards}
                      onChange={(e) => setEditData(prev => ({ ...prev, awards: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Separar con comas"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contacto de Emergencia
                    </label>
                    <input
                      type="text"
                      value={editData.emergency_contact}
                      onChange={(e) => setEditData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Nombre y teléfono"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <ActivityFeed
              activities={recentActivity}
              onActivityClick={() => {
                // Aquí podrías navegar a detalles de la actividad
                // Sensitive log removed for security;
              }}
              maxItems={8}
            />

            {/* Clinic Status */}
            <ClinicStatusCard 
              onStatusUpdate={() => {
                // Recargar datos del perfil cuando cambie el estado
                if (user?.id) {
                  loadUserProfile(user.id);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
