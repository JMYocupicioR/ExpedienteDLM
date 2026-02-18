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

    const now = new Date().toISOString();
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    let executed = 0;
    let failed = 0;

    for (const rule of rules || []) {
      try {
        const triggerConditions = rule.trigger_conditions || {};
        const actionConfig = rule.action_config || {};

        if (rule.trigger_type === 'time_based' && actionConfig.patient_id && rule.action_type === 'create_task') {
          await supabase.from('patient_tasks').insert({
            patient_id: actionConfig.patient_id,
            doctor_id: rule.doctor_id,
            clinic_id: rule.clinic_id,
            task_type: actionConfig.task_type || 'custom',
            title: actionConfig.title || rule.name,
            description: actionConfig.description || rule.description,
            scheduled_date: actionConfig.scheduled_date || now.slice(0, 10),
            scheduled_time: actionConfig.scheduled_time || null,
            due_date: actionConfig.due_date || null,
            recurrence_rule: triggerConditions,
            trigger_rule_id: rule.id,
          });
        }

        if (rule.action_type === 'send_scale' && actionConfig.patient_id && actionConfig.scale_id) {
          await supabase.from('patient_tasks').insert({
            patient_id: actionConfig.patient_id,
            doctor_id: rule.doctor_id,
            clinic_id: rule.clinic_id,
            task_type: 'scale',
            title: actionConfig.title || 'Nueva escala asignada',
            description: actionConfig.message || 'Completa la escala solicitada por tu medico',
            scale_id: actionConfig.scale_id,
            scheduled_date: now.slice(0, 10),
            recurrence_rule: triggerConditions,
            trigger_rule_id: rule.id,
          });
        }

        if (rule.action_type === 'send_notification' && actionConfig.user_id) {
          await supabase.from('notifications').insert({
            user_id: actionConfig.user_id,
            title: actionConfig.title || 'Notificacion automatica',
            message: actionConfig.message || rule.description || rule.name,
            priority: actionConfig.priority || 'normal',
            related_entity_type: 'automation_rule',
            related_entity_id: rule.id,
          });
        }

        if (actionConfig.patient_id) {
          await supabase.from('automation_executions').insert({
            rule_id: rule.id,
            patient_id: actionConfig.patient_id,
            status: 'executed',
            action_result: { executed_at: now, action_type: rule.action_type },
          });
        }
        executed += 1;
      } catch (error) {
        failed += 1;
        console.error('Automation execution failed', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_rules: rules?.length || 0,
        executed,
        failed,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
