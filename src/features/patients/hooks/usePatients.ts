import { useClinic } from '@/features/clinic/context/ClinicContext';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import {
  createPatient as createPatientSvc,
  deletePatient as deletePatientSvc,
  getPatientsByClinic,
  getPatientsForDoctor,
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
  const { activeClinic, isIndependentDoctor } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ['patients', activeClinic?.id ?? (isIndependentDoctor ? 'independent' : 'none')],
    queryFn: async () => {
      if (activeClinic?.id) {
        return getPatientsByClinic(activeClinic.id);
      }
      if (isIndependentDoctor && user?.id) {
        return getPatientsForDoctor(user.id);
      }
      return [] as Patient[];
    },
    enabled: Boolean(activeClinic?.id || (isIndependentDoctor && user?.id)),
  });

  const createPatientMutation = useMutation<Patient, Error, PatientInsert>({
    mutationFn: (patientData: PatientInsert) => {
      // Para médicos independientes, clinic_id será null en patientData
      // Para médicos de clínica, usamos activeClinic.id si está disponible
      const clinicId = patientData.clinic_id || activeClinic?.id || null;
      const payload = {
        ...patientData,
        primary_doctor_id: patientData.primary_doctor_id || user?.id || null,
      };

      // Llamamos a nuestro servicio refactorizado
      return createPatientSvc(payload, clinicId);
    },
    onSuccess: (newPatient) => {
      // Sensitive log removed for security;
      // Invalidación precisa: solo la lista de pacientes de la clínica activa
      queryClient.invalidateQueries({
        queryKey: ['patients', activeClinic?.id ?? (isIndependentDoctor ? 'independent' : 'none')],
      });
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
      const clinicId = activeClinic?.id ?? null;
      if (!clinicId && !(isIndependentDoctor && user?.id)) {
        throw new Error('No hay clínica activa ni modo independiente disponible');
      }
      const res = await updatePatientSvc(id, updates, clinicId);
      return res as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['patients', activeClinic?.id ?? (isIndependentDoctor ? 'independent' : 'none')],
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      const clinicId = activeClinic?.id ?? null;
      if (!clinicId && !(isIndependentDoctor && user?.id)) {
        throw new Error('No hay clínica activa ni modo independiente disponible');
      }
      await deletePatientSvc(id, clinicId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['patients', activeClinic?.id ?? (isIndependentDoctor ? 'independent' : 'none')],
      });
    },
  });

  return { patientsQuery, createPatientMutation, updatePatientMutation, deletePatientMutation };
};
