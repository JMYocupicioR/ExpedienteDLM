import { supabase } from '@/lib/supabase';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  status?: 'tentative' | 'confirmed' | 'cancelled';
  visibility?: 'default' | 'public' | 'private';
}

export interface GoogleCalendarSettings {
  id: string;
  doctor_id: string;
  google_calendar_id: string;
  google_access_token?: string;
  google_refresh_token?: string;
  google_token_expires_at?: string;
  sync_enabled: boolean;
  sync_direction: 'to_google' | 'from_google' | 'bidirectional';
  auto_create_events: boolean;
  auto_update_events: boolean;
  sync_past_events: boolean;
  sync_future_days: number;
  default_reminder_minutes: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  last_sync_at?: string;
  last_sync_status: 'pending' | 'success' | 'error';
  last_sync_error?: string;
}

export interface AppointmentToCalendarEvent {
  id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  location?: string;
  patient?: {
    full_name: string;
    email?: string;
    phone?: string;
  };
  doctor?: {
    full_name: string;
    email?: string;
  };
}

class GoogleCalendarService {
  private readonly BASE_URL = 'https://www.googleapis.com/calendar/v3';

  private integrationDisabled(): boolean {
    const flag = import.meta.env.VITE_ENABLE_GOOGLE_CALENDAR?.toLowerCase();
    return flag === 'false';
  }

  private getClientCredentials() {
    return {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    };
  }

  private ensureIntegrationConfigured(): void {
    if (this.integrationDisabled()) {
      throw new Error('La integraciÛn con Google Calendar est· deshabilitada.');
    }

    const { clientId, clientSecret } = this.getClientCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('La integraciÛn con Google Calendar no est· configurada.');
    }
  }

  public isIntegrationConfigured(): boolean {
    if (this.integrationDisabled()) {
      return false;
    }
    const { clientId, clientSecret } = this.getClientCredentials();
    return Boolean(clientId && clientSecret);
  }

  /**
   * Initialize Google Calendar for a doctor
   */
  async initializeCalendarSettings(
    doctorId: string,
    calendarId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<GoogleCalendarSettings> {
    this.ensureIntegrationConfigured();

    const { data, error } = await supabase
      .from('google_calendar_settings')
      .upsert({
        doctor_id: doctorId,
        google_calendar_id: calendarId,
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expires_at: expiresAt.toISOString(),
        sync_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get calendar settings for a doctor
   */
  async getCalendarSettings(doctorId: string): Promise<GoogleCalendarSettings | null> {
    const { data, error } = await supabase
      .from('google_calendar_settings')
      .select('*')
      .eq('doctor_id', doctorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Check if access token is valid and refresh if needed
   */
  async validateAndRefreshToken(settings: GoogleCalendarSettings): Promise<string> {
    this.ensureIntegrationConfigured();

    if (!settings.google_access_token) {
      throw new Error('No access token available');
    }

    const expiresAt = new Date(settings.google_token_expires_at!);
    const now = new Date();

    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await this.refreshAccessToken(settings);
    }

    return settings.google_access_token;
  }

  /**
   * Refresh Google access token
   */
  private async refreshAccessToken(settings: GoogleCalendarSettings): Promise<string> {
    this.ensureIntegrationConfigured();

    const { clientId, clientSecret } = this.getClientCredentials();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: settings.google_refresh_token!,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const data = await response.json();

    // Update settings with new token
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await supabase
      .from('google_calendar_settings')
      .update({
        google_access_token: data.access_token,
        google_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('doctor_id', settings.doctor_id);

    return data.access_token;
  }

  /**
   * Create a Google Calendar event from an appointment
   */
  async createCalendarEvent(
    settings: GoogleCalendarSettings,
    appointment: AppointmentToCalendarEvent
  ): Promise<string> {
    this.ensureIntegrationConfigured();
    const accessToken = await this.validateAndRefreshToken(settings);

    const event: GoogleCalendarEvent = this.appointmentToCalendarEvent(appointment, settings);

    const response = await fetch(
      `${this.BASE_URL}/calendars/${encodeURIComponent(settings.google_calendar_id)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Google Calendar event: ${error}`);
    }

    const createdEvent = await response.json();

    // Update appointment with Google Calendar event ID
    await supabase
      .from('appointments')
      .update({
        google_calendar_event_id: createdEvent.id,
        google_calendar_last_sync: new Date().toISOString(),
      })
      .eq('id', appointment.id);

    return createdEvent.id;
  }

  /**
   * Update a Google Calendar event
   */
  async updateCalendarEvent(
    settings: GoogleCalendarSettings,
    appointment: AppointmentToCalendarEvent,
    googleEventId: string
  ): Promise<void> {
    this.ensureIntegrationConfigured();
    const accessToken = await this.validateAndRefreshToken(settings);

    const event: GoogleCalendarEvent = this.appointmentToCalendarEvent(appointment, settings);

    const response = await fetch(
      `${this.BASE_URL}/calendars/${encodeURIComponent(settings.google_calendar_id)}/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Google Calendar event: ${error}`);
    }

    // Update last sync timestamp
    await supabase
      .from('appointments')
      .update({
        google_calendar_last_sync: new Date().toISOString(),
      })
      .eq('id', appointment.id);
  }

  /**
   * Delete a Google Calendar event
   */
  async deleteCalendarEvent(
    settings: GoogleCalendarSettings,
    googleEventId: string
  ): Promise<void> {
    this.ensureIntegrationConfigured();
    const accessToken = await this.validateAndRefreshToken(settings);

    const response = await fetch(
      `${this.BASE_URL}/calendars/${encodeURIComponent(settings.google_calendar_id)}/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Failed to delete Google Calendar event: ${error}`);
    }
  }

  /**
   * Sync appointments with Google Calendar
   */
  async syncAppointments(doctorId: string): Promise<{ synced: number; errors: string[] }> {
    if (!this.isIntegrationConfigured()) {
      return { synced: 0, errors: ['La integraciÛn con Google Calendar no est· configurada.'] };
    }

    const settings = await this.getCalendarSettings(doctorId);
    if (!settings || !settings.sync_enabled) {
      return { synced: 0, errors: ['Google Calendar sync not enabled for this doctor'] };
    }

    this.ensureIntegrationConfigured();

    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(full_name, email, phone),
          doctor:profiles!appointments_doctor_id_fkey(full_name, email)
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .lte('appointment_date',
          new Date(Date.now() + settings.sync_future_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        )
        .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient']);

      if (error) throw error;

      let synced = 0;
      const errors: string[] = [];

      for (const appointment of appointments || []) {
        try {
          if (appointment.google_calendar_event_id) {
            // Update existing event
            await this.updateCalendarEvent(settings, appointment as any, appointment.google_calendar_event_id);
          } else {
            // Create new event
            await this.createCalendarEvent(settings, appointment as any);
          }
          synced++;
        } catch (error) {
          errors.push(`Appointment ${appointment.id}: ${error}`);
        }
      }

      // Update sync status
      await supabase
        .from('google_calendar_settings')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errors.length === 0 ? 'success' : 'error',
          last_sync_error: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('doctor_id', doctorId);

      return { synced, errors };
    } catch (error) {
      // Update sync status with error
      await supabase
        .from('google_calendar_settings')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: error instanceof Error ? error.message : String(error),
        })
        .eq('doctor_id', doctorId);

      throw error;
    }
  }

  /**
   * Get events from Google Calendar
   */
  async getCalendarEvents(
    settings: GoogleCalendarSettings,
    timeMin: Date,
    timeMax: Date
  ): Promise<GoogleCalendarEvent[]> {
    this.ensureIntegrationConfigured();
    const accessToken = await this.validateAndRefreshToken(settings);

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '1000',
    });

    const response = await fetch(
      `${this.BASE_URL}/calendars/${encodeURIComponent(settings.google_calendar_id)}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Google Calendar events: ${error}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Import events from Google Calendar to appointments
   */
  async importFromGoogleCalendar(doctorId: string): Promise<{ imported: number; errors: string[] }> {
    if (!this.isIntegrationConfigured()) {
      return { imported: 0, errors: ['La integraciÛn con Google Calendar no est· configurada.'] };
    }

    const settings = await this.getCalendarSettings(doctorId);
    if (!settings || !settings.sync_enabled) {
      return { imported: 0, errors: ['Google Calendar sync not enabled for this doctor'] };
    }

    if (settings.sync_direction === 'to_google') {
      return { imported: 0, errors: ['Import not allowed with current sync direction'] };
    }

    this.ensureIntegrationConfigured();

    const timeMin = settings.sync_past_events
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      : new Date();
    const timeMax = new Date(Date.now() + settings.sync_future_days * 24 * 60 * 60 * 1000);

    const events = await this.getCalendarEvents(settings, timeMin, timeMax);

    let imported = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        // Check if event is already imported
        const { data: existingAppointment } = await supabase
          .from('appointments')
          .select('id')
          .eq('google_calendar_event_id', event.id)
          .single();

        if (existingAppointment) continue;

        // Convert Google Calendar event to appointment
        const appointment = this.calendarEventToAppointment(event, doctorId);

        const { error } = await supabase
          .from('appointments')
          .insert(appointment);

        if (error) throw error;
        imported++;
      } catch (error) {
        errors.push(`Event ${event.id}: ${error}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Convert appointment to Google Calendar event format
   */
  private appointmentToCalendarEvent(
    appointment: AppointmentToCalendarEvent,
    settings: GoogleCalendarSettings
  ): Omit<GoogleCalendarEvent, 'id'> {
    const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDateTime = new Date(startDateTime.getTime() + appointment.duration * 60 * 1000);

    const attendees = [];
    if (appointment.patient?.email) {
      attendees.push({
        email: appointment.patient.email,
        displayName: appointment.patient.full_name,
        responseStatus: 'needsAction' as const,
      });
    }

    return {
      summary: appointment.title,
      description: this.buildEventDescription(appointment),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Mexico_City', // Configurable por regi√≥n
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      location: appointment.location,
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'email',
            minutes: settings.default_reminder_minutes,
          },
          {
            method: 'popup',
            minutes: 15,
          },
        ],
      },
      status: 'confirmed',
      visibility: 'private',
    };
  }

  /**
   * Convert Google Calendar event to appointment format
   */
  private calendarEventToAppointment(event: GoogleCalendarEvent, doctorId: string) {
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    return {
      doctor_id: doctorId,
      title: event.summary || 'Imported from Google Calendar',
      description: event.description,
      appointment_date: startDate.toISOString().split('T')[0],
      appointment_time: startDate.toTimeString().split(' ')[0].substring(0, 5),
      duration,
      location: event.location,
      status: 'scheduled',
      type: 'consultation',
      google_calendar_event_id: event.id,
      google_calendar_sync_enabled: true,
      google_calendar_last_sync: new Date().toISOString(),
    };
  }

  /**
   * Build event description with appointment details
   */
  private buildEventDescription(appointment: AppointmentToCalendarEvent): string {
    const parts = [];

    if (appointment.description) {
      parts.push(appointment.description);
      parts.push('');
    }

    parts.push('**Detalles de la Cita:**');
    parts.push(`Paciente: ${appointment.patient?.full_name || 'N/A'}`);

    if (appointment.patient?.phone) {
      parts.push(`Tel√©fono: ${appointment.patient.phone}`);
    }

    parts.push(`Duraci√≥n: ${appointment.duration} minutos`);

    if (appointment.location) {
      parts.push(`Ubicaci√≥n: ${appointment.location}`);
    }

    parts.push('');
    parts.push('Generado por ExpedienteDLM');

    return parts.join('\n');
  }

  /**
   * Enable/disable Google Calendar sync for a doctor
   */
  async toggleSync(doctorId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('google_calendar_settings')
      .update({
        sync_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('doctor_id', doctorId);

    if (error) throw error;
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(
    doctorId: string,
    settings: Partial<Pick<GoogleCalendarSettings,
      'sync_direction' | 'auto_create_events' | 'auto_update_events' |
      'sync_past_events' | 'sync_future_days' | 'default_reminder_minutes' |
      'email_notifications' | 'sms_notifications'
    >>
  ): Promise<void> {
    const { error } = await supabase
      .from('google_calendar_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('doctor_id', doctorId);

    if (error) throw error;
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();

// Export convenience functions
export const initializeGoogleCalendar = (
  doctorId: string,
  calendarId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
) => googleCalendarService.initializeCalendarSettings(doctorId, calendarId, accessToken, refreshToken, expiresAt);

export const syncAppointmentsWithGoogle = (doctorId: string) =>
  googleCalendarService.syncAppointments(doctorId);

export const importFromGoogleCalendar = (doctorId: string) =>
  googleCalendarService.importFromGoogleCalendar(doctorId);

export const toggleGoogleCalendarSync = (doctorId: string, enabled: boolean) =>
  googleCalendarService.toggleSync(doctorId, enabled);

export default googleCalendarService;