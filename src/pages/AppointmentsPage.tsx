import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentsCalendar from '@/features/appointments/components/AppointmentsCalendar';
import { EnhancedAppointment } from '@/lib/services/enhanced-appointment-service';

export default function AppointmentsPage() {
  const navigate = useNavigate();

  const handleAppointmentSelect = (appointment: EnhancedAppointment) => {
    // Aquí se puede mostrar un modal con detalles o navegar a una página específica
    // Sensitive log removed for security;
  };

  const handleNavigateToPatient = (patientId: string) => {
    navigate(`/expediente/${patientId}`);
  };

  return (
    <AppointmentsCalendar
      onAppointmentSelect={handleAppointmentSelect}
      onNavigateToPatient={handleNavigateToPatient}
    />
  );
}
