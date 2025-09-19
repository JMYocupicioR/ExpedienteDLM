import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AvailabilityRequest = {
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  exclude_appointment_id?: string;
};

type SupabaseUser = {
  id: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function authenticate(req: Request, supabaseClient: ReturnType<typeof getSupabaseClient>): Promise<SupabaseUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw Object.assign(new Error("Missing authorization header"), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error || !data?.user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  return { id: data.user.id };
}

function getTimeRange(date: string, time: string, duration: number) {
  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + duration * 60000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function validateBusinessHours(
  supabaseClient: ReturnType<typeof getSupabaseClient>,
  doctorId: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<{ valid: boolean; message?: string }> {
  try {
    // Obtener configuración médica del doctor
    const { data: settings, error } = await supabaseClient
      .from('medical_practice_settings')
      .select('*')
      .eq('user_id', doctorId)
      .maybeSingle();

    if (error) {
      // Si no hay configuración, permitir (usar horarios por defecto)
      return { valid: true };
    }

    if (!settings) {
      // Sin configuración específica, usar horarios por defecto
      return { valid: true };
    }

    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const dayOfWeek = appointmentDateTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    let startTime: string | null = null;
    let endTime: string | null = null;

    if (dayOfWeek === 0) { // Sunday
      if (!settings.sunday_enabled) {
        return { valid: false, message: 'No se programan citas los domingos' };
      }
      startTime = settings.sunday_start_time;
      endTime = settings.sunday_end_time;
    } else if (dayOfWeek === 6) { // Saturday
      startTime = settings.saturday_start_time;
      endTime = settings.saturday_end_time;
    } else { // Monday to Friday
      startTime = settings.weekday_start_time;
      endTime = settings.weekday_end_time;
    }

    if (!startTime || !endTime) {
      return { valid: false, message: 'No hay horarios configurados para este día' };
    }

    // Convertir tiempos a minutos para comparación fácil
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const appointmentMinutes = timeToMinutes(appointmentTime);
    const startMinutes = timeToMinutes(startTime.slice(0, 5)); // Remover segundos si existen
    const endMinutes = timeToMinutes(endTime.slice(0, 5));

    if (appointmentMinutes < startMinutes || appointmentMinutes >= endMinutes) {
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      return {
        valid: false,
        message: `El horario solicitado está fuera del horario de atención para ${dayNames[dayOfWeek]} (${startTime.slice(0, 5)} - ${endTime.slice(0, 5)})`
      };
    }

    return { valid: true };
  } catch (error) {
    // En caso de error, permitir la cita (no bloquear por problemas técnicos)
    console.error('Error validating business hours:', error);
    return { valid: true };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: { code: "method_not_allowed", message: "Only POST is supported" } });
  }

  try {
    const supabaseClient = getSupabaseClient();
    await authenticate(req, supabaseClient);

    const payload = await req.json() as AvailabilityRequest;
    const duration = payload.duration ?? 30;

    if (!payload.doctor_id || !payload.appointment_date || !payload.appointment_time) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: 'invalid_request',
          message: 'doctor_id, appointment_date y appointment_time son obligatorios',
        },
      });
    }

    // Validar horarios de negocio
    const businessHoursValidation = await validateBusinessHours(
      supabaseClient,
      payload.doctor_id,
      payload.appointment_date,
      payload.appointment_time
    );

    if (!businessHoursValidation.valid) {
      return jsonResponse(200, {
        success: true,
        available: false,
        conflict_details: {
          reason: 'outside_business_hours',
          message: businessHoursValidation.message || 'Horario fuera del horario de atención',
        },
      });
    }

    const { data: conflictResult, error: conflictError } = await supabaseClient.rpc('check_appointment_conflicts', {
      p_doctor_id: payload.doctor_id,
      p_appointment_date: payload.appointment_date,
      p_appointment_time: payload.appointment_time,
      p_duration: duration,
      p_exclude_appointment_id: payload.exclude_appointment_id ?? null,
    });

    if (conflictError) {
      throw conflictError;
    }

    const conflictEntry = Array.isArray(conflictResult) ? conflictResult[0] : null;

    if (!conflictEntry || !conflictEntry.has_conflict) {
      return jsonResponse(200, {
        success: true,
        available: true,
      });
    }

    let conflictDetails: Record<string, unknown> | undefined;

    if (conflictEntry.conflicting_appointments && conflictEntry.conflicting_appointments.length > 0) {
      const { data: conflictingAppointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          duration,
          patient:patients(
            id,
            full_name
          )
        `)
        .in('id', conflictEntry.conflicting_appointments)
        .limit(1);

      const conflicting = conflictingAppointments?.[0];
      if (conflicting) {
        conflictDetails = {
          conflicting_appointment_id: conflicting.id,
          conflicting_time_range: getTimeRange(conflicting.appointment_date, conflicting.appointment_time, conflicting.duration),
          patient: conflicting.patient,
        };
      }
    }

    return jsonResponse(200, {
      success: true,
      available: false,
      conflict_details: conflictDetails,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse(status, {
      success: false,
      available: false,
      error: {
        code: status === 401 ? 'unauthorized' : 'internal_error',
        message,
      },
    });
  }
});
