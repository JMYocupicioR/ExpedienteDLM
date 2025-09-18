import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ConflictDetails = {
  conflicting_appointment_id: string;
  conflicting_time_range: {
    start: string;
    end: string;
  };
};

type ScheduleAppointmentRequest = {
  doctor_id: string;
  patient_id: string;
  clinic_id?: string | null;
  title: string;
  description?: string | null;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: string;
  location?: string | null;
  notes?: string | null;
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

function validatePayload(payload: Partial<ScheduleAppointmentRequest>) {
  const requiredFields: Array<keyof ScheduleAppointmentRequest> = [
    "doctor_id",
    "patient_id",
    "title",
    "appointment_date",
    "appointment_time",
    "type",
  ];

  for (const field of requiredFields) {
    if (!payload[field]) {
      throw Object.assign(new Error(`Missing required field: ${field}`), { status: 400 });
    }
  }
}

function getDateIso(date: string, time: string, duration: number) {
  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + duration * 60000);
  return { start: start.toISOString(), end: end.toISOString() };
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

    const payload = await req.json() as ScheduleAppointmentRequest;
    validatePayload(payload);

    const duration = payload.duration ?? 30;

    const { data: conflictResult, error: conflictError } = await supabaseClient.rpc('check_appointment_conflicts', {
      p_doctor_id: payload.doctor_id,
      p_appointment_date: payload.appointment_date,
      p_appointment_time: payload.appointment_time,
      p_duration: duration,
      p_exclude_appointment_id: null,
    });

    if (conflictError) {
      throw conflictError;
    }

    const conflictEntry = Array.isArray(conflictResult) ? conflictResult[0] : null;

    if (conflictEntry?.has_conflict) {
      let conflictDetails: ConflictDetails | undefined;

      if (conflictEntry.conflicting_appointments && conflictEntry.conflicting_appointments.length > 0) {
        const { data: conflictingAppointments } = await supabaseClient
          .from('appointments')
          .select('id, appointment_date, appointment_time, duration')
          .in('id', conflictEntry.conflicting_appointments)
          .limit(1);

        const conflicting = conflictingAppointments?.[0];
        if (conflicting) {
          const range = getDateIso(conflicting.appointment_date, conflicting.appointment_time, conflicting.duration);
          conflictDetails = {
            conflicting_appointment_id: conflicting.id,
            conflicting_time_range: range,
          };
        }
      }

      return jsonResponse(409, {
        success: false,
        error: {
          code: 'conflict',
          message: 'El horario seleccionado ya está ocupado.',
          details: conflictDetails,
        },
      });
    }

    const { data: appointment, error: insertError } = await supabaseClient
      .from('appointments')
      .insert({
        doctor_id: payload.doctor_id,
        patient_id: payload.patient_id,
        clinic_id: payload.clinic_id ?? null,
        title: payload.title,
        description: payload.description ?? null,
        appointment_date: payload.appointment_date,
        appointment_time: payload.appointment_time,
        duration,
        status: 'scheduled',
        type: payload.type,
        location: payload.location ?? null,
        notes: payload.notes ?? null,
        confirmation_required: true,
      })
      .select(`
        *,
        patient:patients(
          id,
          full_name,
          phone,
          email,
          birth_date
        ),
        doctor:profiles!appointments_doctor_id_fkey(
          id,
          full_name,
          specialty,
          phone
        ),
        clinic:clinics(
          id,
          name,
          address
        )
      `)
      .single();

    if (insertError) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: 'insert_failed',
          message: insertError.message ?? 'No se pudo crear la cita',
          details: insertError,
        },
      });
    }

    return jsonResponse(200, {
      success: true,
      appointment,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse(status, {
      success: false,
      error: {
        code: status === 401 ? 'unauthorized' : 'internal_error',
        message,
      },
    });
  }
});
