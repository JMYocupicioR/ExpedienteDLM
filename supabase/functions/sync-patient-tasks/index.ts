import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const assignmentId = body.assignment_id as string | undefined;
    const scaleTask = body.scale_task as Record<string, unknown> | undefined;

    if (assignmentId) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('patient_exercise_assignments')
        .select('id, patient_id, doctor_id, start_date, end_date, notes, exercise_id')
        .eq('id', assignmentId)
        .maybeSingle();
      if (assignmentError || !assignment) {
        return new Response(JSON.stringify({ success: false, error: 'Assignment not found' }), { status: 404, headers: corsHeaders });
      }

      await supabase.from('patient_tasks').insert({
        patient_id: assignment.patient_id,
        doctor_id: assignment.doctor_id,
        task_type: 'exercise',
        title: 'Ejercicio asignado',
        description: assignment.notes || 'Completa tu rutina diaria',
        exercise_id: assignment.exercise_id,
        scheduled_date: assignment.start_date,
        due_date: assignment.end_date ? `${assignment.end_date}T23:59:00Z` : null,
      });
    }

    if (scaleTask) {
      await supabase.from('patient_tasks').insert({
        patient_id: scaleTask.patient_id,
        doctor_id: scaleTask.doctor_id,
        clinic_id: scaleTask.clinic_id || null,
        task_type: 'scale',
        title: scaleTask.title || 'Escala asignada',
        description: scaleTask.description || null,
        scale_id: scaleTask.scale_id,
        scheduled_date: scaleTask.scheduled_date || new Date().toISOString().slice(0, 10),
        scheduled_time: scaleTask.scheduled_time || null,
        recurrence_rule: scaleTask.recurrence_rule || null,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
