import { supabase } from '@/lib/supabase';
import { 
  EnhancedAppointment, 
  CreateAppointmentPayload, 
  UpdateAppointmentPayload,
  AppointmentFilters,
  ScheduleAppointmentRequest,
  ScheduleAppointmentResponse,
  AppointmentAvailabilityRequest,
  AppointmentAvailabilityResponse,
  AppointmentStatus
} from '../database.types';

/**
 * Servicio mejorado para el manejo de citas médicas
 * Utiliza Edge Functions para operaciones críticas como creación y verificación de conflictos
 */
class EnhancedAppointmentService {

  /**
   * Crea una nueva cita usando la Edge Function para validación robusta
   */
  async createAppointment(data: CreateAppointmentPayload): Promise<EnhancedAppointment> {
    try {
      const requestPayload: ScheduleAppointmentRequest = {
        doctor_id: data.doctor_id,
        patient_id: data.patient_id,
        clinic_id: data.clinic_id,
        title: data.title,
        description: data.description,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        duration: data.duration || 30,
        type: data.type,
        location: data.location,
        notes: data.notes,
      };

      const { data: response, error } = await supabase.functions.invoke<ScheduleAppointmentResponse>(
        'schedule-appointment',
        {
          body: requestPayload,
        }
      );

      if (error) {
        console.error('Error calling schedule-appointment function:', error);
        throw new Error(`Error en la función de agendamiento: ${error.message}`);
      }

      if (!response.success) {
        throw new Error(response.error?.message || 'Error desconocido al crear la cita');
      }

      if (!response.appointment) {
        throw new Error('La cita fue creada pero no se recibieron los datos');
      }

      return response.appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  /**
   * Verifica la disponibilidad de un horario usando Edge Function
   */
  async checkAvailability(
    doctorId: string,
    appointmentDate: string,
    appointmentTime: string,
    duration: number = 30,
    excludeAppointmentId?: string
  ): Promise<{ available: boolean; conflictDetails?: any }> {
    try {
      const requestPayload: AppointmentAvailabilityRequest = {
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        duration,
        exclude_appointment_id: excludeAppointmentId,
      };

      const { data: response, error } = await supabase.functions.invoke<AppointmentAvailabilityResponse>(
        'check-appointment-availability',
        {
          body: requestPayload,
        }
      );

      if (error) {
        console.error('Error calling check-appointment-availability function:', error);
        throw new Error(`Error verificando disponibilidad: ${error.message}`);
      }

      return {
        available: response.available,
        conflictDetails: response.conflict_details,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Obtiene las citas con filtros
   */
  async getAppointments(filters: AppointmentFilters = {}): Promise<EnhancedAppointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(
            id,
            full_name,
            phone,
            email,
            birth_date
          ),
          doctor:profiles!appointments_doctor_id_fkey(
            id,
            full_name,
            specialty,
            phone
          ),
          clinic:clinics(
            id,
            name,
            address
          )
        `);

      // Aplicar filtros
      if (filters.doctor_id) {
        query = query.eq('doctor_id', filters.doctor_id);
      }

      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }

      if (filters.clinic_id) {
        query = query.eq('clinic_id', filters.clinic_id);
      }

      if (filters.date_from) {
        query = query.gte('appointment_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('appointment_date', filters.date_to);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.type && filters.type.length > 0) {
        query = query.in('type', filters.type);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAppointments:', error);
      throw error;
    }
  }

  /**
   * Actualiza una cita existente
   */
  async updateAppointment(id: string, updates: UpdateAppointmentPayload): Promise<EnhancedAppointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          patient:patients(
            id,
            full_name,
            phone,
            email,
            birth_date
          ),
          doctor:profiles!appointments_doctor_id_fkey(
            id,
            full_name,
            specialty,
            phone
          ),
          clinic:clinics(
            id,
            name,
            address
          )
        `)
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateAppointment:', error);
      throw error;
    }
  }

  /**
   * Cambia el estado de una cita
   */
  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<EnhancedAppointment> {
    return this.updateAppointment(id, { status });
  }

  /**
   * Elimina (cancela) una cita
   */
  async cancelAppointment(id: string, cancelledBy: 'clinic' | 'patient' = 'clinic'): Promise<void> {
    try {
      const status: AppointmentStatus = cancelledBy === 'clinic' 
        ? 'cancelled_by_clinic' 
        : 'cancelled_by_patient';

      await this.updateAppointmentStatus(id, status);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Obtiene las citas de un día específico
   */
  async getAppointmentsByDate(date: string, doctorId?: string, clinicId?: string): Promise<EnhancedAppointment[]> {
    return this.getAppointments({
      date_from: date,
      date_to: date,
      doctor_id: doctorId,
      clinic_id: clinicId,
    });
  }

  /**
   * Obtiene las citas de un rango de fechas (para vista de calendario)
   */
  async getAppointmentsByDateRange(
    dateFrom: string, 
    dateTo: string, 
    doctorId?: string,
    clinicId?: string
  ): Promise<EnhancedAppointment[]> {
    return this.getAppointments({
      date_from: dateFrom,
      date_to: dateTo,
      doctor_id: doctorId,
      clinic_id: clinicId,
    });
  }

  /**
   * Obtiene las próximas citas de un médico
   */
  async getUpcomingAppointments(
    doctorId: string,
    limit: number = 10
  ): Promise<EnhancedAppointment[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(
            id,
            full_name,
            phone,
            email
          )
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', today)
        .in('status', ['scheduled', 'confirmed_by_patient'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUpcomingAppointments:', error);
      throw error;
    }
  }

  /**
   * Marca el recordatorio como enviado
   */
  async markReminderSent(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error marking reminder as sent:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in markReminderSent:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de citas para un médico o clínica
   */
  async getAppointmentStats(doctorId?: string, clinicId?: string, dateFrom?: string, dateTo?: string) {
    try {
      let query = supabase
        .from('appointments')
        .select('status, type, appointment_date');

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      if (dateFrom) {
        query = query.gte('appointment_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('appointment_date', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching appointment stats:', error);
        throw error;
      }

      // Procesar estadísticas
      const stats = {
        total: data?.length || 0,
        by_status: {} as Record<AppointmentStatus, number>,
        by_type: {} as Record<string, number>,
        today: 0,
        this_week: 0,
        this_month: 0,
      };

      const today = new Date().toISOString().split('T')[0];
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);

      data?.forEach(appointment => {
        // Por estado
        stats.by_status[appointment.status] = (stats.by_status[appointment.status] || 0) + 1;
        
        // Por tipo
        stats.by_type[appointment.type] = (stats.by_type[appointment.type] || 0) + 1;
        
        // Por fecha
        if (appointment.appointment_date === today) {
          stats.today++;
        }
        
        if (appointment.appointment_date >= thisWeekStart.toISOString().split('T')[0]) {
          stats.this_week++;
        }
        
        if (appointment.appointment_date >= thisMonthStart.toISOString().split('T')[0]) {
          stats.this_month++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getAppointmentStats:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
export const enhancedAppointmentService = new EnhancedAppointmentService();

// Funciones de conveniencia para importar individualmente
export const createAppointment = (data: CreateAppointmentPayload) => 
  enhancedAppointmentService.createAppointment(data);

export const checkAvailability = (
  doctorId: string,
  appointmentDate: string,
  appointmentTime: string,
  duration?: number,
  excludeAppointmentId?: string
) => enhancedAppointmentService.checkAvailability(
  doctorId, 
  appointmentDate, 
  appointmentTime, 
  duration, 
  excludeAppointmentId
);

export const updateAppointment = (id: string, updates: UpdateAppointmentPayload) => 
  enhancedAppointmentService.updateAppointment(id, updates);

export const cancelAppointment = (id: string, cancelledBy?: 'clinic' | 'patient') => 
  enhancedAppointmentService.cancelAppointment(id, cancelledBy);

export const getAppointments = (filters?: AppointmentFilters) => 
  enhancedAppointmentService.getAppointments(filters);

export const getAppointmentsByDate = (date: string, doctorId?: string, clinicId?: string) => 
  enhancedAppointmentService.getAppointmentsByDate(date, doctorId, clinicId);

export const getAppointmentsByDateRange = (
  dateFrom: string, 
  dateTo: string, 
  doctorId?: string,
  clinicId?: string
) => enhancedAppointmentService.getAppointmentsByDateRange(dateFrom, dateTo, doctorId, clinicId);

export const getUpcomingAppointments = (doctorId: string, limit?: number) => 
  enhancedAppointmentService.getUpcomingAppointments(doctorId, limit);

export const updateAppointmentStatus = (id: string, status: AppointmentStatus) => 
  enhancedAppointmentService.updateAppointmentStatus(id, status);

export const markReminderSent = (appointmentId: string) => 
  enhancedAppointmentService.markReminderSent(appointmentId);

export const getAppointmentStats = (
  doctorId?: string, 
  clinicId?: string, 
  dateFrom?: string, 
  dateTo?: string
) => enhancedAppointmentService.getAppointmentStats(doctorId, clinicId, dateFrom, dateTo);
