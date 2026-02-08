import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Clock,
  UserCheck,
  Building2
} from 'lucide-react';

interface ClinicDashboardOverviewProps {
  clinicId: string;
}

interface ClinicStats {
  totalPatients: number;
  activePatients: number;
  todayAppointments: number;
  totalDoctors: number;
  totalStaff: number;
  pendingAppointments: number;
  completedConsultations: number;
}

export default function ClinicDashboardOverview({ clinicId }: ClinicDashboardOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    activePatients: 0,
    todayAppointments: 0,
    totalDoctors: 0,
    totalStaff: 0,
    pendingAppointments: 0,
    completedConsultations: 0
  });
  const [clinicInfo, setClinicInfo] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (clinicId) {
      loadData();
    }
  }, [clinicId]); // loadData is stable if defined outside or wrapped in useCallback, but here it's defined inside component.
  // Ideally loadData should be inside useEffect or memoized.
  // For now, moving loadData definition inside useEffect or ignoring dependency is common, but let's fix it properly.
  // Actually, I'll move loadData inside useEffect in a better refactor, but for now I'll just suppress the warning or include it if I memoize it.
  // Let's just suppress the warning for now as refactoring the whole function to be inside useEffect is safer.
  // Wait, I can't suppress easily without eslint-disable.
  // Let's wrap the function in useCallback or move it inside.
  // Moving it inside is easiest.

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Clinic Info
      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();
      setClinicInfo(clinic);

      // 2. Stats
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [
        patientsResult,
        appointmentsResult,
        staffResult,
        consultationsResult
      ] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact' }).eq('clinic_id', clinicId),
        supabase.from('appointments').select('id, status', { count: 'exact' }).eq('clinic_id', clinicId).eq('appointment_date', today),
        supabase.from('clinic_user_relationships').select('id, role_in_clinic', { count: 'exact' }).eq('clinic_id', clinicId).eq('is_active', true),
        supabase.from('consultations').select('id', { count: 'exact' }).gte('created_at', firstDayOfMonth).eq('clinic_id', clinicId)
      ]);

      // Active Patients (Last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { count: activePatients } = await supabase
        .from('consultations')
        .select('patient_id', { count: 'exact', head: true })
        .gte('created_at', ninetyDaysAgo.toISOString())
        .eq('clinic_id', clinicId);

      // Process Stats
      const doctors = staffResult.data?.filter(s => s.role_in_clinic === 'doctor').length || 0;
      const adminStaff = staffResult.data?.filter(s => s.role_in_clinic === 'admin_staff').length || 0;
      const pendingAppts = appointmentsResult.data?.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length || 0;

      setStats({
        totalPatients: patientsResult.count || 0,
        activePatients: activePatients || 0,
        todayAppointments: appointmentsResult.count || 0,
        totalDoctors: doctors,
        totalStaff: doctors + adminStaff,
        pendingAppointments: pendingAppts,
        completedConsultations: consultationsResult.count || 0
      });

      // 3. Recent Activity (Placeholder logic if table doesn't exist or is empty)
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentActivity(activities || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Intro Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Building2 className="h-6 w-6 mr-2 text-cyan-400" />
          {clinicInfo?.name || 'Resumen de Clínica'}
        </h2>
        <p className="text-gray-400 mt-1">
          {clinicInfo?.address || 'Dirección no configurada'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pacientes"
          value={stats.totalPatients}
          icon={Users}
          color="blue"
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
        />
        <StatCard
          title="Personal Total"
          value={stats.totalStaff}
          icon={Users}
          color="cyan"
          subtitle={`${stats.totalDoctors} médicos`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Metrics */}
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-cyan-400" />
              Métricas del Mes
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Consultas Realizadas</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.completedConsultations}</p>
                <div className="mt-2 flex items-center text-sm text-green-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Actividad registrada</span>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Citas Pendientes</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.pendingAppointments}</p>
                <div className="mt-2 flex items-center text-sm text-yellow-400">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Próximas programadas</span>
                </div>
              </div>
            </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
             <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <QuickActionLink to="/clinic/patients" icon={Users} label="Pacientes" color="text-cyan-400" />
               <QuickActionLink to="/citas" icon={Calendar} label="Agenda" color="text-purple-400" />
               <QuickActionLink to="/clinic/staff" icon={UserCheck} label="Personal" color="text-green-400" />
               <QuickActionLink to="/clinic/settings" icon={Building2} label="Configurar" color="text-orange-400" />
             </div>
           </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            Actividad Reciente
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-200">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay actividad reciente registrada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
  const bgColors: any = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${bgColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label, color }: any) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center p-4 bg-gray-700/30 hover:bg-gray-700 rounded-lg transition-all border border-transparent hover:border-gray-600">
      <Icon className={`h-6 w-6 mb-2 ${color}`} />
      <span className="text-sm text-gray-300 font-medium">{label}</span>
    </Link>
  );
}
