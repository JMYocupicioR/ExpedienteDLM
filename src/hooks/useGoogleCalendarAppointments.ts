import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  googleCalendarService,
  GoogleCalendarSettings,
  AppointmentToCalendarEvent
} from '@/lib/services/google-calendar-service';
import { enhancedAppointmentService } from '@/lib/services/enhanced-appointment-service';
import { EnhancedAppointment, CreateAppointmentPayload } from '@/lib/database.types';

export interface GoogleCalendarIntegrationState {
  // Calendar settings
  calendarSettings: GoogleCalendarSettings | null;
  isCalendarConnected: boolean;

  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncStatus: 'pending' | 'success' | 'error';
  syncError: string | null;

  // Operations status
  isLoading: boolean;
  error: string | null;
}

export interface UseGoogleCalendarAppointmentsResult extends GoogleCalendarIntegrationState {
  // Appointment operations with Google Calendar integration
  createAppointment: (data: CreateAppointmentPayload) => Promise<EnhancedAppointment>;
  updateAppointment: (id: string, data: Partial<CreateAppointmentPayload>) => Promise<EnhancedAppointment>;
  deleteAppointment: (id: string) => Promise<void>;

  // Google Calendar specific operations
  connectGoogleCalendar: (authCode: string) => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncWithGoogleCalendar: () => Promise<{ synced: number; errors: string[] }>;
  importFromGoogleCalendar: () => Promise<{ imported: number; errors: string[] }>;

  // Settings management
  updateSyncSettings: (settings: Partial<GoogleCalendarSettings>) => Promise<void>;
  toggleAutoSync: (enabled: boolean) => Promise<void>;

  // Utility functions
  refreshCalendarSettings: () => Promise<void>;
  testGoogleConnection: () => Promise<boolean>;
}

export function useGoogleCalendarAppointments(): UseGoogleCalendarAppointmentsResult {
  const { user } = useAuth();

  const [state, setState] = useState<GoogleCalendarIntegrationState>({
    calendarSettings: null,
    isCalendarConnected: false,
    isSyncing: false,
    lastSyncAt: null,
    syncStatus: 'pending',
    syncError: null,
    isLoading: true,
    error: null,
  });

  // Load calendar settings on mount
  const loadCalendarSettings = useCallback(async () => {
    if (!user?.id) return;

    try {
      if (!googleCalendarService.isIntegrationConfigured()) {
        setState(prev => ({
          ...prev,
          calendarSettings: null,
          isCalendarConnected: false,
          lastSyncAt: null,
          syncStatus: 'pending',
          syncError: null,
          isLoading: false,
          error: null,
        }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const settings = await googleCalendarService.getCalendarSettings(user.id);

      setState(prev => ({
        ...prev,
        calendarSettings: settings,
        isCalendarConnected: !!settings?.sync_enabled,
        lastSyncAt: settings?.last_sync_at || null,
        syncStatus: settings?.last_sync_status || 'pending',
        syncError: settings?.last_sync_error || null,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error loading calendar settings',
        isLoading: false,
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadCalendarSettings();
  }, [loadCalendarSettings]);

  // Connect Google Calendar
  const connectGoogleCalendar = useCallback(async (authCode: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    if (!googleCalendarService.isIntegrationConfigured()) {
      const message = 'La integración con Google Calendar no está disponible en este entorno.';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      throw new Error(message);
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Exchange auth code for tokens (this would be done via Edge Function)
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          auth_code: authCode,
          doctor_id: user.id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to connect Google Calendar');
      }

      await loadCalendarSettings();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error connecting Google Calendar',
        isLoading: false,
      }));
      throw error;
    }
  }, [user?.id, loadCalendarSettings]);

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase
        .from('google_calendar_settings')
        .update({
          sync_enabled: false,
          google_access_token: null,
          google_refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('doctor_id', user.id);

      if (error) throw error;

      // Clear Google Calendar event IDs from appointments
      await supabase
        .from('appointments')
        .update({
          google_calendar_event_id: null,
          google_calendar_sync_enabled: false,
        })
        .eq('doctor_id', user.id);

      await loadCalendarSettings();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error disconnecting Google Calendar',
        isLoading: false,
      }));
      throw error;
    }
  }, [user?.id, loadCalendarSettings]);

  // Sync appointments with Google Calendar
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');

    if (!googleCalendarService.isIntegrationConfigured()) {
      return { synced: 0, errors: ['La integración con Google Calendar no está disponible en este entorno.'] };
    }

    if (!state.isCalendarConnected) throw new Error('Google Calendar not connected');

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      const result = await googleCalendarService.syncAppointments(user.id);

      await loadCalendarSettings();

      setState(prev => ({ ...prev, isSyncing: false }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error syncing with Google Calendar',
        isSyncing: false,
      }));
      throw error;
    }
  }, [user?.id, state.isCalendarConnected, loadCalendarSettings]);

  // Import events from Google Calendar
  const importFromGoogleCalendar = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');

    if (!googleCalendarService.isIntegrationConfigured()) {
      return { imported: 0, errors: ['La integración con Google Calendar no está disponible en este entorno.'] };
    }

    if (!state.isCalendarConnected) throw new Error('Google Calendar not connected');

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));

      const result = await googleCalendarService.importFromGoogleCalendar(user.id);

      await loadCalendarSettings();

      setState(prev => ({ ...prev, isSyncing: false }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error importing from Google Calendar',
        isSyncing: false,
      }));
      throw error;
    }
  }, [user?.id, state.isCalendarConnected, loadCalendarSettings]);

  // Create appointment with Google Calendar integration
  const createAppointment = useCallback(async (data: CreateAppointmentPayload): Promise<EnhancedAppointment> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Create appointment in database
      const appointment = await enhancedAppointmentService.createAppointment(data);

      // If Google Calendar is connected and auto-create is enabled, create calendar event
      if (state.isCalendarConnected && state.calendarSettings?.auto_create_events) {
        try {
          await googleCalendarService.createCalendarEvent(
            state.calendarSettings,
            appointment as AppointmentToCalendarEvent
          );
        } catch (calendarError) {
          // Log calendar error but don't fail the appointment creation
          console.error('Failed to create Google Calendar event:', calendarError);
        }
      }

      return appointment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error creating appointment',
      }));
      throw error;
    }
  }, [user?.id, state.isCalendarConnected, state.calendarSettings]);

  // Update appointment with Google Calendar integration
  const updateAppointment = useCallback(async (
    id: string,
    data: Partial<CreateAppointmentPayload>
  ): Promise<EnhancedAppointment> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Update appointment in database
      const appointment = await enhancedAppointmentService.updateAppointment(id, data);

      // If Google Calendar is connected and auto-update is enabled, update calendar event
      if (state.isCalendarConnected &&
          state.calendarSettings?.auto_update_events &&
          appointment.google_calendar_event_id) {
        try {
          await googleCalendarService.updateCalendarEvent(
            state.calendarSettings,
            appointment as AppointmentToCalendarEvent,
            appointment.google_calendar_event_id
          );
        } catch (calendarError) {
          // Log calendar error but don't fail the appointment update
          console.error('Failed to update Google Calendar event:', calendarError);
        }
      }

      return appointment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error updating appointment',
      }));
      throw error;
    }
  }, [user?.id, state.isCalendarConnected, state.calendarSettings]);

  // Delete appointment with Google Calendar integration
  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Get appointment to check for Google Calendar event ID
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('google_calendar_event_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from Google Calendar if event exists
      if (state.isCalendarConnected &&
          state.calendarSettings &&
          appointment.google_calendar_event_id) {
        try {
          await googleCalendarService.deleteCalendarEvent(
            state.calendarSettings,
            appointment.google_calendar_event_id
          );
        } catch (calendarError) {
          // Log calendar error but continue with database deletion
          console.error('Failed to delete Google Calendar event:', calendarError);
        }
      }

      // Delete appointment from database
      await enhancedAppointmentService.cancelAppointment(id);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error deleting appointment',
      }));
      throw error;
    }
  }, [user?.id, state.isCalendarConnected, state.calendarSettings]);

  // Update sync settings
  const updateSyncSettings = useCallback(async (
    settings: Partial<GoogleCalendarSettings>
  ): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      await googleCalendarService.updateSyncSettings(user.id, settings);
      await loadCalendarSettings();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error updating sync settings',
      }));
      throw error;
    }
  }, [user?.id, loadCalendarSettings]);

  // Toggle auto sync
  const toggleAutoSync = useCallback(async (enabled: boolean): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      await googleCalendarService.toggleSync(user.id, enabled);
      await loadCalendarSettings();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error toggling auto sync',
      }));
      throw error;
    }
  }, [user?.id, loadCalendarSettings]);

  // Refresh calendar settings
  const refreshCalendarSettings = useCallback(async (): Promise<void> => {
    await loadCalendarSettings();
  }, [loadCalendarSettings]);

  // Test Google connection
  const testGoogleConnection = useCallback(async (): Promise<boolean> => {
    if (!state.calendarSettings) return false;
    if (!googleCalendarService.isIntegrationConfigured()) return false;

    try {
      await googleCalendarService.validateAndRefreshToken(state.calendarSettings);
      return true;
    } catch (error) {
      return false;
    }
  }, [state.calendarSettings]);

  return {
    // State
    ...state,

    // Appointment operations
    createAppointment,
    updateAppointment,
    deleteAppointment,

    // Google Calendar operations
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncWithGoogleCalendar,
    importFromGoogleCalendar,

    // Settings
    updateSyncSettings,
    toggleAutoSync,

    // Utilities
    refreshCalendarSettings,
    testGoogleConnection,
  };
}

export default useGoogleCalendarAppointments;