import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, Camera, Award, Calendar, Phone, Mail, MapPin, 
  Stethoscope, Users, Building, FileText, Star, Activity, Clock,
  Edit3, Save, X, Upload, Download, Eye, ChevronRight, Heart,
  TrendingUp, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';
import { EnhancedProfile, MedicalSpecialty, Clinic } from '@/lib/database.types';
import PhotoUploader from '@/components/shared/PhotoUploader';
import MedicalStatsCard from '@/components/MedicalStatsCard';
import ActivityFeed from '@/components/shared/ActivityFeed';
import ClinicStatusCard from '@/components/ClinicStatusCard';

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

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
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
  const [profileData, setProfileData] = useState<EnhancedProfile | null>(null);
  const [specialty, setSpecialty] = useState<MedicalSpecialty | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [prescriptionIcon, setPrescriptionIcon] = useState<string | null>(null);
  
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
    emergency_contact: ''
  });

  useEffect(() => {
    if (!authLoading && user) {
      loadUserProfile();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Load enhanced profile data
      const { data: enhancedProfile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          specialty:specialty_id(name, category, description),
          clinic:clinic_id(name, type, address, phone)
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfileData(enhancedProfile);

      // Update edit form data
      setEditData({
        full_name: enhancedProfile.full_name || '',
        phone: enhancedProfile.phone || '',
        address: enhancedProfile.additional_info?.address || '',
        bio: enhancedProfile.additional_info?.bio || '',
        consultation_fee: enhancedProfile.additional_info?.consultation_fee || '',
        languages: enhancedProfile.additional_info?.languages?.join(', ') || '',
        certifications: enhancedProfile.additional_info?.certifications?.join(', ') || '',
        awards: enhancedProfile.additional_info?.awards?.join(', ') || '',
        emergency_contact: enhancedProfile.additional_info?.emergency_contact || ''
      });

      // Load profile photos from storage
      const photoUrl = await getProfilePhotoUrl();
      const iconUrl = await getPrescriptionIconUrl();
      setProfilePhoto(photoUrl);
      setPrescriptionIcon(iconUrl);

      // Load statistics
      await loadProfileStats();

      // Load recent activity
      await loadRecentActivity();

    } catch (err: any) {
      // Error log removed for security;
      setError(err.message || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };



  const loadProfileStats = async () => {
    try {
      if (!user || !profileData) return;

      // Load patient count
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('primary_doctor_id', user.id);

      // Load consultation count
      const { count: consultationCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id);

      // Load monthly consultations
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { count: monthlyCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .gte('created_at', `${currentMonth}-01`);

      // Calculate experience years
      const experienceYears = profileData.hire_date 
        ? Math.floor((new Date().getTime() - new Date(profileData.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;

      setStats({
        totalPatients: patientCount || 0,
        totalConsultations: consultationCount || 0,
        totalPrescriptions: 0, // TODO: Add when prescriptions table is available
        monthlyConsultations: monthlyCount || 0,
        averageRating: 4.8, // TODO: Implement rating system
        experienceYears
      });

    } catch (err) {
      // Error log removed for security;
    }
  };

  const loadRecentActivity = async () => {
    try {
      if (!user) return;

      // Load recent consultations
      const { data: consultations } = await supabase
        .from('consultations')
        .select(`
          id, created_at, diagnosis,
          patient:patient_id(full_name)
        `)
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Load recent patients
      const { data: patients } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('primary_doctor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];

      // Add consultations to activity
      consultations?.forEach(consultation => {
        activities.push({
          id: consultation.id,
          type: 'consultation',
          title: 'Consulta realizada',
          description: consultation.diagnosis || 'Consulta médica',
          date: consultation.created_at,
          patientName: consultation.patient?.full_name
        });
      });

      // Add patients to activity
      patients?.forEach(patient => {
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
      // Error log removed for security;
    }
  };



  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      const updateData = {
        full_name: editData.full_name,
        phone: editData.phone,
        additional_info: {
          ...profileData?.additional_info,
          address: editData.address,
          bio: editData.bio,
          consultation_fee: editData.consultation_fee,
          languages: editData.languages.split(',').map(l => l.trim()).filter(l => l),
          certifications: editData.certifications.split(',').map(c => c.trim()).filter(c => c),
          awards: editData.awards.split(',').map(a => a.trim()).filter(a => a),
          emergency_contact: editData.emergency_contact
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Perfil actualizado correctamente');
      setEditing(false);
      await loadUserProfile();

    } catch (err: any) {
      // Error log removed for security;
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
                  <span className="text-gray-300 capitalize">
                    {profileData.role === 'doctor' ? 'Médico' : 
                     profileData.role === 'health_staff' ? 'Personal de Salud' :
                     profileData.role === 'admin_staff' ? 'Personal Administrativo' : 
                     profileData.role}
                  </span>
                </div>

                {profileData.specialty && (
                  <p className="text-cyan-400 mb-4">{profileData.specialty.name}</p>
                )}

                {profileData.additional_info?.bio && !editing && (
                  <p className="text-gray-400 text-sm">{profileData.additional_info.bio}</p>
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
                    <span className="text-gray-300">{profileData.additional_info?.address || 'No especificada'}</span>
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
              onActivityClick={(activity) => {
                // Aquí podrías navegar a detalles de la actividad
                // Sensitive log removed for security;
              }}
              maxItems={8}
            />

            {/* Clinic Status */}
            <ClinicStatusCard 
              onStatusUpdate={() => {
                // Recargar datos del perfil cuando cambie el estado
                loadUserProfile();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
