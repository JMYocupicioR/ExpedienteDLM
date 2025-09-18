import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CreateAppointmentPayload } from '@/lib/database.types';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn(),
  },
}));

import { enhancedAppointmentService } from '../enhanced-appointment-service';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('enhancedAppointmentService', () => {
  it('creates an appointment via edge function', async () => {
    const payload: CreateAppointmentPayload = {
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      clinic_id: 'clinic-1',
      title: 'Consulta de prueba',
      appointment_date: '2025-09-18',
      appointment_time: '09:00',
      type: 'consultation',
    };

    const mockAppointment = {
      id: 'appointment-1',
      ...payload,
      duration: 30,
      status: 'scheduled',
    } as const;

    invokeMock.mockResolvedValueOnce({
      data: { success: true, appointment: mockAppointment },
      error: null,
    });

    const result = await enhancedAppointmentService.createAppointment(payload);

    expect(result).toEqual(mockAppointment);
    expect(invokeMock).toHaveBeenCalledWith('schedule-appointment', {
      body: {
        doctor_id: payload.doctor_id,
        patient_id: payload.patient_id,
        clinic_id: payload.clinic_id,
        title: payload.title,
        description: undefined,
        appointment_date: payload.appointment_date,
        appointment_time: payload.appointment_time,
        duration: 30,
        type: payload.type,
        location: undefined,
        notes: undefined,
      },
    });
  });

  it('throws when edge function reports an error', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: false, error: { message: 'Horario ocupado' } },
      error: null,
    });

    await expect(
      enhancedAppointmentService.createAppointment({
        doctor_id: 'doctor-1',
        patient_id: 'patient-1',
        clinic_id: 'clinic-1',
        title: 'Consulta',
        appointment_date: '2025-09-18',
        appointment_time: '10:00',
        type: 'consultation',
      })
    ).rejects.toThrow('Horario ocupado');
  });

  it('returns availability conflict details when provided', async () => {
    const conflictDetails = {
      conflicting_appointment_id: 'appointment-2',
      conflicting_time_range: {
        start: '2025-09-18T09:00:00.000Z',
        end: '2025-09-18T09:30:00.000Z',
      },
    };

    invokeMock.mockResolvedValueOnce({
      data: { available: false, conflict_details: conflictDetails },
      error: null,
    });

    const response = await enhancedAppointmentService.checkAvailability(
      'doctor-1',
      '2025-09-18',
      '09:00',
      30
    );

    expect(response).toEqual({
      available: false,
      conflictDetails,
    });
  });
});
