import { useState, useEffect, useCallback } from 'react';
import { 
  EnhancedAppointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload,
  AppointmentFilters,
  AppointmentStatus,
  enhancedAppointmentService 
} from '@/lib/services/enhanced-appointment-service';
import { useAuth } from '@/features/authentication/hooks/useAuth';

export interface UseEnhancedAppointmentsOptions {
  autoLoad?: boolean;
  filters?: AppointmentFilters;
}

export interface UseEnhancedAppointmentsReturn {
  appointments: EnhancedAppointment[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createAppointment: (data: CreateAppointmentPayload) => Promise<EnhancedAppointment>;
  updateAppointment: (id: string, data: UpdateAppointmentPayload) => Promise<EnhancedAppointment>;
  cancelAppointment: (id: string, cancelledBy?: 'clinic' | 'patient') => Promise<void>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<EnhancedAppointment>;
  
  // Data fetching
  loadAppointments: (filters?: AppointmentFilters) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  
  // Availability checking
  checkAvailability: (
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    duration?: number,
    excludeAppointmentId?: string
  ) => Promise<{ available: boolean; conflictDetails?: any }>;
  
  // Utility functions
  getAppointmentById: (id: string) => EnhancedAppointment | undefined;
  getAppointmentsByDate: (date: string) => EnhancedAppointment[];
  getUpcomingAppointments: (doctorId: string, limit?: number) => Promise<EnhancedAppointment[]>;
  
  // Statistics
  getStats: () => {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    byType: Record<string, number>;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export function useEnhancedAppointments(
  options: UseEnhancedAppointmentsOptions = {}
): UseEnhancedAppointmentsReturn {
  const { autoLoad = true, filters: initialFilters } = options;
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState<EnhancedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<AppointmentFilters | undefined>(initialFilters);

  // Load appointments
  const loadAppointments = useCallback(async (filters?: AppointmentFilters) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filtersToUse = filters || currentFilters;
      const data = await enhancedAppointmentService.getAppointments(filtersToUse);
      setAppointments(data);
      setCurrentFilters(filtersToUse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las citas';
      setError(errorMessage);
      // Error log removed for security;
    } finally {
      setLoading(false);
    }
  }, [user, currentFilters]);

  // Refresh appointments with current filters
  const refreshAppointments = useCallback(() => {
    return loadAppointments(currentFilters);
  }, [loadAppointments, currentFilters]);

  // Create appointment
  const createAppointment = useCallback(async (data: CreateAppointmentPayload): Promise<EnhancedAppointment> => {
    setError(null);
    
    try {
      const newAppointment = await enhancedAppointmentService.createAppointment(data);
      
      // Add to local state if it matches current filters
      setAppointments(prev => [...prev, newAppointment]);
      
      return newAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la cita';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update appointment
  const updateAppointment = useCallback(async (id: string, data: UpdateAppointmentPayload): Promise<EnhancedAppointment> => {
    setError(null);
    
    try {
      const updatedAppointment = await enhancedAppointmentService.updateAppointment(id, data);
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? updatedAppointment : apt)
      );
      
      return updatedAppointment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la cita';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Cancel appointment
  const cancelAppointment = useCallback(async (id: string, cancelledBy: 'clinic' | 'patient' = 'clinic') => {
    setError(null);
    
    try {
      await enhancedAppointmentService.cancelAppointment(id, cancelledBy);
      
      // Update local state
      const status: AppointmentStatus = cancelledBy === 'clinic' 
        ? 'cancelled_by_clinic' 
        : 'cancelled_by_patient';
        
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status } : apt)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cancelar la cita';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update status
  const updateStatus = useCallback(async (id: string, status: AppointmentStatus): Promise<EnhancedAppointment> => {
    return updateAppointment(id, { status });
  }, [updateAppointment]);

  // Check availability
  const checkAvailability = useCallback(async (
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    duration: number = 30,
    excludeAppointmentId?: string
  ) => {
    setError(null);
    
    try {
      return await enhancedAppointmentService.checkAvailability(
        doctorId,
        appointmentDate,
        appointmentTime,
        duration,
        excludeAppointmentId
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar disponibilidad';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get appointment by ID
  const getAppointmentById = useCallback((id: string): EnhancedAppointment | undefined => {
    return appointments.find(apt => apt.id === id);
  }, [appointments]);

  // Get appointments by date
  const getAppointmentsByDate = useCallback((date: string): EnhancedAppointment[] => {
    return appointments.filter(apt => apt.appointment_date === date);
  }, [appointments]);

  // Get upcoming appointments
  const getUpcomingAppointments = useCallback(async (doctorId: string, limit?: number): Promise<EnhancedAppointment[]> => {
    setError(null);
    
    try {
      return await enhancedAppointmentService.getUpcomingAppointments(doctorId, limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar próximas citas';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);

    const stats = {
      total: appointments.length,
      byStatus: {} as Record<AppointmentStatus, number>,
      byType: {} as Record<string, number>,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    };

    appointments.forEach(appointment => {
      // By status
      stats.byStatus[appointment.status] = (stats.byStatus[appointment.status] || 0) + 1;
      
      // By type
      stats.byType[appointment.type] = (stats.byType[appointment.type] || 0) + 1;
      
      // By date
      if (appointment.appointment_date === today) {
        stats.today++;
      }
      
      if (appointment.appointment_date >= thisWeekStart.toISOString().split('T')[0]) {
        stats.thisWeek++;
      }
      
      if (appointment.appointment_date >= thisMonthStart.toISOString().split('T')[0]) {
        stats.thisMonth++;
      }
    });

    return stats;
  }, [appointments]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadAppointments();
    }
  }, [autoLoad, user, loadAppointments]);

  return {
    appointments,
    loading,
    error,
    
    // CRUD operations
    createAppointment,
    updateAppointment,
    cancelAppointment,
    updateStatus,
    
    // Data fetching
    loadAppointments,
    refreshAppointments,
    
    // Availability checking
    checkAvailability,
    
    // Utility functions
    getAppointmentById,
    getAppointmentsByDate,
    getUpcomingAppointments,
    
    // Statistics
    getStats,
  };
}

export default useEnhancedAppointments;
