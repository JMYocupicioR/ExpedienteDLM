import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  status: string
}

interface AppointmentData {
  id: string
  title: string
  description?: string
  appointment_date: string
  appointment_time: string
  duration: number
  location?: string
  status: string
  patient_name?: string
  google_calendar_event_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: user, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { doctor_id, sync_direction = 'bidirectional' } = await req.json()

    if (user.user.id !== doctor_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid doctor ID' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Google Calendar settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('google_calendar_settings')
      .select('*')
      .eq('doctor_id', doctor_id)
      .single()

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Refresh token if needed
    let accessToken = settings.google_access_token
    const tokenExpiry = new Date(settings.google_token_expires_at)
    const now = new Date()

    if (tokenExpiry <= now) {
      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: settings.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to refresh Google token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update token in database
      await supabaseClient
        .from('google_calendar_settings')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('doctor_id', doctor_id)
    }

    let syncedCount = 0
    const errors: string[] = []

    // Sync from database to Google Calendar
    if (sync_direction === 'to_google' || sync_direction === 'bidirectional') {
      const { data: appointments, error: appointmentsError } = await supabaseClient
        .from('appointments')
        .select(`
          *,
          patients!inner(name, email, phone)
        `)
        .eq('doctor_id', doctor_id)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient'])

      if (!appointmentsError && appointments) {
        for (const appointment of appointments) {
          try {
            const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
            const endDateTime = new Date(startDateTime.getTime() + appointment.duration * 60000)

            const eventData = {
              summary: appointment.title,
              description: `Paciente: ${appointment.patients.name}\n${appointment.description || ''}`,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Mexico_City',
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/Mexico_City',
              },
              location: appointment.location || '',
            }

            let response
            if (appointment.google_calendar_event_id) {
              // Update existing event
              response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${settings.google_calendar_id}/events/${appointment.google_calendar_event_id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(eventData),
                }
              )
            } else {
              // Create new event
              response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${settings.google_calendar_id}/events`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(eventData),
                }
              )
            }

            if (response.ok) {
              const event = await response.json()

              // Update appointment with Google Calendar event ID
              await supabaseClient
                .from('appointments')
                .update({
                  google_calendar_event_id: event.id,
                  google_calendar_sync_enabled: true,
                  google_calendar_last_sync: new Date().toISOString(),
                })
                .eq('id', appointment.id)

              syncedCount++
            } else {
              const errorData = await response.text()
              errors.push(`Failed to sync appointment ${appointment.id}: ${errorData}`)
            }
          } catch (error) {
            errors.push(`Error syncing appointment ${appointment.id}: ${error.message}`)
          }
        }
      }
    }

    // Sync from Google Calendar to database
    if (sync_direction === 'from_google' || sync_direction === 'bidirectional') {
      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + settings.sync_future_days * 24 * 60 * 60 * 1000).toISOString()

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${settings.google_calendar_id}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const events: GoogleCalendarEvent[] = eventsData.items || []

        for (const event of events) {
          try {
            // Skip events that are already synced
            const { data: existingAppointment } = await supabaseClient
              .from('appointments')
              .select('id')
              .eq('google_calendar_event_id', event.id)
              .single()

            if (existingAppointment) continue

            // Skip all-day events or events without dateTime
            if (!event.start?.dateTime || !event.end?.dateTime) continue

            const startDate = new Date(event.start.dateTime)
            const endDate = new Date(event.end.dateTime)
            const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

            // Create appointment from Google Calendar event
            const { error: insertError } = await supabaseClient
              .from('appointments')
              .insert({
                doctor_id,
                title: event.summary || 'Cita desde Google Calendar',
                description: event.description || '',
                appointment_date: startDate.toISOString().split('T')[0],
                appointment_time: startDate.toTimeString().split(' ')[0],
                duration,
                location: event.location || '',
                status: 'scheduled',
                type: 'consultation',
                google_calendar_event_id: event.id,
                google_calendar_sync_enabled: true,
                google_calendar_last_sync: new Date().toISOString(),
                // Note: patient_id is required but we don't have patient info from Google Calendar
                // This would need to be handled differently in a production system
                patient_id: '00000000-0000-0000-0000-000000000000', // Placeholder
              })

            if (!insertError) {
              syncedCount++
            } else {
              errors.push(`Failed to import event ${event.id}: ${insertError.message}`)
            }
          } catch (error) {
            errors.push(`Error importing event ${event.id}: ${error.message}`)
          }
        }
      }
    }

    // Update sync status
    await supabaseClient
      .from('google_calendar_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors.length === 0 ? 'success' : 'error',
        last_sync_error: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('doctor_id', doctor_id)

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})