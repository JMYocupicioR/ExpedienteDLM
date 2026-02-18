import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import {
  getClinicAppointments,
  getClinicAppointmentsByDateRange,
  getClinicAppointmentsSummary,
  getStaffWorkload,
  getClinicAppointmentStats,
  type AdminAppointmentFilters,
  type ClinicAppointmentsSummaryRow,
  type StaffWorkloadRow,
} from '@/lib/services/admin-appointment-service';
import type { EnhancedAppointment } from '@/lib/services/enhanced-appointment-service';

interface UseAdminAppointmentsOptions {
  clinicId: string | null;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string | null;
  status?: string[];
  type?: string[];
}

export function useAdminAppointments(options: UseAdminAppointmentsOptions) {
  const { clinicId, dateFrom, dateTo, staffId, status, type } = options;
  const queryClient = useQueryClient();

  const from = dateFrom || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const to = dateTo || format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const filters: AdminAppointmentFilters = {
    clinic_id: clinicId || undefined,
    date_from: from,
    date_to: to,
    doctor_id: staffId || undefined,
    status: status && status.length > 0 ? status : undefined,
    type: type && type.length > 0 ? type : undefined,
  };

  const appointmentsQuery = useQuery<EnhancedAppointment[]>({
    queryKey: ['admin-appointments', clinicId, from, to, staffId, status, type],
    queryFn: () =>
      clinicId
        ? getClinicAppointmentsByDateRange(clinicId, from, to, staffId || undefined)
        : Promise.resolve([]),
    enabled: Boolean(clinicId),
  });

  const summaryQuery = useQuery<ClinicAppointmentsSummaryRow[]>({
    queryKey: ['admin-appointments-summary', clinicId, from, to],
    queryFn: () =>
      clinicId ? getClinicAppointmentsSummary(clinicId, from, to) : Promise.resolve([]),
    enabled: Boolean(clinicId),
  });

  const workloadQuery = useQuery<StaffWorkloadRow[]>({
    queryKey: ['admin-staff-workload', clinicId, from, to, staffId],
    queryFn: () =>
      clinicId ? getStaffWorkload(clinicId, from, to, staffId || undefined) : Promise.resolve([]),
    enabled: Boolean(clinicId),
  });

  const statsQuery = useQuery({
    queryKey: ['admin-appointment-stats', clinicId, from, to, staffId],
    queryFn: () =>
      clinicId
        ? getClinicAppointmentStats(clinicId, from, to, staffId || undefined)
        : Promise.resolve({ total: 0, by_status: {}, by_type: {}, today: 0, this_week: 0, this_month: 0 }),
    enabled: Boolean(clinicId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['admin-appointments-summary'] });
    queryClient.invalidateQueries({ queryKey: ['admin-staff-workload'] });
    queryClient.invalidateQueries({ queryKey: ['admin-appointment-stats'] });
  };

  return {
    appointments: appointmentsQuery.data || [],
    summary: summaryQuery.data || [],
    workload: workloadQuery.data || [],
    stats: statsQuery.data,
    isLoading: appointmentsQuery.isLoading || summaryQuery.isLoading,
    workloadLoading: workloadQuery.isLoading,
    error: appointmentsQuery.error || summaryQuery.error,
    invalidate,
    refetch: () =>
      Promise.all([
        appointmentsQuery.refetch(),
        summaryQuery.refetch(),
        workloadQuery.refetch(),
        statsQuery.refetch(),
      ]),
  };
}
