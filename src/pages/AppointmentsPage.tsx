import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppointmentsCalendar from '../components/AppointmentsCalendar';
import { Appointment } from '../lib/services/appointment-service';

export default function AppointmentsPage() {
  const navigate = useNavigate();

  const handleAppointmentSelect = (appointment: Appointment) => {
    // Aquí se puede mostrar un modal con detalles o navegar a una página específica
    console.log('Selected appointment:', appointment);
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
