import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPatientsByClinic,
  searchPatients,
  getPatientStats,
  type Patient,
} from '@/features/patients/services/patientService';

export interface AdminPatientFilters {
  search?: string;
  primaryDoctorId?: string;
  segment?: 'all' | 'new' | 'active' | 'noFollowUp' | 'inactive';
}

export function useAdminPatients(
  clinicId: string | null,
  filters: AdminPatientFilters = {},
  options?: { page?: number; limit?: number }
) {
  const { search, primaryDoctorId, segment } = filters;
  const queryClient = useQueryClient();

  const patientsQuery = useQuery<Patient[]>({
    queryKey: ['admin-patients', clinicId, search, primaryDoctorId, segment],
    queryFn: async () => {
      if (!clinicId) return [];
      if (search && search.trim().length >= 2) {
        return searchPatients(search.trim(), clinicId, options?.limit || 50);
      }
      const all = await getPatientsByClinic(clinicId);
      if (primaryDoctorId) {
        return all.filter((p: Patient) => p.primary_doctor_id === primaryDoctorId);
      }
      // Segment filters (client-side for now)
      if (segment === 'new') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return all.filter(
          (p: Patient) => p.created_at && new Date(p.created_at) >= monthAgo
        );
      }
      if (segment === 'inactive') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Would need last_consultation or last_appointment - simplified for now
        return all;
      }
      return all;
    },
    enabled: Boolean(clinicId),
  });

  const statsQuery = useQuery({
    queryKey: ['admin-patient-stats', clinicId],
    queryFn: () => (clinicId ? getPatientStats(clinicId) : Promise.resolve({ total: 0, newThisMonth: 0, activeThisMonth: 0 })),
    enabled: Boolean(clinicId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
    queryClient.invalidateQueries({ queryKey: ['admin-patient-stats'] });
  };

  return {
    patients: patientsQuery.data || [],
    stats: statsQuery.data,
    isLoading: patientsQuery.isLoading,
    error: patientsQuery.error,
    invalidate,
    refetch: () => Promise.all([patientsQuery.refetch(), statsQuery.refetch()]),
  };
}
