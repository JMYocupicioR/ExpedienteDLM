import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useProfilePhotos } from '@/hooks/shared/useProfilePhotos';
import {
  Users,
  Calendar,
  UserCheck,
  Building2,
  ArrowRight,
  Activity,
  Clock,
  AlertTriangle,
  FileText,
  Pill,
} from 'lucide-react';
import { format, addDays, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import ClinicStatusCard from '@/components/ClinicStatusCard';
import AdminAlertsPanel, { type AdminAlert } from '@/components/clinic-admin/AdminAlertsPanel';
import { useAdminAppointments } from '@/hooks/useAdminAppointments';
import { useAdminPatients } from '@/hooks/useAdminPatients';
import { useClinicWorkload } from '@/hooks/useClinicWorkload';
import ClinicStaffService from '@/lib/services/clinic-staff-service';
import { useQuery } from '@tanstack/react-query';

export default function ClinicAdminDashboard() {
  const { activeClinic } = useClinic();
  const { getClinicLogoUrl } = useProfilePhotos();
  const clinicId = activeClinic?.id ?? null;
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  useEffect(() => {
    if (clinicId) {
      getClinicLogoUrl(clinicId).then(setClinicLogoUrl).catch(() => {});
    }
  }, [clinicId, getClinicLogoUrl]);

  const { appointments, summary, workload, stats, isLoading } = useAdminAppointments({
    clinicId,
    dateFrom: today,
    dateTo: weekEnd,
  });
  const { patients, stats: patientStats } = useAdminPatients(clinicId);
  const { workload: workloadData } = useClinicWorkload(clinicId, {
    dateFrom: today,
    dateTo: weekEnd,
  });

  const staffQuery = useQuery({
    queryKey: ['clinic-staff', clinicId],
    queryFn: () => (clinicId ? ClinicStaffService.getClinicStaff(clinicId) : Promise.resolve({ approvedStaff: [], pendingStaff: [], rejectedStaff: [] })),
    enabled: Boolean(clinicId),
  });

  const approvedStaff = staffQuery.data?.approvedStaff ?? [];
  const pendingCount = staffQuery.data?.pendingStaff?.length ?? 0;
  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === today && !['cancelled_by_clinic', 'cancelled_by_patient', 'no_show'].includes(a.status)
  );
  const upcomingToday = todayAppointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'confirmed_by_patient'
  );

  // Build operational alerts
  const unconfirmedCount = appointments.filter(
    (a) => a.appointment_date >= today && a.status === 'scheduled'
  ).length;
  const overloadedStaff = workloadData.filter((w) => w.appointment_count > 20);
  const alerts: AdminAlert[] = [];
  if (pendingCount > 0) {
    alerts.push({
      id: 'pending-staff',
      type: 'warning',
      title: 'Solicitudes de personal pendientes',
      description: 'Hay miembros esperando aprobación para unirse a la clínica.',
      count: pendingCount,
      actionUrl: '/clinic/staff?tab=pending',
      actionLabel: 'Revisar',
    });
  }
  if (unconfirmedCount > 0) {
    alerts.push({
      id: 'unconfirmed-appointments',
      type: 'info',
      title: 'Citas sin confirmar',
      description: 'Citas programadas que aún no han sido confirmadas por el paciente.',
      count: unconfirmedCount,
      actionUrl: '/clinic/schedule',
      actionLabel: 'Ver agenda',
    });
  }
  if (overloadedStaff.length > 0) {
    alerts.push({
      id: 'overloaded-staff',
      type: 'warning',
      title: 'Personal con alta carga',
      description: `${overloadedStaff.length} miembro(s) con más de 20 citas esta semana.`,
      count: overloadedStaff.length,
      actionUrl: '/clinic/schedule',
      actionLabel: 'Ver agenda',
    });
  }
  if (patientStats && patientStats.newThisMonth > 0) {
    alerts.push({
      id: 'new-patients-info',
      type: 'info',
      title: 'Pacientes nuevos este mes',
      description: 'Bienvenidos a los nuevos pacientes registrados.',
      count: patientStats.newThisMonth,
      actionUrl: '/clinic/patients',
      actionLabel: 'Ver pacientes',
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
      case 'confirmed_by_patient':
        return 'bg-blue-600 text-blue-100';
      case 'in_progress':
        return 'bg-yellow-600 text-yellow-100';
      case 'completed':
        return 'bg-green-600 text-green-100';
      case 'cancelled_by_clinic':
      case 'cancelled_by_patient':
      case 'no_show':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      confirmed_by_patient: 'Confirmada',
      in_progress: 'En Progreso',
      completed: 'Completada',
      cancelled_by_clinic: 'Cancelada',
      cancelled_by_patient: 'Cancelada',
      no_show: 'No Asistió',
    };
    return map[status] || status;
  };

  if (!activeClinic) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una clínica para ver el panel de administración.</p>
          <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full max-w-none">
      <section className="section">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {clinicLogoUrl ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-600 bg-gray-700 flex-shrink-0">
                <img src={clinicLogoUrl} alt="Logo clínica" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-gray-600 bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-8 w-8 text-gray-500" />
              </div>
            )}
            <div>
              <h1 className="section-title text-3xl mb-1">Panel de Administración</h1>
              <p className="section-subtitle">
                {activeClinic.name} — Vista 360° de operación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/clinic-admin"
              className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
            >
              <Building2 className="h-4 w-4 mr-1" />
              Configuración
            </Link>
            <Link
              to="/dashboard"
              className="text-gray-400 text-sm hover:text-gray-300 flex items-center"
            >
              Dashboard general
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <ClinicStatusCard />
      </section>

      <section className="section">
        <div className="stats-grid">
          <Link to="/clinic/patients" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Total Pacientes</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">
                    {patientStats?.total ?? 0}
                  </p>
                  {patientStats && patientStats.newThisMonth > 0 && (
                    <p className="text-xs text-green-400 mt-1">+{patientStats.newThisMonth} este mes</p>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>
          <Link to="/clinic/staff" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-green-500 rounded-xl group-hover:scale-110 transition-transform">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Personal Activo</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">
                    {approvedStaff.length}
                  </p>
                  {pendingCount > 0 && (
                    <p className="text-xs text-amber-400 mt-1">{pendingCount} pendientes</p>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>
          <Link to="/clinic/schedule" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Citas Hoy</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">
                    {todayAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.this_week ?? 0} esta semana
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>
          <div className="card">
            <div className="flex items-center">
              <div className="stats-card-icon p-3 bg-cyan-500 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm font-medium">Citas del Mes</p>
                <p className="text-2xl lg:text-3xl font-bold text-white">
                  {stats?.this_month ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total programadas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {pendingCount > 0 && (
        <section className="section">
          <div className="card border-amber-500/40 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">
                  {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} de personal pendiente
                </p>
                <p className="text-sm text-gray-400">Revisa y aprueba en la sección de Personal</p>
              </div>
              <Link
                to="/clinic/staff?tab=pending"
                className="ml-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium"
              >
                Revisar
              </Link>
            </div>
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="section">
          <AdminAlertsPanel alerts={alerts} />
        </section>
      )}

      <section className="section">
        <div className="dashboard-grid content-grid">
          <div className="card">
            <h2 className="text-xl lg:text-2xl font-semibold text-white mb-6 flex items-center">
              <UserCheck className="h-6 w-6 mr-3 text-cyan-400" />
              Mi Personal
            </h2>
            {staffQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              </div>
            ) : approvedStaff.length > 0 ? (
              <div className="space-y-3">
                {approvedStaff.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-gray-700 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {(member.full_name || member.email)
                          .split(/\s|@/)
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.full_name || member.email}</p>
                        <p className="text-xs text-gray-400">
                          {member.role_in_clinic === 'admin_staff' ? 'Administrador' : 'Doctor'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {workloadData.find((w) => w.staff_id === member.id)?.appointment_count ?? 0}{' '}
                      citas (7d)
                    </div>
                  </div>
                ))}
                <Link
                  to="/clinic/staff"
                  className="block text-center py-2 text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Ver todo el personal →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay personal registrado</p>
                <Link to="/clinic/staff" className="text-cyan-400 text-sm hover:underline mt-2 inline-block">
                  Invitar personal
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-white flex items-center">
                <Calendar className="h-6 w-6 mr-3 text-cyan-400" />
                Próximas Citas
              </h2>
              <Link to="/clinic/schedule" className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center">
                Ver calendario
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border-l-4 border-cyan-400"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium">{(apt as any).title || 'Cita'}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(apt.status)}`}
                          >
                            {getStatusLabel(apt.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {apt.appointment_time}
                          </span>
                          <span>{(apt as any).patient?.full_name || 'Paciente'}</span>
                        </div>
                      </div>
                      <Link to="/clinic/schedule" className="text-cyan-400 hover:text-cyan-300">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay citas programadas para hoy</p>
                <Link
                  to="/citas"
                  className="mt-3 inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
                >
                  Programar cita
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/clinic/patients"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Users className="h-8 w-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Pacientes</span>
          </Link>
          <Link
            to="/clinic/staff"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <UserCheck className="h-8 w-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Personal</span>
          </Link>
          <Link
            to="/clinic/schedule"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Calendar className="h-8 w-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Agenda</span>
          </Link>
          <Link
            to="/recetas"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Pill className="h-8 w-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Recetas</span>
          </Link>
          <Link
            to="/plantillas"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <FileText className="h-8 w-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Plantillas</span>
          </Link>
          <Link
            to="/citas"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Activity className="h-8 w-8 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium">Nueva Cita</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
