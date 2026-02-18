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
    const patientId = body.patient_id as string;
    const title = body.title as string;
    const message = body.message as string;

    if (!patientId || !title || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), { status: 400, headers: corsHeaders });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true);
    if (subError) throw subError;

    // Placeholder: Web Push integration can be plugged here using VAPID credentials.
    // We persist the notification intent as in-app fallback.
    const { data: patient } = await supabase
      .from('patients')
      .select('patient_user_id')
      .eq('id', patientId)
      .maybeSingle();

    if (patient?.patient_user_id) {
      await supabase.from('notifications').insert({
        user_id: patient.patient_user_id,
        title,
        message,
        priority: body.priority || 'normal',
        related_entity_type: 'push_fallback',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptions_found: subscriptions?.length || 0,
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
