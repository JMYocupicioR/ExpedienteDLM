import { supabase } from '@/lib/supabase';
import { EnhancedAppointment } from '@/lib/database.types';

export interface MedicalRecordAppointmentData {
  appointment_id: string;
  consultation_id?: string;
  prescription_id?: string;
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    oxygen_saturation?: number;
  };
  diagnosis?: string;
  treatment_plan?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  notes?: string;
}

export interface AppointmentConsultationLink {
  appointment: EnhancedAppointment;
  consultation?: {
    id: string;
    diagnosis: string;
    symptoms: string;
    treatment_plan: string;
    vital_signs: any;
    follow_up_required: boolean;
    follow_up_date?: string;
    notes: string;
    created_at: string;
  };
  prescription?: {
    id: string;
    medications: any[];
    instructions: string;
    duration_days: number;
    notes: string;
    created_at: string;
  };
}

export class MedicalRecordAppointmentIntegrationService {
  /**
   * Link an appointment with a consultation record
   */
  static async linkAppointmentToConsultation(
    appointmentId: string,
    consultationData: {
      diagnosis: string;
      symptoms?: string;
      treatment_plan?: string;
      vital_signs?: any;
      follow_up_required?: boolean;
      follow_up_date?: string;
      notes?: string;
    }
  ): Promise<{ consultation_id: string }> {
    try {
      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error('Appointment not found');
      }

      // Create consultation record
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .insert({
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          clinic_id: appointment.clinic_id,
          appointment_id: appointmentId,
          diagnosis: consultationData.diagnosis,
          symptoms: consultationData.symptoms || '',
          treatment_plan: consultationData.treatment_plan || '',
          vital_signs: consultationData.vital_signs || {},
          follow_up_required: consultationData.follow_up_required || false,
          follow_up_date: consultationData.follow_up_date,
          notes: consultationData.notes || '',
          consultation_date: appointment.appointment_date,
          consultation_time: appointment.appointment_time,
        })
        .select()
        .single();

      if (consultationError) {
        throw consultationError;
      }

      // Update appointment with consultation link
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          consultation_id: consultation.id,
          status: 'completed'
        })
        .eq('id', appointmentId);

      if (updateError) {
        throw updateError;
      }

      // Create follow-up appointment if required
      if (consultationData.follow_up_required && consultationData.follow_up_date) {
        await this.createFollowUpAppointment(appointment, consultation.id, consultationData.follow_up_date);
      }

      return { consultation_id: consultation.id };
    } catch (error) {
      console.error('Error linking appointment to consultation:', error);
      throw error;
    }
  }

  /**
   * Link an appointment/consultation with a prescription
   */
  static async linkToPrescription(
    appointmentId: string,
    prescriptionData: {
      medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
      }>;
      instructions?: string;
      duration_days?: number;
      notes?: string;
    }
  ): Promise<{ prescription_id: string }> {
    try {
      // Get appointment and consultation details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          consultations!inner(*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error('Appointment not found');
      }

      // Create prescription record
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          clinic_id: appointment.clinic_id,
          consultation_id: appointment.consultation_id,
          medications: prescriptionData.medications,
          instructions: prescriptionData.instructions || '',
          duration_days: prescriptionData.duration_days || 30,
          notes: prescriptionData.notes || '',
          prescribed_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (prescriptionError) {
        throw prescriptionError;
      }

      // Update appointment with prescription link
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ prescription_id: prescription.id })
        .eq('id', appointmentId);

      if (updateError) {
        throw updateError;
      }

      return { prescription_id: prescription.id };
    } catch (error) {
      console.error('Error linking to prescription:', error);
      throw error;
    }
  }

  /**
   * Get complete medical record for an appointment
   */
  static async getAppointmentMedicalRecord(appointmentId: string): Promise<AppointmentConsultationLink> {
    try {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(*),
          consultations(*),
          prescriptions(*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error('Appointment not found');
      }

      return {
        appointment: appointment as EnhancedAppointment,
        consultation: appointment.consultations?.[0] || undefined,
        prescription: appointment.prescriptions?.[0] || undefined,
      };
    } catch (error) {
      console.error('Error getting appointment medical record:', error);
      throw error;
    }
  }

  /**
   * Get patient's appointment history with medical records
   */
  static async getPatientAppointmentHistory(
    patientId: string,
    limit: number = 10
  ): Promise<AppointmentConsultationLink[]> {
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(*),
          consultations(*),
          prescriptions(*)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return appointments.map(appointment => ({
        appointment: appointment as EnhancedAppointment,
        consultation: appointment.consultations?.[0] || undefined,
        prescription: appointment.prescriptions?.[0] || undefined,
      }));
    } catch (error) {
      console.error('Error getting patient appointment history:', error);
      throw error;
    }
  }

  /**
   * Create a follow-up appointment
   */
  private static async createFollowUpAppointment(
    originalAppointment: EnhancedAppointment,
    consultationId: string,
    followUpDate: string
  ): Promise<string> {
    try {
      const { data: followUpAppointment, error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: originalAppointment.doctor_id,
          patient_id: originalAppointment.patient_id,
          clinic_id: originalAppointment.clinic_id,
          title: `Seguimiento - ${originalAppointment.title}`,
          description: `Cita de seguimiento para consulta del ${originalAppointment.appointment_date}`,
          appointment_date: followUpDate,
          appointment_time: originalAppointment.appointment_time,
          duration: originalAppointment.duration,
          status: 'scheduled',
          type: 'follow_up',
          location: originalAppointment.location,
          room_number: originalAppointment.room_number,
          notes: `Seguimiento de consulta ID: ${consultationId}`,
          confirmation_required: true,
          google_calendar_sync_enabled: originalAppointment.google_calendar_sync_enabled,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return followUpAppointment.id;
    } catch (error) {
      console.error('Error creating follow-up appointment:', error);
      throw error;
    }
  }

  /**
   * Update appointment status based on medical record completion
   */
  static async updateAppointmentStatus(
    appointmentId: string,
    status: 'in_progress' | 'completed',
    additionalData?: {
      notes?: string;
      completed_at?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (additionalData?.notes) {
        updateData.notes = additionalData.notes;
      }

      if (status === 'completed') {
        updateData.completed_at = additionalData?.completed_at || new Date().toISOString();
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  /**
   * Get appointments ready for medical record creation
   */
  static async getAppointmentsReadyForConsultation(
    doctorId: string,
    date?: string
  ): Promise<EnhancedAppointment[]> {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(*)
        `)
        .eq('doctor_id', doctorId)
        .in('status', ['confirmed', 'confirmed_by_patient', 'in_progress'])
        .is('consultation_id', null);

      if (date) {
        query = query.eq('appointment_date', date);
      } else {
        // Get today's appointments by default
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('appointment_date', today);
      }

      const { data: appointments, error } = await query
        .order('appointment_time', { ascending: true });

      if (error) {
        throw error;
      }

      return appointments as EnhancedAppointment[];
    } catch (error) {
      console.error('Error getting appointments ready for consultation:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive patient medical summary
   */
  static async getPatientMedicalSummary(patientId: string): Promise<{
    patient: any;
    totalAppointments: number;
    completedConsultations: number;
    activePrescriptions: number;
    lastConsultation?: any;
    upcomingAppointments: EnhancedAppointment[];
    medicalHistory: AppointmentConsultationLink[];
  }> {
    try {
      // Get patient details
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) {
        throw patientError;
      }

      // Get appointment statistics
      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId);

      const { count: completedConsultations } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId);

      const { count: activePrescriptions } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .gte('prescribed_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      // Get last consultation
      const { data: lastConsultation } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get upcoming appointments
      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(*)
        `)
        .eq('patient_id', patientId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

      // Get recent medical history
      const medicalHistory = await this.getPatientAppointmentHistory(patientId, 5);

      return {
        patient,
        totalAppointments: totalAppointments || 0,
        completedConsultations: completedConsultations || 0,
        activePrescriptions: activePrescriptions || 0,
        lastConsultation,
        upcomingAppointments: (upcomingAppointments as EnhancedAppointment[]) || [],
        medicalHistory,
      };
    } catch (error) {
      console.error('Error getting patient medical summary:', error);
      throw error;
    }
  }
}

export default MedicalRecordAppointmentIntegrationService;