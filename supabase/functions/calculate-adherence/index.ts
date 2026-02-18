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

    const targetDate = new Date().toISOString().slice(0, 10);
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, primary_doctor_id')
      .eq('is_active', true);
    if (patientsError) throw patientsError;

    let updated = 0;
    for (const patient of patients || []) {
      const { data: tasks } = await supabase
        .from('patient_tasks')
        .select('id, task_type, status, completed_at')
        .eq('patient_id', patient.id)
        .eq('scheduled_date', targetDate);

      const allTasks = tasks || [];
      const tasksTotal = allTasks.length;
      const tasksCompleted = allTasks.filter((item) => item.status === 'completed').length;
      const scalesPending = allTasks.filter((item) => item.task_type === 'scale' && item.status !== 'completed').length;
      const scalesCompleted = allTasks.filter((item) => item.task_type === 'scale' && item.status === 'completed').length;
      const exercisesPending = allTasks.filter((item) => item.task_type === 'exercise' && item.status !== 'completed').length;
      const exercisesCompleted = allTasks.filter((item) => item.task_type === 'exercise' && item.status === 'completed').length;
      const adherenceScore = tasksTotal ? Number(((tasksCompleted / tasksTotal) * 100).toFixed(2)) : 100;

      await supabase.from('patient_adherence').upsert({
        patient_id: patient.id,
        doctor_id: patient.primary_doctor_id,
        date: targetDate,
        tasks_total: tasksTotal,
        tasks_completed: tasksCompleted,
        scales_pending: scalesPending,
        scales_completed: scalesCompleted,
        exercises_pending: exercisesPending,
        exercises_completed: exercisesCompleted,
        adherence_score: adherenceScore,
        last_activity_at: allTasks.find((item) => item.completed_at)?.completed_at || null,
      }, { onConflict: 'patient_id,date' });

      if (patient.primary_doctor_id && adherenceScore < 50) {
        await supabase.from('notifications').insert({
          user_id: patient.primary_doctor_id,
          title: 'Alerta de adherencia',
          message: `Paciente ${patient.id} en riesgo de baja adherencia (${adherenceScore}%).`,
          priority: 'urgent',
          related_entity_type: 'patient_adherence',
          related_entity_id: patient.id,
        });
      }

      updated += 1;
    }

    return new Response(JSON.stringify({ success: true, date: targetDate, patients_updated: updated }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
