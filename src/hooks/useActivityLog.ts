import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface ActivityLogItem {
  id: string;
  type: 'consultation' | 'prescription' | 'patient_created' | 'appointment' | 'test_result' | 'note';
  title: string;
  description: string;
  date: string;
  user_id: string;
  patient_id?: string;
  patient_name?: string;
  status?: 'completed' | 'pending' | 'cancelled' | 'scheduled';
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  created_at: string;
}

interface CreateActivityLogData {
  type: ActivityLogItem['type'];
  title: string;
  description: string;
  patient_id?: string;
  patient_name?: string;
  status?: ActivityLogItem['status'];
  priority?: ActivityLogItem['priority'];
  metadata?: Record<string, any>;
}

export function useActivityLog() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crear nuevo log de actividad
  const createActivityLog = useCallback(async (data: CreateActivityLogData): Promise<ActivityLogItem | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      setError(null);

      const { data: newLog, error: createError } = await supabase
        .from('activity_logs')
        .insert([{
          ...data,
          user_id: user.id,
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select(`
          *,
          patient:patients!activity_logs_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .single();

      if (createError) throw createError;

      // Formatear el nombre del paciente si existe
      if (newLog.patient) {
        newLog.patient_name = `${newLog.patient.first_name} ${newLog.patient.last_name}`;
      }

      return newLog;
    } catch (err) {
      console.error('Error creating activity log:', err);
      setError(err instanceof Error ? err.message : 'Error al crear registro de actividad');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtener logs de actividad
  const getActivityLogs = useCallback(async (
    limit?: number,
    type?: ActivityLogItem['type'][]
  ): Promise<ActivityLogItem[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          patient:patients!activity_logs_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filtrar por tipo si se especifica
      if (type && type.length > 0) {
        query = query.in('type', type);
      }

      // Limitar resultados si se especifica
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Formatear los nombres de pacientes
      return (data || []).map(log => ({
        ...log,
        patient_name: log.patient ? `${log.patient.first_name} ${log.patient.last_name}` : log.patient_name
      }));
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener registros de actividad');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Obtener logs por paciente
  const getPatientActivityLogs = useCallback(async (
    patientId: string,
    limit?: number
  ): Promise<ActivityLogItem[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          patient:patients!activity_logs_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return (data || []).map(log => ({
        ...log,
        patient_name: log.patient ? `${log.patient.first_name} ${log.patient.last_name}` : log.patient_name
      }));
    } catch (err) {
      console.error('Error fetching patient activity logs:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener registros del paciente');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Crear log de cita
  const createAppointmentLog = useCallback(async (
    patientId: string,
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    type: 'scheduled' | 'rescheduled' | 'cancelled' = 'scheduled'
  ): Promise<ActivityLogItem | null> => {
    const formattedDate = new Date(`${appointmentDate}T${appointmentTime}`).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const titles = {
      scheduled: 'Nueva Cita Agendada',
      rescheduled: 'Cita Reprogramada',
      cancelled: 'Cita Cancelada'
    };

    const descriptions = {
      scheduled: `Se ha agendado una nueva cita con ${patientName} para el ${formattedDate}`,
      rescheduled: `Se ha reprogramado la cita con ${patientName} para el ${formattedDate}`,
      cancelled: `Se ha cancelado la cita con ${patientName} programada para el ${formattedDate}`
    };

    const statuses = {
      scheduled: 'scheduled' as const,
      rescheduled: 'scheduled' as const,
      cancelled: 'cancelled' as const
    };

    return createActivityLog({
      type: 'appointment',
      title: titles[type],
      description: descriptions[type],
      patient_id: patientId,
      patient_name: patientName,
      status: statuses[type],
      priority: type === 'cancelled' ? 'high' : 'medium',
      metadata: {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        action: type
      }
    });
  }, [createActivityLog]);

  return {
    loading,
    error,
    createActivityLog,
    getActivityLogs,
    getPatientActivityLogs,
    createAppointmentLog,
    clearError: () => setError(null)
  };
}
