import { useState, useEffect, useCallback } from 'react';
import { 
  Appointment, 
  CreateAppointmentData, 
  UpdateAppointmentData,
  AppointmentFilters,
  appointmentService 
} from '@/lib/services/appointment-service';
import { useAuth } from '@/features/authentication/hooks/useAuth';

export interface UseAppointmentsResult {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAppointment: (data: CreateAppointmentData) => Promise<Appointment>;
  updateAppointment: (id: string, data: UpdateAppointmentData) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentsByDate: (date: string) => Promise<Appointment[]>;
}

export function useAppointments(filters?: AppointmentFilters): UseAppointmentsResult {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const queryFilters = {
        ...filters,
        doctor_id: user.id // Filtrar por doctor actual
      };
      
      const data = await appointmentService.getAppointments(queryFilters);
      setAppointments(data);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(err instanceof Error ? err.message : 'Error loading appointments');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const createAppointment = useCallback(async (data: CreateAppointmentData): Promise<Appointment> => {
    try {
      const newAppointment = await appointmentService.createAppointment(data);
      setAppointments(prev => [...prev, newAppointment]);
      return newAppointment;
    } catch (err) {
      console.error('Error creating appointment:', err);
      throw err;
    }
  }, []);

  const updateAppointment = useCallback(async (id: string, data: UpdateAppointmentData): Promise<Appointment> => {
    try {
      const updatedAppointment = await appointmentService.updateAppointment(id, data);
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? updatedAppointment : apt)
      );
      return updatedAppointment;
    } catch (err) {
      console.error('Error updating appointment:', err);
      throw err;
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    try {
      await appointmentService.deleteAppointment(id);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
    } catch (err) {
      console.error('Error deleting appointment:', err);
      throw err;
    }
  }, []);

  const getAppointmentsByDate = useCallback(async (date: string): Promise<Appointment[]> => {
    try {
      const dateAppointments = await appointmentService.getAppointmentsByDate(date, user?.id);
      return dateAppointments;
    } catch (err) {
      console.error('Error getting appointments by date:', err);
      throw err;
    }
  }, [user?.id]);

  return {
    appointments,
    loading,
    error,
    refetch: loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDate
  };
}

export default useAppointments;
