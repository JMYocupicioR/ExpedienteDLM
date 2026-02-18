import { supabase } from '@/lib/supabase';

export type PatientAppointment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  type: string;
  title: string;
  location: string | null;
  notes: string | null;
  duration: number;
};

export const appointmentService = {
  async getPatientAppointments(patientId: string): Promise<PatientAppointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true });
    if (error) throw error;
    return (data || []) as PatientAppointment[];
  },

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const day = new Date(date);
    const weekday = day.getDay();

    const { data: settings } = await supabase
      .from('medical_practice_settings')
      .select('*')
      .eq('user_id', doctorId)
      .maybeSingle();

    if (!settings) return [];

    const baseStart =
      weekday === 0
        ? settings.sunday_start_time
        : weekday === 6
          ? settings.saturday_start_time
          : settings.weekday_start_time;
    const baseEnd =
      weekday === 0
        ? settings.sunday_end_time
        : weekday === 6
          ? settings.saturday_end_time
          : settings.weekday_end_time;

    if (!baseStart || !baseEnd) return [];
    if (weekday === 0 && !settings.sunday_enabled) return [];

    const toMinutes = (value: string) => {
      const [h, m] = value.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    };
    const interval = settings.default_consultation_duration + settings.buffer_time_between_appointments;
    const slots: string[] = [];
    for (let mins = toMinutes(baseStart); mins < toMinutes(baseEnd); mins += interval) {
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }

    const { data: occupied } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient', 'in_progress']);

    const used = new Set((occupied || []).map((row) => row.appointment_time?.slice(0, 5)));
    return slots.filter((slot) => !used.has(slot));
  },

  async createPatientBooking(payload: {
    doctor_id: string;
    patient_id: string;
    clinic_id: string | null;
    appointment_date: string;
    appointment_time: string;
    type: string;
    title: string;
  }) {
    const { error } = await supabase.from('appointments').insert({
      ...payload,
      duration: 30,
      status: 'scheduled',
      location: 'Pendiente de confirmar',
      notes: 'Cita creada por paciente',
    });
    if (error) throw error;
  },
};
