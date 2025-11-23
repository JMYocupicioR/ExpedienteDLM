import { useClinic } from '@/context/ClinicContext';
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

  const createPatientMutation = useMutation<Patient, Error, PatientInsert>({
    mutationFn: (patientData: PatientInsert) => {
      // Para médicos independientes, clinic_id será null en patientData
      // Para médicos de clínica, usamos activeClinic.id si está disponible
      const clinicId = patientData.clinic_id || activeClinic?.id || null;

      // Llamamos a nuestro servicio refactorizado
      return createPatientSvc(patientData, clinicId);
    },
    onSuccess: (newPatient) => {
      // Sensitive log removed for security;
      // Invalidación precisa: solo la lista de pacientes de la clínica activa
      queryClient.invalidateQueries({ queryKey: ['patients', activeClinic?.id] });
      // Opcional: también podemos actualizar la caché manualmente para una respuesta instantánea
      // queryClient.setQueryData(['patients', activeClinic?.id], (oldData: Patient[] | undefined) =>
      //   oldData ? [...oldData, newPatient] : [newPatient]
      // );
    },
    onError: (error) => {
      // Error log removed for security;
      // Aquí se pueden mostrar notificaciones de error al usuario
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PatientUpdate }) => {
      if (!activeClinic?.id) throw new Error('No hay clínica activa');
      const res = await updatePatientSvc(id, updates, activeClinic.id);
      return res as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', activeClinic?.id] });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!activeClinic?.id) throw new Error('No hay clínica activa');
      await deletePatientSvc(id, activeClinic.id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', activeClinic?.id] });
    },
  });

  return { patientsQuery, createPatientMutation, updatePatientMutation, deletePatientMutation };
};
