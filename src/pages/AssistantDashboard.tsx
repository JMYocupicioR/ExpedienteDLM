/**
 * Dashboard operativo para rol administrative_assistant.
 * Centrado en recepción, agenda, pendientes y coordinación de pacientes.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useAdminAppointments } from '@/hooks/useAdminAppointments';
import { useAdminPatients } from '@/hooks/useAdminPatients';
import { useAssistantPermissions } from '@/hooks/useAssistantPermissions';
import { useClinicWorkload } from '@/hooks/useClinicWorkload';
import ClinicStatusCard from '@/components/ClinicStatusCard';
import ClinicStaffAssignmentPanel from '@/components/assistant/ClinicStaffAssignmentPanel';
import NewPatientForm from '@/features/patients/components/NewPatientForm';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  ListTodo,
  Phone,
  Plus,
  Search,
  Users,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssistantDashboard() {
  const navigate = useNavigate();
  const { activeClinic } = useClinic();
  const clinicId = activeClinic?.id ?? null;
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const { permissions } = useAssistantPermissions();
  const { appointments, stats, workload, isLoading } = useAdminAppointments({
    clinicId,
    dateFrom: today,
    dateTo: weekEnd,
  });

  const { patients, stats: patientStats } = useAdminPatients(clinicId);
  const { workload: workloadData } = useClinicWorkload(clinicId, {
    dateFrom: today,
    dateTo: weekEnd,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === today && !['cancelled_by_clinic', 'cancelled_by_patient', 'no_show'].includes(a.status)
  );

  const unconfirmedCount = appointments.filter(
    (a) => a.appointment_date >= today && a.status === 'scheduled'
  ).length;

  const upcomingToday = todayAppointments.filter(
    (a) => ['scheduled', 'confirmed', 'confirmed_by_patient'].includes(a.status)
  );

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
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled_by_clinic: 'Cancelada',
      cancelled_by_patient: 'Cancelada',
      no_show: 'No asistió',
    };
    return map[status] || status;
  };

  const recentPatients = (patients || []).slice(0, 6);
  const overloadedStaff = workloadData.filter((w) => w.appointment_count > 15);

  if (!activeClinic) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una clínica para ver el panel de recepción.</p>
          <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full max-w-none">
      {/* Header */}
      <section className="section">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="section-title text-3xl mb-2">Recepción y Coordinación</h1>
            <p className="section-subtitle">
              {activeClinic.name} — Panel operativo del asistente
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  navigate(`/clinic/patients?search=${encodeURIComponent(searchTerm)}`);
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Recepción hoy - KPIs */}
      <section className="section">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <UserCheck className="h-5 w-5 mr-2 text-cyan-400" />
          Recepción hoy
        </h2>
        <div className="stats-grid">
          <Link to="/clinic/schedule" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-cyan-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Citas hoy</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">
                    {todayAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{upcomingToday.length} próximas</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>

          <Link to="/clinic/schedule?filter=unconfirmed" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Por confirmar</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">{unconfirmedCount}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>

          <Link to="/clinic/patients" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="stats-card-icon p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm font-medium">Total pacientes</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">
                    {patientStats?.total ?? 0}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400" />
            </div>
          </Link>

          <div className="card">
            <div className="flex items-center">
              <div className="stats-card-icon p-3 bg-emerald-500 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm font-medium">Cobros pendientes</p>
                <p className="text-2xl lg:text-3xl font-bold text-white">—</p>
                <p className="text-xs text-gray-500 mt-1">Próximamente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas recepción */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/citas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agendar cita
          </Link>
          {permissions.can_create_patient && (
          <button
            onClick={() => setShowNewPatientForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </button>
          )}
          <Link
            to="/clinic/schedule"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/80 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Confirmar llegada
          </Link>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-500 rounded-lg text-sm cursor-not-allowed">
            <DollarSign className="h-4 w-4" />
            Registrar cobro (próximamente)
          </span>
        </div>
      </section>

      <section className="section">
        <ClinicStatusCard />
      </section>

      {/* Personal de la clínica */}
      <section className="section">
        <ClinicStaffAssignmentPanel />
      </section>

      {/* Agenda operativa + Pacientes */}
      <section className="section">
        <div className="dashboard-grid content-grid">
          {/* Agenda operativa */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-white flex items-center">
                <Calendar className="h-6 w-6 mr-3 text-cyan-400" />
                Agenda operativa
              </h2>
              <Link
                to="/clinic/schedule"
                className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
              >
                Ver calendario
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {overloadedStaff.length > 0 && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm">
                <strong>Alta carga:</strong> {overloadedStaff.map((w) => w.full_name || 'Sin nombre').join(', ')} tienen más de 15 citas esta semana.
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => navigate('/clinic/schedule')}
                    className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors border-l-4 border-cyan-400"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium">
                            {(apt as any).title || 'Cita'} · {(apt as any).patient?.full_name || 'Paciente'}
                          </h3>
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
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
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
                  <Plus className="h-4 w-4 mr-1" />
                  Programar cita
                </Link>
              </div>
            )}
          </div>

          {/* Pacientes para gestión - visible si tiene permiso */}
          {permissions.can_view_patient_list && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-white flex items-center">
                <Users className="h-6 w-6 mr-3 text-cyan-400" />
                Pacientes para gestión
              </h2>
              <Link
                to="/clinic/patients"
                className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
              >
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {recentPatients.length > 0 ? (
              <div className="space-y-3">
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/citas?patient=${p.id}`)}
                    className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                        {(p.full_name || '?')
                          .split(/\s/)
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{p.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">
                          {p.phone || p.email || 'Sin contacto'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={p.phone ? `tel:${p.phone}` : '#'}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded bg-gray-600 hover:bg-gray-500 text-gray-300"
                        title="Llamar"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay pacientes registrados</p>
                {permissions.can_create_patient && (
                <button
                  onClick={() => setShowNewPatientForm(true)}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo paciente
                </button>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </section>

      {/* Pendientes y notas del equipo (placeholder) - visible si tiene permiso */}
      {permissions.can_view_pending_tasks && (
      <section className="section">
        <div className="card border-dashed border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <ListTodo className="h-6 w-6 mr-3 text-amber-400" />
            Pendientes y notas del equipo
          </h2>
          <div className="flex items-center gap-4 p-6 bg-gray-800/50 rounded-lg text-gray-400">
            <FileText className="h-10 w-10 text-gray-500" />
            <div>
              <p className="font-medium text-gray-300">Bandeja de pendientes compartidos</p>
              <p className="text-sm mt-1">
                Ver pendientes creados por médicos y personal, agregar notas, crear nuevos pendientes
                y marcar seguimiento. (Módulo en desarrollo)
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Caja y cobros (placeholder) - visible si tiene permiso */}
      {permissions.can_register_payments && (
      <section className="section">
        <div className="card border-dashed border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <DollarSign className="h-6 w-6 mr-3 text-emerald-400" />
            Caja y cobros
          </h2>
          <div className="flex items-center gap-4 p-6 bg-gray-800/50 rounded-lg text-gray-400">
            <DollarSign className="h-10 w-10 text-gray-500" />
            <div>
              <p className="font-medium text-gray-300">Resumen diario de cobranza</p>
              <p className="text-sm mt-1">
                Cobrado hoy, pendientes de cobro, métodos de pago. Registrar pagos y alertas de
                citas sin cobro. (Módulo en desarrollo)
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Acciones rápidas */}
      <section className="section">
        <h2 className="text-lg font-semibold text-white mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/clinic/patients"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Users className="h-8 w-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium text-sm">Pacientes</span>
          </Link>
          <Link
            to="/clinic/schedule"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Calendar className="h-8 w-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium text-sm">Agenda</span>
          </Link>
          <Link
            to="/citas"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <Plus className="h-8 w-8 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium text-sm">Nueva cita</span>
          </Link>
          <Link
            to="/clinic/staff"
            className="card group flex flex-col items-center justify-center p-6 text-center"
          >
            <UserCheck className="h-8 w-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-gray-200 font-medium text-sm">Personal</span>
          </Link>
        </div>
      </section>

      <NewPatientForm
        isOpen={showNewPatientForm}
        onClose={() => setShowNewPatientForm(false)}
        onSave={(newPatient) => {
          setShowNewPatientForm(false);
          navigate(`/clinic/patients`);
        }}
      />
    </main>
  );
}
