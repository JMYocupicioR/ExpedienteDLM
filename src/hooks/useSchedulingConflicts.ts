import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SchedulingConflict {
  conflict_type: string;
  conflicting_appointment_id: string;
  conflicting_doctor_id: string;
  conflicting_title: string;
  conflicting_time_start: string;
  conflicting_time_end: string;
}

let schedulingConflictsRpcAvailable: boolean | null = null;

export function useSchedulingConflicts() {
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [loading, setLoading] = useState(false);

  const checkConflicts = useCallback(
    async (
      roomId: string | null,
      doctorId: string,
      appointmentDate: string,
      startTime: string,
      durationMinutes: number,
      excludeAppointmentId?: string | null
    ): Promise<SchedulingConflict[]> => {
      const schedulingRpcEnabled =
        typeof window !== 'undefined' &&
        window.localStorage.getItem('dlm.enableSchedulingConflictsRpc') === '1';
      if (!schedulingRpcEnabled) {
        return [];
      }
      if (schedulingConflictsRpcAvailable === false) {
        return [];
      }
      setLoading(true);
      setConflicts([]);
      try {
        const start = startTime;
        const parts = start.split(':').slice(0, 2).map(Number);
        const hours = parts[0] ?? 0;
        const minutes = parts[1] ?? 0;
        const endMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

        const { data, error } = await supabase.rpc('check_scheduling_conflicts', {
          p_room_id: roomId || null,
          p_doctor_id: doctorId,
          p_appointment_date: appointmentDate,
          p_start_time: start,
          p_end_time: endTime,
          p_exclude_appointment_id: excludeAppointmentId || null,
        });

        if (error) throw error;
        const result = (data || []) as SchedulingConflict[];
        schedulingConflictsRpcAvailable = true;
        setConflicts(result);
        return result;
      } catch (err) {
        if ((err as { code?: string }).code === 'PGRST202') {
          schedulingConflictsRpcAvailable = false;
        }
        console.error('Error checking conflicts:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const hasConflicts = useCallback(() => conflicts.length > 0, [conflicts]);

  const getConflictSummary = useCallback(() => {
    const roomCount = conflicts.filter((c) => c.conflict_type === 'room_conflict').length;
    const doctorCount = conflicts.filter((c) => c.conflict_type === 'doctor_conflict').length;
    return { roomCount, doctorCount, total: conflicts.length };
  }, [conflicts]);

  return {
    conflicts,
    loading,
    checkConflicts,
    hasConflicts,
    getConflictSummary,
    clearConflicts: () => setConflicts([]),
  };
}
