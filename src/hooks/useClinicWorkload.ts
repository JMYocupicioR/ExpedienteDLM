import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import { getStaffWorkload, type StaffWorkloadRow } from '@/lib/services/admin-appointment-service';

export function useClinicWorkload(
  clinicId: string | null,
  options?: { dateFrom?: string; dateTo?: string; staffId?: string }
) {
  const queryClient = useQueryClient();
  const from = options?.dateFrom || format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const to = options?.dateTo || format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const workloadQuery = useQuery<StaffWorkloadRow[]>({
    queryKey: ['clinic-workload', clinicId, from, to, options?.staffId],
    queryFn: () =>
      clinicId ? getStaffWorkload(clinicId, from, to, options?.staffId) : Promise.resolve([]),
    enabled: Boolean(clinicId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clinic-workload'] });
  };

  return {
    workload: workloadQuery.data || [],
    isLoading: workloadQuery.isLoading,
    error: workloadQuery.error,
    invalidate,
    refetch: workloadQuery.refetch,
  };
}
