import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilityRequest {
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  exclude_appointment_id?: string;
}

interface AvailabilityResponse {
  available: boolean;
  conflict_details?: {
    conflicting_appointment_id: string;
    conflicting_time_range: {
      start: string;
      end: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          available: false,
          error: 'Usuario no autenticado',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          available: false,
          error: 'Solo se permite el método POST',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parsear request body
    const requestData: AvailabilityRequest = await req.json();

    // Validar datos requeridos
    const requiredFields = ['doctor_id', 'appointment_date', 'appointment_time', 'duration'];
    const missingFields = requiredFields.filter(field => !requestData[field as keyof AvailabilityRequest]);

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          available: false,
          error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar conflictos usando la función de la base de datos
    const { data: hasConflict, error: conflictError } = await supabaseClient
      .rpc('check_appointment_conflict', {
        p_doctor_id: requestData.doctor_id,
        p_appointment_date: requestData.appointment_date,
        p_appointment_time: requestData.appointment_time,
        p_duration: requestData.duration,
        p_exclude_appointment_id: requestData.exclude_appointment_id || null,
      });

    if (conflictError) {
      console.error('Error checking appointment conflict:', conflictError);
      return new Response(
        JSON.stringify({
          available: false,
          error: 'Error al verificar disponibilidad',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Si hay conflicto, obtener detalles de la cita conflictiva
    let conflictDetails = undefined;
    if (hasConflict) {
      const appointmentStart = new Date(`${requestData.appointment_date}T${requestData.appointment_time}`);
      const appointmentEnd = new Date(appointmentStart.getTime() + requestData.duration * 60000);

      const { data: conflictingAppointments, error: conflictDetailsError } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          duration,
          title,
          patient:patients(full_name)
        `)
        .eq('doctor_id', requestData.doctor_id)
        .eq('appointment_date', requestData.appointment_date)
        .not('status', 'in', '(cancelled_by_clinic,cancelled_by_patient,no_show)')
        .neq('id', requestData.exclude_appointment_id || '');

      if (!conflictDetailsError && conflictingAppointments.length > 0) {
        // Encontrar la cita que realmente causa conflicto
        for (const apt of conflictingAppointments) {
          const aptStart = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);

          // Verificar si hay solapamiento
          if (
            (appointmentStart >= aptStart && appointmentStart < aptEnd) ||
            (appointmentEnd > aptStart && appointmentEnd <= aptEnd) ||
            (appointmentStart <= aptStart && appointmentEnd >= aptEnd)
          ) {
            conflictDetails = {
              conflicting_appointment_id: apt.id,
              conflicting_time_range: {
                start: apt.appointment_time,
                end: new Date(aptEnd).toTimeString().slice(0, 5),
              },
            };
            break;
          }
        }
      }
    }

    const response: AvailabilityResponse = {
      available: !hasConflict,
      conflict_details: conflictDetails,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in check-appointment-availability:', error);
    
    return new Response(
      JSON.stringify({
        available: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
