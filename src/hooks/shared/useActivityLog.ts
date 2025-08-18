import { useCallback } from 'react';

interface ActivityLogData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  action: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed';
}

export const useActivityLog = () => {
  const createAppointmentLog = useCallback(
    async (
      patientId: string,
      patientName: string,
      date: string,
      time: string,
      action: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed'
    ) => {
      try {
        // Por ahora, solo logueamos en consola
        // En el futuro, esto se puede conectar a un servicio de logging
        console.log('Activity Log:', {
          type: 'appointment',
          patientId,
          patientName,
          date,
          time,
          action,
          timestamp: new Date().toISOString(),
        });

        // Aquí se puede agregar la lógica para guardar en base de datos
        // o enviar a un servicio de logging externo
      } catch (error) {
        console.error('Error creating activity log:', error);
      }
    },
    []
  );

  return {
    createAppointmentLog,
  };
};
