import { useClinic } from '@/features/clinic/context/ClinicContext';
import {
  createPatient as createPatientSvc,
  deletePatient as deletePatientSvc,
  getPatientsByClinic,
  updatePatient as updatePatientSvc,
  type Patient,
  type PatientInsert,
  type PatientUpdate,
} from '@/features/patients/services/patientService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UsePatientsResult {
  patientsQuery: ReturnType<typeof useQuery<Patient[], unknown>>;
  createPatientMutation: ReturnType<typeof useMutation>;
  updatePatientMutation: ReturnType<typeof useMutation>;
  deletePatientMutation: ReturnType<typeof useMutation>;
}

export const usePatients = (): UsePatientsResult => {
  const { activeClinic } = useClinic();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ['patients', activeClinic?.id],
    queryFn: async () => {
      if (!activeClinic?.id) return [] as Patient[];
      const res = await getPatientsByClinic(activeClinic.id);
      return res;
    },
    enabled: !!activeClinic?.id,
  });

  const createPatientMutation = useMutation({
    mutationFn: async (
      patientData: Omit<PatientInsert, 'id' | 'created_at' | 'updated_at' | 'clinic_id'>
    ) => {
      if (!activeClinic?.id) throw new Error('No hay clínica activa');
      const res = await createPatientSvc(patientData as any, activeClinic.id);
      return res as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PatientUpdate }) => {
      if (!activeClinic?.id) throw new Error('No hay clínica activa');
      const res = await updatePatientSvc(id, updates, activeClinic.id);
      return res as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!activeClinic?.id) throw new Error('No hay clínica activa');
      await deletePatientSvc(id, activeClinic.id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return { patientsQuery, createPatientMutation, updatePatientMutation, deletePatientMutation };
};
