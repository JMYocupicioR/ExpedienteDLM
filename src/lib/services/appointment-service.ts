import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

// Tipos específicos para el sistema de citas
export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration: number; // en minutos
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency';
  location?: string;
  notes?: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  patient?: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
  };
  doctor?: {
    id: string;
    full_name: string;
    specialty?: string;
  };
}

export interface CreateAppointmentData {
  doctor_id: string;
  patient_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: Appointment['type'];
  location?: string;
  notes?: string;
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {
  status?: Appointment['status'];
  reminder_sent?: boolean;
}

export interface AppointmentFilters {
  doctor_id?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
  status?: Appointment['status'][];
  type?: Appointment['type'][];
}

// Mock de citas de ejemplo para desarrollo y testing
export const mockAppointments: Appointment[] = [
  {
    id: '1',
    doctor_id: 'doctor_1',
    patient_id: 'patient_1',
    title: 'Consulta General',
    description: 'Revisión médica general y evaluación de síntomas',
    appointment_date: '2024-01-15',
    appointment_time: '09:00',
    duration: 30,
    status: 'scheduled',
    type: 'consultation',
    location: 'Consultorio 1',
    notes: 'Paciente con dolor de cabeza recurrente',
    reminder_sent: false,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
    patient: {
      id: 'patient_1',
      full_name: 'María González',
      phone: '+52 555 123 4567',
      email: 'maria.gonzalez@email.com'
    },
    doctor: {
      id: 'doctor_1',
      full_name: 'Dr. Juan Pérez',
      specialty: 'Medicina General'
    }
  },
  {
    id: '2',
    doctor_id: 'doctor_1',
    patient_id: 'patient_2',
    title: 'Seguimiento Cardiológico',
    description: 'Control post-operatorio de cirugía cardíaca',
    appointment_date: '2024-01-15',
    appointment_time: '10:30',
    duration: 45,
    status: 'confirmed',
    type: 'follow_up',
    location: 'Consultorio 2',
    notes: 'Revisar evolución post-cirugía',
    reminder_sent: true,
    created_at: '2024-01-08T14:30:00Z',
    updated_at: '2024-01-12T09:15:00Z',
    patient: {
      id: 'patient_2',
      full_name: 'Carlos Rodríguez',
      phone: '+52 555 987 6543',
      email: 'carlos.rodriguez@email.com'
    },
    doctor: {
      id: 'doctor_1',
      full_name: 'Dr. Juan Pérez',
      specialty: 'Cardiología'
    }
  },
  {
    id: '3',
    doctor_id: 'doctor_1',
    patient_id: 'patient_3',
    title: 'Chequeo Preventivo',
    description: 'Examen médico anual de rutina',
    appointment_date: '2024-01-16',
    appointment_time: '14:00',
    duration: 60,
    status: 'scheduled',
    type: 'check_up',
    location: 'Consultorio 1',
    notes: 'Incluir análisis de sangre y radiografías',
    reminder_sent: false,
    created_at: '2024-01-05T16:45:00Z',
    updated_at: '2024-01-05T16:45:00Z',
    patient: {
      id: 'patient_3',
      full_name: 'Ana Martínez',
      phone: '+52 555 456 7890',
      email: 'ana.martinez@email.com'
    },
    doctor: {
      id: 'doctor_1',
      full_name: 'Dr. Juan Pérez',
      specialty: 'Medicina General'
    }
  }
];

class AppointmentService {
  private useRealAPI = false; // Cambiar a true cuando la API esté disponible

  /**
   * Obtiene las citas filtradas
   */
  async getAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
    if (!this.useRealAPI) {
      // Modo de desarrollo - usar datos mock
      let filteredAppointments = [...mockAppointments];

      if (filters.doctor_id) {
        filteredAppointments = filteredAppointments.filter(
          apt => apt.doctor_id === filters.doctor_id
        );
      }

      if (filters.patient_id) {
        filteredAppointments = filteredAppointments.filter(
          apt => apt.patient_id === filters.patient_id
        );
      }

      if (filters.date_from) {
        filteredAppointments = filteredAppointments.filter(
          apt => apt.appointment_date >= filters.date_from!
        );
      }

      if (filters.date_to) {
        filteredAppointments = filteredAppointments.filter(
          apt => apt.appointment_date <= filters.date_to!
        );
      }

      if (filters.status && filters.status.length > 0) {
        filteredAppointments = filteredAppointments.filter(
          apt => filters.status!.includes(apt.status)
        );
      }

      if (filters.type && filters.type.length > 0) {
        filteredAppointments = filteredAppointments.filter(
          apt => filters.type!.includes(apt.type)
        );
      }

      return filteredAppointments;
    }

    // Implementación futura con API real
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, full_name, phone, email),
          doctor:profiles(id, full_name, specialty)
        `);

      if (filters.doctor_id) {
        query = query.eq('doctor_id', filters.doctor_id);
      }

      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
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

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Crea una nueva cita
   */
  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    if (!this.useRealAPI) {
      // Modo de desarrollo - simular creación
      const newAppointment: Appointment = {
        id: `apt_${Date.now()}`,
        ...appointmentData,
        duration: appointmentData.duration || 30,
        status: 'scheduled',
        reminder_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));

      // En desarrollo, agregar a la lista mock local
      mockAppointments.push(newAppointment);
      
      return newAppointment;
    }

    // Implementación futura con API real
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          duration: appointmentData.duration || 30,
          status: 'scheduled',
          reminder_sent: false,
        })
        .select(`
          *,
          patient:patients(id, full_name, phone, email),
          doctor:profiles(id, full_name, specialty)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Actualiza una cita existente
   */
  async updateAppointment(id: string, updates: UpdateAppointmentData): Promise<Appointment> {
    if (!this.useRealAPI) {
      // Modo de desarrollo - simular actualización
      const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id);
      if (appointmentIndex === -1) {
        throw new Error('Cita no encontrada');
      }

      const updatedAppointment = {
        ...mockAppointments[appointmentIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300));

      mockAppointments[appointmentIndex] = updatedAppointment;
      return updatedAppointment;
    }

    // Implementación futura con API real
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
          patient:patients(id, full_name, phone, email),
          doctor:profiles(id, full_name, specialty)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Elimina una cita
   */
  async deleteAppointment(id: string): Promise<void> {
    if (!this.useRealAPI) {
      // Modo de desarrollo - simular eliminación
      const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id);
      if (appointmentIndex === -1) {
        throw new Error('Cita no encontrada');
      }

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 300));

      mockAppointments.splice(appointmentIndex, 1);
      return;
    }

    // Implementación futura con API real
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // Error log removed for security;
      throw error;
    }
  }

  /**
   * Obtiene las citas de un día específico
   */
  async getAppointmentsByDate(date: string, doctorId?: string): Promise<Appointment[]> {
    return this.getAppointments({
      date_from: date,
      date_to: date,
      doctor_id: doctorId,
    });
  }

  /**
   * Obtiene las citas de un rango de fechas (para vista de calendario)
   */
  async getAppointmentsByDateRange(dateFrom: string, dateTo: string, doctorId?: string): Promise<Appointment[]> {
    return this.getAppointments({
      date_from: dateFrom,
      date_to: dateTo,
      doctor_id: doctorId,
    });
  }

  /**
   * Cambia el modo de API (para desarrollo vs producción)
   */
  setAPIMode(useReal: boolean): void {
    this.useRealAPI = useReal;
  }

  /**
   * Verifica disponibilidad de horario
   */
  async checkAvailability(doctorId: string, date: string, time: string, duration: number = 30): Promise<boolean> {
    const appointments = await this.getAppointmentsByDate(date, doctorId);
    
    const targetStart = new Date(`${date}T${time}`);
    const targetEnd = new Date(targetStart.getTime() + duration * 60000);

    for (const appointment of appointments) {
      const aptStart = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const aptEnd = new Date(aptStart.getTime() + appointment.duration * 60000);

      // Verificar si hay conflicto de horario
      if (
        (targetStart >= aptStart && targetStart < aptEnd) ||
        (targetEnd > aptStart && targetEnd <= aptEnd) ||
        (targetStart <= aptStart && targetEnd >= aptEnd)
      ) {
        return false;
      }
    }

    return true;
  }
}

// Exportar instancia única del servicio
export const appointmentService = new AppointmentService();

// Funciones de conveniencia para importar individualmente
export const createAppointment = (data: CreateAppointmentData) => appointmentService.createAppointment(data);
export const updateAppointment = (id: string, updates: UpdateAppointmentData) => appointmentService.updateAppointment(id, updates);
export const deleteAppointment = (id: string) => appointmentService.deleteAppointment(id);
export const getAppointments = (filters?: AppointmentFilters) => appointmentService.getAppointments(filters);
