import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  User,
  Clock,
  Filter,
  Users,
} from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useAdminAppointments } from '@/hooks/useAdminAppointments';
import { useQuery } from '@tanstack/react-query';
import ClinicStaffService from '@/lib/services/clinic-staff-service';

const STATUS_GROUPS = [
  { key: 'scheduled', label: 'Programadas', statuses: ['scheduled', 'confirmed', 'confirmed_by_patient'] },
  { key: 'in_progress', label: 'En Curso', statuses: ['in_progress'] },
  { key: 'completed', label: 'Completadas', statuses: ['completed'] },
  { key: 'cancelled', label: 'Canceladas', statuses: ['cancelled_by_clinic', 'cancelled_by_patient', 'no_show'] },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-600/80',
  confirmed: 'bg-green-600/80',
  confirmed_by_patient: 'bg-green-600/80',
  in_progress: 'bg-yellow-600/80',
  completed: 'bg-gray-600/80',
  cancelled_by_clinic: 'bg-red-600/80',
  cancelled_by_patient: 'bg-orange-600/80',
  no_show: 'bg-red-700/80',
};

export default function StaffSchedulePage() {
  const navigate = useNavigate();
  const { activeClinic } = useClinic();
  const clinicId = activeClinic?.id ?? null;
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [staffId, setStaffId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const dateFrom = format(weekStart, 'yyyy-MM-dd');
  const dateTo = format(addDays(weekStart, 13), 'yyyy-MM-dd');

  const { appointments, workload, isLoading } = useAdminAppointments({
    clinicId,
    dateFrom,
    dateTo,
    staffId,
  });

  const staffQuery = useQuery({
    queryKey: ['clinic-staff-approved', clinicId],
    queryFn: () => (clinicId ? ClinicStaffService.getApprovedStaff(clinicId) : Promise.resolve([])),
    enabled: Boolean(clinicId),
  });
  const staffList = staffQuery.data ?? [];

  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const getAppointmentsForDate = (date: Date) => {
    const d = format(date, 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.appointment_date === d && !['cancelled_by_clinic', 'cancelled_by_patient', 'no_show'].includes(a.status))
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
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
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una clínica para ver la agenda.</p>
          <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300 mt-2 inline-block">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link to="/clinic/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Agenda por Personal</h1>
                <p className="text-sm text-gray-400">Citas de {activeClinic.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={staffId || ''}
                  onChange={(e) => setStaffId(e.target.value || null)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Todo el personal</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email} ({workload.find((w) => w.staff_id === s.id)?.appointment_count ?? 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-600">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 flex items-center gap-2 ${
                    viewMode === 'calendar' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Calendario
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 flex items-center gap-2 ${
                    viewMode === 'list' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              </div>
              <Link
                to={staffId ? `/citas?staffId=${staffId}` : '/citas'}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium"
              >
                Nueva cita
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekStart((d) => subWeeks(d, 1))}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-medium text-white min-w-[200px] text-center">
                  {format(weekStart, "d 'de' MMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMM yyyy", { locale: es })}
                </h2>
                <button
                  onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`rounded-lg border p-2 min-h-[120px] ${
                    isToday(day) ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-300 mb-2">
                    {format(day, 'EEE d', { locale: es })}
                  </div>
                  <div className="space-y-1">
                    {isLoading ? (
                      <div className="animate-pulse h-8 bg-gray-700 rounded" />
                    ) : (
                      getAppointmentsForDate(day).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => navigate(staffId ? `/citas?staffId=${staffId}` : '/citas')}
                          className={`text-xs p-2 rounded cursor-pointer hover:opacity-90 ${STATUS_COLORS[apt.status] || 'bg-gray-600'} text-white truncate`}
                          title={`${apt.appointment_time} - ${(apt as any).patient?.full_name || (apt as any).title}`}
                        >
                          {apt.appointment_time} {(apt as any).patient?.full_name || (apt as any).title}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setWeekStart((d) => subWeeks(d, 1))}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium text-white">
                {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 13), "d MMM yyyy", { locale: es })}
              </h2>
              <button
                onClick={() => setWeekStart((d) => addWeeks(d, 1))}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {STATUS_GROUPS.map((group) => {
                const groupAppointments = appointments.filter((a) =>
                  group.statuses.includes(a.status)
                );
                return (
                  <div key={group.key} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {group.label} ({groupAppointments.length})
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {groupAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => navigate(staffId ? `/citas?staffId=${staffId}` : '/citas')}
                          className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-200">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {apt.appointment_date} {apt.appointment_time}
                          </div>
                          <div className="text-white font-medium mt-1">
                            {(apt as any).patient?.full_name || (apt as any).title || 'Cita'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {getStatusLabel(apt.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
