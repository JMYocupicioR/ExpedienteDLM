import React from 'react';
import { X, Calendar, UserCheck, Mail, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StaffMember } from '@/lib/services/clinic-staff-service';
import { getClinicAppointmentsByDateRange } from '@/lib/services/admin-appointment-service';

interface StaffMemberDetailProps {
  member: StaffMember;
  clinicId: string;
  onClose: () => void;
}

export default function StaffMemberDetail({ member, clinicId, onClose }: StaffMemberDetailProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['staff-appointments', member.id, clinicId, today, weekEnd],
    queryFn: () => getClinicAppointmentsByDateRange(clinicId, today, weekEnd, member.id),
    enabled: Boolean(member.id && clinicId),
  });

  const todayAppointments = appointments.filter((a) => a.appointment_date === today);
  const upcoming = appointments
    .filter((a) => !['cancelled_by_clinic', 'cancelled_by_patient', 'no_show'].includes(a.status))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Detalle del personal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {(member.full_name || member.email)
                .split(/\s|@/)
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{member.full_name || 'Sin nombre'}</h3>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {member.email}
              </p>
              <span
                className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                  member.role_in_clinic === 'admin_staff'
                    ? 'bg-purple-900 text-purple-300'
                    : member.role_in_clinic === 'administrative_assistant'
                    ? 'bg-amber-900 text-amber-300'
                    : 'bg-green-900 text-green-300'
                }`}
              >
                {member.role_in_clinic === 'admin_staff'
                  ? 'Administrador'
                  : member.role_in_clinic === 'administrative_assistant'
                  ? 'Asistente administrativo'
                  : 'Médico'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Citas de hoy
            </h4>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Cargando...</p>
            ) : todayAppointments.length > 0 ? (
              <ul className="space-y-2">
                {todayAppointments.map((apt) => (
                  <li
                    key={apt.id}
                    className="p-3 bg-gray-700 rounded-lg text-sm text-gray-200"
                  >
                    <span className="font-medium">{apt.appointment_time}</span>
                    {' — '}
                    {(apt as any).title || 'Cita'}
                    {(apt as any).patient?.full_name && (
                      <span className="text-gray-400">
                        {' '}
                        con {(apt as any).patient.full_name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Sin citas programadas para hoy</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximas citas (7 días)
            </h4>
            {upcoming.length > 0 ? (
              <ul className="space-y-2">
                {upcoming.map((apt) => (
                  <li
                    key={apt.id}
                    className="p-3 bg-gray-700 rounded-lg text-sm text-gray-200"
                  >
                    <span className="font-medium">
                      {format(new Date(apt.appointment_date), "EEE d MMM", { locale: es })}{' '}
                      {apt.appointment_time}
                    </span>
                    {' — '}
                    {(apt as any).title || 'Cita'}
                    {(apt as any).patient?.full_name && (
                      <span className="text-gray-400">
                        {' '}
                        con {(apt as any).patient.full_name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Sin citas en los próximos 7 días</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Miembro desde {new Date(member.created_at).toLocaleDateString('es-ES')}
              {member.approved_at && (
                <span> · Aprobado {new Date(member.approved_at).toLocaleDateString('es-ES')}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
