/**
 * Panel de personal clínico para asistente administrativo.
 * Lista staff con roles de atención (doctor, fisio, enfermería, etc.)
 * y permite agendar pacientes por profesional.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Plus, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import ClinicStaffService from '@/lib/services/clinic-staff-service';
import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useClinicWorkload } from '@/hooks/useClinicWorkload';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario/Médico',
  director: 'Director',
  doctor: 'Médico',
  physiotherapist: 'Fisioterapeuta',
  nurse: 'Enfermería',
  assistant: 'Asistente',
  admin_staff: 'Administrador',
};

export default function ClinicStaffAssignmentPanel() {
  const { activeClinic } = useClinic();
  const resolvedClinicId = activeClinic?.id ?? null;

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const staffQuery = useQuery({
    queryKey: ['clinic-staff-for-scheduling', resolvedClinicId],
    queryFn: () =>
      resolvedClinicId ? ClinicStaffService.getStaffForScheduling(resolvedClinicId) : Promise.resolve([]),
    enabled: Boolean(resolvedClinicId),
  });

  const { workload } = useClinicWorkload(resolvedClinicId, {
    dateFrom: today,
    dateTo: weekEnd,
  });

  const staff = staffQuery.data ?? [];

  const getWorkloadForStaff = (staffId: string) =>
    workload.find((w) => w.staff_id === staffId)?.appointment_count ?? 0;

  if (!resolvedClinicId) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl lg:text-2xl font-semibold text-white flex items-center">
          <Users className="h-6 w-6 mr-3 text-cyan-400" />
          Personal de la clínica
        </h2>
        <Link
          to="/citas"
          className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center"
        >
          Ver agenda
          <Calendar className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {staffQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay médicos o profesionales para asignar citas</p>
          <p className="text-sm mt-1">El administrador de la clínica debe invitar y aprobar al personal (médicos, fisioterapeutas, etc.).</p>
          <Link
            to="/clinic/staff"
            className="mt-3 inline-block text-sm text-cyan-400 hover:text-cyan-300"
          >
            Ver personal de la clínica →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {((member.full_name || member.email || '?')
                    .split(/\s|@/)[0]?.[0] || '?')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">
                    {member.full_name || member.email || 'Sin nombre'}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    {ROLE_LABELS[member.role_in_clinic] || member.role_in_clinic}
                    <span className="text-gray-500">•</span>
                    <Clock className="h-3 w-3 inline" />
                    {getWorkloadForStaff(member.id)} citas esta semana
                  </p>
                </div>
              </div>
              <Link
                to={`/citas?staffId=${member.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                Agendar paciente
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
