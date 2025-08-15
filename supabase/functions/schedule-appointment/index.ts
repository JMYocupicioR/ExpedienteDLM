import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleAppointmentRequest {
  doctor_id: string;
  patient_id: string;
  clinic_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: 'consultation' | 'follow_up' | 'check_up' | 'procedure' | 'emergency';
  location?: string;
  notes?: string;
}

interface ScheduleAppointmentResponse {
  success: boolean;
  appointment?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
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
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuario no autenticado',
          },
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
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Solo se permite el método POST',
          },
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parsear request body
    const requestData: ScheduleAppointmentRequest = await req.json();

    // Validar datos requeridos
    const requiredFields = ['doctor_id', 'patient_id', 'clinic_id', 'title', 'appointment_date', 'appointment_time', 'type'];
    const missingFields = requiredFields.filter(field => !requestData[field as keyof ScheduleAppointmentRequest]);

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
            details: { missingFields },
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar permisos del usuario para la clínica
    const { data: userPermissions, error: permissionsError } = await supabaseClient
      .from('clinic_user_relationships')
      .select('role_in_clinic, status, is_active')
      .eq('user_id', user.id)
      .eq('clinic_id', requestData.clinic_id)
      .single();

    if (permissionsError || !userPermissions) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'No tiene permisos para crear citas en esta clínica',
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (userPermissions.status !== 'approved' || !userPermissions.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Su acceso a esta clínica no está aprobado o está inactivo',
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['doctor', 'admin_staff'].includes(userPermissions.role_in_clinic)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Solo médicos y personal administrativo pueden crear citas',
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar si el médico existe y pertenece a la clínica
    const { data: doctorData, error: doctorError } = await supabaseClient
      .from('clinic_user_relationships')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          specialty,
          phone
        )
      `)
      .eq('user_id', requestData.doctor_id)
      .eq('clinic_id', requestData.clinic_id)
      .eq('role_in_clinic', 'doctor')
      .eq('status', 'approved')
      .eq('is_active', true)
      .single();

    if (doctorError || !doctorData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DOCTOR_NOT_FOUND',
            message: 'El médico especificado no existe o no pertenece a esta clínica',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar si el paciente existe y pertenece a la clínica
    const { data: patientData, error: patientError } = await supabaseClient
      .from('patients')
      .select('id, full_name, phone, email, birth_date')
      .eq('id', requestData.patient_id)
      .eq('clinic_id', requestData.clinic_id)
      .single();

    if (patientError || !patientData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'El paciente especificado no existe o no pertenece a esta clínica',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar conflictos de horario usando la función de la base de datos
    const { data: conflictCheck, error: conflictError } = await supabaseClient
      .rpc('check_appointment_conflict', {
        p_doctor_id: requestData.doctor_id,
        p_appointment_date: requestData.appointment_date,
        p_appointment_time: requestData.appointment_time,
        p_duration: requestData.duration || 30,
      });

    if (conflictError) {
      console.error('Error checking appointment conflict:', conflictError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CONFLICT_CHECK_ERROR',
            message: 'Error al verificar conflictos de horario',
            details: conflictError,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (conflictCheck === true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'APPOINTMENT_CONFLICT',
            message: 'Ya existe una cita programada para el médico en este horario',
          },
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear la cita de forma transaccional
    const appointmentData = {
      doctor_id: requestData.doctor_id,
      patient_id: requestData.patient_id,
      clinic_id: requestData.clinic_id,
      title: requestData.title,
      description: requestData.description || null,
      appointment_date: requestData.appointment_date,
      appointment_time: requestData.appointment_time,
      duration: requestData.duration || 30,
      type: requestData.type,
      location: requestData.location || null,
      notes: requestData.notes || null,
      status: 'scheduled' as const,
      reminder_sent: false,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: newAppointment, error: createError } = await supabaseClient
      .from('appointments')
      .insert(appointmentData)
      .select(`
        *,
        patient:patients(id, full_name, phone, email, birth_date),
        doctor:profiles(id, full_name, specialty, phone),
        clinic:clinics(id, name, address)
      `)
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CREATION_ERROR',
            message: 'Error al crear la cita',
            details: createError,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear notificaciones usando la función de la base de datos
    const { error: notificationError } = await supabaseClient
      .rpc('create_appointment_notifications', {
        p_appointment_id: newAppointment.id,
        p_doctor_id: requestData.doctor_id,
        p_patient_id: requestData.patient_id,
        p_clinic_id: requestData.clinic_id,
        p_patient_name: patientData.full_name,
        p_doctor_name: doctorData.profiles.full_name,
        p_appointment_date: requestData.appointment_date,
        p_appointment_time: requestData.appointment_time,
        p_action_type: 'created',
      });

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // No fallar la operación por error en notificaciones, solo loguear
    }

    // Respuesta exitosa
    const response: ScheduleAppointmentResponse = {
      success: true,
      appointment: newAppointment,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in schedule-appointment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
