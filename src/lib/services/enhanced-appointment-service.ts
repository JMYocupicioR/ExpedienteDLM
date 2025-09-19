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
      // Validaciones básicas en el frontend
      if (!data.doctor_id || !data.patient_id || !data.appointment_date || !data.appointment_time) {
        throw new Error('Faltan datos obligatorios para crear la cita');
      }

      // Validar que la fecha no sea en el pasado
      const appointmentDateTime = new Date(`${data.appointment_date}T${data.appointment_time}`);
      if (appointmentDateTime < new Date()) {
        throw new Error('No se pueden programar citas en el pasado');
      }

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
        // Manejar errores específicos de la Edge Function
        if (error.message?.includes('unauthorized')) {
          throw new Error('No tienes permisos para crear esta cita');
        }
        if (error.message?.includes('conflict')) {
          throw new Error('El horario seleccionado ya está ocupado');
        }
        throw new Error(`Error en el servicio de citas: ${error.message}`);
      }

      if (!response?.success) {
        // Manejar errores específicos del response
        if (response?.error?.code === 'conflict') {
          throw new Error('El horario seleccionado ya está ocupado. Por favor, elige otro horario.');
        }
        if (response?.error?.code === 'validation_failed') {
          throw new Error('Los datos de la cita no son válidos');
        }
        throw new Error(response?.error?.message || 'Error desconocido al crear la cita');
      }

      if (!response.appointment) {
        throw new Error('La cita fue creada pero no se recibieron los datos');
      }

      return response.appointment;
    } catch (error) {
      // Error log removed for security;

      // Re-lanzar errores conocidos
      if (error instanceof Error) {
        throw error;
      }

      // Manejar errores desconocidos
      throw new Error('Error inesperado al crear la cita');
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
      // Validaciones básicas
      if (!doctorId || !appointmentDate || !appointmentTime) {
        throw new Error('Faltan parámetros obligatorios para verificar disponibilidad');
      }

      // Validar formato de fecha y hora
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const timeRegex = /^\d{2}:\d{2}$/;

      if (!dateRegex.test(appointmentDate)) {
        throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
      }

      if (!timeRegex.test(appointmentTime)) {
        throw new Error('Formato de hora inválido. Use HH:MM');
      }

      // Validar que la fecha no sea en el pasado
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      if (appointmentDateTime < new Date()) {
        return {
          available: false,
          conflictDetails: {
            reason: 'past_date',
            message: 'No se pueden programar citas en el pasado'
          }
        };
      }

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
        // Manejar errores específicos de la Edge Function
        if (error.message?.includes('unauthorized')) {
          throw new Error('No tienes permisos para verificar esta disponibilidad');
        }
        throw new Error(`Error verificando disponibilidad: ${error.message}`);
      }

      if (!response) {
        throw new Error('No se recibió respuesta del servicio de disponibilidad');
      }

      return {
        available: response.available || false,
        conflictDetails: response.conflict_details,
      };
    } catch (error) {
      // Error log removed for security;

      // Re-lanzar errores conocidos
      if (error instanceof Error) {
        throw error;
      }

      // Fallback para errores desconocidos
      throw new Error('Error inesperado al verificar disponibilidad');
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
        // Error log removed for security;
        throw error;
      }

      return data || [];
    } catch (error) {
      // Error log removed for security;
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
        // Error log removed for security;
        throw error;
      }

      return data;
    } catch (error) {
      // Error log removed for security;
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
      // Error log removed for security;
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
        // Error log removed for security;
        throw error;
      }

      return data || [];
    } catch (error) {
      // Error log removed for security;
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
        // Error log removed for security;
        throw error;
      }
    } catch (error) {
      // Error log removed for security;
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
        // Error log removed for security;
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
      // Error log removed for security;
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
