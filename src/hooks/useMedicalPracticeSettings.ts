import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MedicalPracticeSettings,
  CreateMedicalPracticeSettings,
  UpdateMedicalPracticeSettings
} from '@/lib/database.types';

interface UseMedicalPracticeSettingsResult {
  settings: MedicalPracticeSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: UpdateMedicalPracticeSettings) => Promise<boolean>;
  createSettings: (data: CreateMedicalPracticeSettings) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

export function useMedicalPracticeSettings(
  userId?: string,
  clinicId?: string
): UseMedicalPracticeSettingsResult {
  const [settings, setSettings] = useState<MedicalPracticeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Intentar obtener configuración existente
      let query = supabase
        .from('medical_practice_settings')
        .select('*')
        .eq('user_id', userId);

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      } else {
        query = query.is('clinic_id', null);
      }

      const { data: existingSettings, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        // Si no existe configuración, usar valores por defecto
        const defaultSettings: MedicalPracticeSettings = {
          id: '',
          user_id: userId,
          clinic_id: clinicId,
          weekday_start_time: '09:00:00',
          weekday_end_time: '18:00:00',
          saturday_start_time: '09:00:00',
          saturday_end_time: '14:00:00',
          sunday_enabled: false,
          sunday_start_time: null,
          sunday_end_time: null,
          default_consultation_duration: 30,
          available_durations: [15, 30, 45, 60],
          enable_presential: true,
          enable_teleconsultation: false,
          enable_emergency: false,
          languages: ['es'],
          buffer_time_between_appointments: 0,
          max_advance_booking_days: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSettings(defaultSettings);
      }
    } catch (err: any) {
      console.error('Error fetching medical practice settings:', err);
      setError(err.message || 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const createSettings = async (data: CreateMedicalPracticeSettings): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);

      const { data: newSettings, error: createError } = await supabase
        .from('medical_practice_settings')
        .insert({
          user_id: userId,
          clinic_id: clinicId,
          ...data,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      setSettings(newSettings);
      return true;
    } catch (err: any) {
      console.error('Error creating medical practice settings:', err);
      setError(err.message || 'Error al crear la configuración');
      return false;
    }
  };

  const updateSettings = async (updates: UpdateMedicalPracticeSettings): Promise<boolean> => {
    if (!userId || !settings?.id) {
      // Si no hay configuración existente, crear una nueva
      return await createSettings(updates);
    }

    try {
      setError(null);

      const { data: updatedSettings, error: updateError } = await supabase
        .from('medical_practice_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setSettings(updatedSettings);
      return true;
    } catch (err: any) {
      console.error('Error updating medical practice settings:', err);
      setError(err.message || 'Error al actualizar la configuración');
      return false;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [userId, clinicId]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    createSettings,
    refreshSettings,
  };
}

// Hook para obtener configuración como contexto de citas
export function useAppointmentSettings(userId?: string, clinicId?: string) {
  const { settings, loading, error } = useMedicalPracticeSettings(userId, clinicId);

  const getAvailableTimeSlots = (date: Date) => {
    if (!settings) return [];

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let startTime: string | null = null;
    let endTime: string | null = null;

    if (dayOfWeek === 0) { // Sunday
      if (!settings.sunday_enabled) return [];
      startTime = settings.sunday_start_time;
      endTime = settings.sunday_end_time;
    } else if (dayOfWeek === 6) { // Saturday
      startTime = settings.saturday_start_time;
      endTime = settings.saturday_end_time;
    } else { // Monday to Friday
      startTime = settings.weekday_start_time;
      endTime = settings.weekday_end_time;
    }

    if (!startTime || !endTime) return [];

    const slots: string[] = [];
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const interval = settings.default_consultation_duration + settings.buffer_time_between_appointments;

    let currentTime = new Date(start);
    while (currentTime < end) {
      const timeString = currentTime.toTimeString().slice(0, 5);
      slots.push(timeString);
      currentTime.setMinutes(currentTime.getMinutes() + interval);
    }

    return slots;
  };

  const getEnabledAppointmentTypes = () => {
    if (!settings) return [];

    const types: Array<{ value: string; label: string; enabled: boolean }> = [
      { value: 'presential', label: 'Consulta Presencial', enabled: settings.enable_presential },
      { value: 'teleconsultation', label: 'Teleconsulta', enabled: settings.enable_teleconsultation },
      { value: 'emergency', label: 'Emergencia', enabled: settings.enable_emergency },
    ];

    return types.filter(type => type.enabled);
  };

  return {
    settings,
    loading,
    error,
    getAvailableTimeSlots,
    getEnabledAppointmentTypes,
  };
}