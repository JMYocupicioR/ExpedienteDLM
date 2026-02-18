import React, { useEffect, useState } from 'react';
import {
  Plus, Send, Calendar, Clock, FileText, Activity,
  Heart, User, Stethoscope, ClipboardList, TestTube,
  ChevronRight, AlertCircle, TrendingUp, Pill
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import GenerateInvitationLinkModal from '@/components/GenerateInvitationLinkModal';
import AppointmentQuickScheduler from '@/components/AppointmentQuickScheduler';
import type { Database } from '@/lib/database.types';
import type { Appointment } from '@/lib/services/appointment-service';

type Patient = Database['public']['Tables']['patients']['Row'];
type Consultation = Database['public']['Tables']['consultations']['Row'];

interface RecentActivity {
  id: string;
  type: 'consultation' | 'scale' | 'study' | 'appointment' | 'prescription';
  title: string;
  description: string;
  date: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}

interface DashboardPacienteProps {
  patient: Patient;
  consultations: Consultation[];
  appointments: Appointment[];
  userProfile: any;
  onNewConsultation: () => void;
  onNavigateSection: (section: string) => void;
  onAppointmentScheduled: () => void;
}

export default function DashboardPaciente({
  patient,
  consultations,
  appointments,
  userProfile,
  onNewConsultation,
  onNavigateSection,
  onAppointmentScheduled
}: DashboardPacienteProps) {
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Calculate patient age
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Fetch and build recent activity timeline
  useEffect(() => {
    if (patient?.id) {
      buildActivityTimeline();
    }
  }, [patient?.id, consultations, appointments]);

  const buildActivityTimeline = async () => {
    try {
      setLoadingActivities(true);
      const activities: RecentActivity[] = [];

      // 1. Recent consultations
      consultations.slice(0, 5).forEach((c) => {
        activities.push({
          id: `consultation-${c.id}`,
          type: 'consultation',
          title: 'Consulta médica',
          description: c.diagnosis
            ? `Dx: ${typeof c.diagnosis === 'string' ? c.diagnosis : 'Registrado'}`
            : c.current_condition
              ? `${(c.current_condition as string).slice(0, 80)}${(c.current_condition as string).length > 80 ? '...' : ''}`
              : 'Consulta registrada',
          date: c.created_at || new Date().toISOString(),
          icon: Stethoscope,
          iconColor: 'text-blue-400',
          bgColor: 'bg-blue-500/10'
        });
      });

      // 2. Recent scale assessments - start with minimal safe columns to avoid 400 on schema drift
      let scaleAssessments: Array<{ id: string; scale_id: string; score?: number | null; severity?: string | null; created_at?: string | null; updated_at?: string | null }> = [];
      try {
        const { data: saData, error: saError } = await supabase
          .from('scale_assessments')
          .select('id, scale_id, updated_at')
          .eq('patient_id', patient.id)
          .limit(5);
        if (!saError && saData) {
          scaleAssessments = saData as any;
        } else {
          // Optional enrichment when full schema is available
          const { data: saFallback, error: saFallbackError } = await supabase
            .from('scale_assessments')
            .select('id, scale_id, score, severity, created_at, updated_at')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(5);
          if (!saFallbackError && saFallback) {
            scaleAssessments = saFallback as any;
          }
        }
      } catch {
        // scale_assessments may not be accessible yet; skip silently
      }

      if (scaleAssessments && scaleAssessments.length > 0) {
        // Fetch scale names separately
        const scaleIds = [...new Set(scaleAssessments.map((sa: any) => sa.scale_id).filter(Boolean))];
        let scaleNameMap: Record<string, string> = {};
        if (scaleIds.length > 0) {
          const { data: scales } = await supabase
            .from('medical_scales')
            .select('id, name')
            .in('id', scaleIds);
          if (scales) {
            scaleNameMap = Object.fromEntries(scales.map((s: any) => [s.id, s.name]));
          }
        }

        scaleAssessments.forEach((sa: any) => {
          const scaleName = scaleNameMap[sa.scale_id] || 'Evaluación';
          activities.push({
            id: `scale-${sa.id}`,
            type: 'scale',
            title: `Escala: ${scaleName}`,
            description: sa.severity
              ? `Resultado: ${sa.severity}${sa.score != null ? ` (${sa.score} pts)` : ''}`
              : sa.score != null
                ? `Puntuación: ${sa.score}`
                : 'Evaluación completada',
            date: sa.created_at || sa.updated_at || new Date().toISOString(),
            icon: ClipboardList,
            iconColor: 'text-purple-400',
            bgColor: 'bg-purple-500/10'
          });
        });
      }

      // 3. Recent medical tests / studies
      const { data: medicalTests } = await supabase
        .from('medical_tests')
        .select('id, test_name, category, status, ordered_date, result_date, created_at')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (medicalTests) {
        medicalTests.forEach((mt) => {
          const statusLabel = mt.status === 'completed' ? 'Completado' : mt.status === 'in_progress' ? 'En progreso' : 'Ordenado';
          activities.push({
            id: `study-${mt.id}`,
            type: 'study',
            title: `Estudio: ${mt.test_name}`,
            description: `${mt.category === 'laboratorio' ? 'Laboratorio' : mt.category === 'gabinete' ? 'Gabinete' : 'Otro'} · ${statusLabel}`,
            date: mt.created_at || mt.ordered_date || new Date().toISOString(),
            icon: TestTube,
            iconColor: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10'
          });
        });
      }

      // 4. Recent/upcoming appointments
      appointments.slice(0, 5).forEach((apt) => {
        const statusLabel = apt.status === 'scheduled' ? 'Programada'
          : apt.status === 'confirmed' || apt.status === 'confirmed_by_patient' ? 'Confirmada'
            : apt.status === 'completed' ? 'Completada'
              : apt.status === 'cancelled_by_clinic' || apt.status === 'cancelled_by_patient' ? 'Cancelada'
                : apt.status;
        activities.push({
          id: `appointment-${apt.id}`,
          type: 'appointment',
          title: apt.title || 'Cita médica',
          description: `${format(new Date(apt.appointment_date), "d 'de' MMM", { locale: es })} a las ${apt.appointment_time} · ${statusLabel}`,
          date: `${apt.appointment_date}T${apt.appointment_time}`,
          icon: Calendar,
          iconColor: 'text-cyan-400',
          bgColor: 'bg-cyan-500/10'
        });
      });

      // 5. Recent prescriptions
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('id, created_at, medications, diagnosis')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (prescriptions) {
        prescriptions.forEach((rx: any) => {
          let desc = 'Receta emitida';
          if (rx.medications && Array.isArray(rx.medications) && rx.medications.length > 0) {
            const medNames = rx.medications.map((m: any) => m.name || m.medication_name).filter(Boolean).join(', ');
            desc = medNames.length > 60 ? medNames.slice(0, 60) + '...' : medNames || 'Receta emitida';
          } else if (rx.diagnosis) {
            desc = `Dx: ${typeof rx.diagnosis === 'string' ? rx.diagnosis.slice(0, 60) : 'Receta emitida'}`;
          }
          activities.push({
            id: `rx-${rx.id}`,
            type: 'prescription',
            title: 'Receta emitida',
            description: desc,
            date: rx.created_at,
            icon: Pill,
            iconColor: 'text-amber-400',
            bgColor: 'bg-amber-500/10'
          });
        });
      }

      // Sort all by date descending
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentActivities(activities.slice(0, 15));
    } catch (err) {
      // Silently handle errors - timeline is supplementary
    } finally {
      setLoadingActivities(false);
    }
  };

  const age = patient.birth_date ? calculateAge(patient.birth_date) : null;
  const upcomingAppointments = appointments.filter(a =>
    ['scheduled', 'confirmed', 'confirmed_by_patient'].includes(a.status)
  );
  const nextAppointment = upcomingAppointments[0];
  const lastConsultation = consultations[0];
  const hasPatientAccount = !!patient.patient_user_id;

  return (
    <div className="space-y-6">
      {/* Patient Summary Header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {patient.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{patient.full_name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                {age !== null && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {age} años
                  </span>
                )}
                <span className="capitalize">{patient.gender}</span>
                {patient.phone && (
                  <span>Tel: {patient.phone}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                  Exp. #{patient.id.slice(0, 8)}
                </span>
                {hasPatientAccount ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Cuenta vinculada
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                    Sin cuenta de paciente
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Nueva Consulta */}
        <button
          onClick={onNewConsultation}
          className="group relative overflow-hidden rounded-xl border border-gray-700 bg-gray-800 p-5 text-left transition-all hover:border-blue-500/50 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-blue-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500/20">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Nueva Consulta</h3>
              <p className="text-xs text-gray-400 mt-0.5">Iniciar consulta médica</p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 transition-colors group-hover:text-blue-400" />
        </button>

        {/* Enviar Invitación */}
        <button
          onClick={() => setShowInvitationModal(true)}
          className="group relative overflow-hidden rounded-xl border border-gray-700 bg-gray-800 p-5 text-left transition-all hover:border-emerald-500/50 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-emerald-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Enviar Invitación</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasPatientAccount ? 'Ya tiene cuenta' : 'Vincular paciente'}
              </p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 transition-colors group-hover:text-emerald-400" />
        </button>

        {/* Nueva Cita */}
        <button
          onClick={() => setShowAppointmentScheduler(true)}
          className="group relative overflow-hidden rounded-xl border border-gray-700 bg-gray-800 p-5 text-left transition-all hover:border-cyan-500/50 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-cyan-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 transition-colors group-hover:bg-cyan-500/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Nueva Cita</h3>
              <p className="text-xs text-gray-400 mt-0.5">Agendar cita médica</p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 transition-colors group-hover:text-cyan-400" />
        </button>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateSection('consultas')}
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-left hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Stethoscope className="h-5 w-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">{consultations.length}</span>
          </div>
          <p className="text-xs text-gray-400">Consultas</p>
          {lastConsultation && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Última: {formatDistanceToNow(new Date(lastConsultation.created_at || ''), { addSuffix: true, locale: es })}
            </p>
          )}
        </button>

        <button
          onClick={() => onNavigateSection('citas')}
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-left hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <span className="text-2xl font-bold text-white">{upcomingAppointments.length}</span>
          </div>
          <p className="text-xs text-gray-400">Citas próximas</p>
          {nextAppointment && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {format(new Date(nextAppointment.appointment_date), "d MMM", { locale: es })} · {nextAppointment.appointment_time}
            </p>
          )}
        </button>

        <button
          onClick={() => onNavigateSection('estudios')}
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-left hover:border-emerald-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <TestTube className="h-5 w-5 text-emerald-400" />
            <span className="text-2xl font-bold text-white">
              {recentActivities.filter(a => a.type === 'study').length}
            </span>
          </div>
          <p className="text-xs text-gray-400">Estudios</p>
        </button>

        <button
          onClick={() => onNavigateSection('recetas')}
          className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-left hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Pill className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-bold text-white">
              {recentActivities.filter(a => a.type === 'prescription').length}
            </span>
          </div>
          <p className="text-xs text-gray-400">Recetas</p>
        </button>
      </div>

      {/* Next Appointment Alert (if any) */}
      {nextAppointment && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                <Clock className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Próxima cita</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(nextAppointment.appointment_date), "EEEE d 'de' MMMM", { locale: es })} a las {nextAppointment.appointment_time}
                  {nextAppointment.title && ` · ${nextAppointment.title}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateSection('citas')}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Ver citas <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity Timeline */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Actividad Reciente</h2>
          </div>
          <span className="text-xs text-gray-500">
            {recentActivities.length} actividades
          </span>
        </div>

        <div className="p-5">
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-10">
              <Activity className="mx-auto h-10 w-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">No hay actividad registrada aún</p>
              <p className="text-gray-500 text-xs mt-1">Comienza creando una consulta o agendando una cita</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-700" />

              <div className="space-y-1">
                {recentActivities.map((activity, idx) => {
                  const Icon = activity.icon;
                  const dateObj = new Date(activity.date);
                  const isValidDate = !isNaN(dateObj.getTime());
                  return (
                    <div
                      key={activity.id}
                      className="relative flex items-start gap-4 py-3 px-2 rounded-lg hover:bg-gray-750 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${activity.bgColor} ring-4 ring-gray-800`}>
                        <Icon className={`h-4.5 w-4.5 ${activity.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">{activity.title}</p>
                          {isValidDate && (
                            <time className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatDistanceToNow(dateObj, { addSuffix: true, locale: es })}
                            </time>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{activity.description}</p>
                      </div>

                      {/* Navigate arrow on hover */}
                      <button
                        onClick={() => {
                          if (activity.type === 'consultation') onNavigateSection('consultas');
                          else if (activity.type === 'scale') onNavigateSection('consultas');
                          else if (activity.type === 'study') onNavigateSection('estudios');
                          else if (activity.type === 'appointment') onNavigateSection('citas');
                          else if (activity.type === 'prescription') onNavigateSection('recetas');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-500 hover:text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { id: 'paciente', label: 'Info Personal', icon: User, color: 'text-gray-400' },
          { id: 'patologicos', label: 'Ant. Patológicos', icon: Heart, color: 'text-red-400' },
          { id: 'heredofamiliares', label: 'Heredofamiliares', icon: TrendingUp, color: 'text-orange-400' },
          { id: 'estudios', label: 'Estudios', icon: FileText, color: 'text-emerald-400' },
          { id: 'consultas', label: 'Consultas', icon: Stethoscope, color: 'text-blue-400' },
          { id: 'auditoria', label: 'Auditoría', icon: AlertCircle, color: 'text-orange-400' },
        ].map((nav) => {
          const NavIcon = nav.icon;
          return (
            <button
              key={nav.id}
              onClick={() => onNavigateSection(nav.id)}
              className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-left text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-gray-600 transition-all"
            >
              <NavIcon className={`h-4 w-4 ${nav.color} flex-shrink-0`} />
              <span className="truncate">{nav.label}</span>
            </button>
          );
        })}
      </div>

      {/* Invitation Modal - pre-selects current patient */}
      <GenerateInvitationLinkModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        preselectedPatientId={patient.id}
      />

      {/* Appointment Scheduler Modal */}
      {showAppointmentScheduler && patient && userProfile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                Agendar Nueva Cita
              </h3>
              <button
                onClick={() => setShowAppointmentScheduler(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
            <div className="p-4">
              <AppointmentQuickScheduler
                patientId={patient.id}
                patientName={patient.full_name}
                onScheduled={() => {
                  setShowAppointmentScheduler(false);
                  onAppointmentScheduled();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
