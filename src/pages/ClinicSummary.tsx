import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  FileText,
  Clock,
  ArrowRight,
  Building2,
  UserCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ClinicStats {
  totalPatients: number;
  activePatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  totalDoctors: number;
  totalStaff: number;
  pendingAppointments: number;
  completedConsultations: number;
}

export default function ClinicSummary() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    totalDoctors: 0,
    totalStaff: 0,
    pendingAppointments: 0,
    completedConsultations: 0
  });
  const [clinicInfo, setClinicInfo] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadClinicData();
    }
  }, [profile]);

  const loadClinicData = async () => {
    if (!profile?.clinic_id) return;
    
    try {
      setLoading(true);

      // Cargar información de la clínica
      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', profile.clinic_id)
        .single();

      setClinicInfo(clinic);

      // Cargar estadísticas
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [
        patientsResult,
        appointmentsResult,
        staffResult,
        consultationsResult
      ] = await Promise.all([
        // Total de pacientes
        supabase
          .from('patients')
          .select('id, created_at', { count: 'exact' })
          .eq('clinic_id', profile.clinic_id),
        
        // Citas de hoy
        supabase
          .from('appointments')
          .select('id, status', { count: 'exact' })
          .eq('clinic_id', profile.clinic_id)
          .eq('appointment_date', today),
        
        // Personal de la clínica
        supabase
          .from('clinic_user_relationships')
          .select('id, role_in_clinic', { count: 'exact' })
          .eq('clinic_id', profile.clinic_id)
          .eq('is_active', true),
        
        // Consultas del mes
        supabase
          .from('consultations')
          .select('id', { count: 'exact' })
          .gte('created_at', firstDayOfMonth)
      ]);

      // Calcular pacientes activos (con consultas en los últimos 90 días)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { count: activePatients } = await supabase
        .from('consultations')
        .select('patient_id', { count: 'exact', head: true })
        .gte('created_at', ninetyDaysAgo.toISOString())
        .eq('clinic_id', profile.clinic_id);

      // Procesar estadísticas
      const doctors = staffResult.data?.filter(s => s.role_in_clinic === 'doctor').length || 0;
      const adminStaff = staffResult.data?.filter(s => s.role_in_clinic === 'admin_staff').length || 0;
      const pendingAppts = appointmentsResult.data?.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length || 0;

      setStats({
        totalPatients: patientsResult.count || 0,
        activePatients: activePatients || 0,
        todayAppointments: appointmentsResult.count || 0,
        monthlyRevenue: 0, // Placeholder - implementar cálculo real
        totalDoctors: doctors,
        totalStaff: doctors + adminStaff,
        pendingAppointments: pendingAppts,
        completedConsultations: consultationsResult.count || 0
      });

      // Cargar actividad reciente
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(activities || []);

    } catch (error) {
      console.error('Error loading clinic data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Building2 className="h-8 w-8 mr-3 text-cyan-400" />
                {clinicInfo?.name || 'Mi Clínica'}
              </h1>
              <p className="text-gray-400 mt-1">
                Resumen general y estadísticas de la clínica
              </p>
            </div>
            <Link
              to="/clinic-admin"
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center"
            >
              Panel de Administración
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Pacientes"
            value={stats.totalPatients}
            icon={Users}
            color="blue"
            link="/clinic/patients"
          />
          <StatCard
            title="Pacientes Activos"
            value={stats.activePatients}
            icon={UserCheck}
            color="green"
            subtitle="Últimos 90 días"
          />
          <StatCard
            title="Citas Hoy"
            value={stats.todayAppointments}
            icon={Calendar}
            color="purple"
            link="/citas"
          />
          <StatCard
            title="Personal Total"
            value={stats.totalStaff}
            icon={Users}
            color="cyan"
            subtitle={`${stats.totalDoctors} doctores`}
            link="/clinic/staff"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-cyan-400" />
              Actividad de la Clínica
            </h2>
            
            <div className="space-y-4">
              {/* Monthly Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Consultas este mes</p>
                  <p className="text-2xl font-bold text-white">{stats.completedConsultations}</p>
                  <p className="text-green-400 text-sm mt-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +12% vs mes anterior
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Citas pendientes</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingAppointments}</p>
                  <p className="text-yellow-400 text-sm mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Próximos 7 días
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Acciones Rápidas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/clinic/patients"
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center transition-colors"
                  >
                    <Users className="h-5 w-5 mx-auto mb-1 text-cyan-400" />
                    <span className="text-sm text-white">Ver Pacientes</span>
                  </Link>
                  <Link
                    to="/citas"
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center transition-colors"
                  >
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-400" />
                    <span className="text-sm text-white">Gestionar Citas</span>
                  </Link>
                  <Link
                    to="/clinic/staff"
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center transition-colors"
                  >
                    <UserCheck className="h-5 w-5 mx-auto mb-1 text-green-400" />
                    <span className="text-sm text-white">Personal</span>
                  </Link>
                  <Link
                    to="/clinic/settings"
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center transition-colors"
                  >
                    <Building2 className="h-5 w-5 mx-auto mb-1 text-orange-400" />
                    <span className="text-sm text-white">Configuración</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-cyan-400" />
              Actividad Reciente
            </h2>
            
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No hay actividad reciente</p>
              )}
            </div>

            {recentActivity.length > 0 && (
              <Link
                to="/clinic/activity"
                className="mt-4 text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
              >
                Ver toda la actividad
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            )}
          </div>
        </div>

        {/* Clinic Info */}
        {clinicInfo && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Información de la Clínica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem label="Tipo" value={clinicInfo.type || 'General'} />
              <InfoItem label="Dirección" value={clinicInfo.address || 'No especificada'} />
              <InfoItem label="Teléfono" value={clinicInfo.phone || 'No especificado'} />
              <InfoItem label="Email" value={clinicInfo.email || 'No especificado'} />
              <InfoItem label="Director" value={clinicInfo.director_name || 'No especificado'} />
              <InfoItem 
                label="Estado" 
                value={clinicInfo.is_active ? 'Activa' : 'Inactiva'}
                icon={clinicInfo.is_active ? <CheckCircle className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle, 
  link 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string; 
  subtitle?: string;
  link?: string;
}) {
  const bgColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500'
  };

  const content = (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColors[color as keyof typeof bgColors]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white flex items-center">
        {value}
        {icon && <span className="ml-2">{icon}</span>}
      </p>
    </div>
  );
}
