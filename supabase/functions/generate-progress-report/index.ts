import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function buildReportMarkdown(patientName: string, scaleTrend: any[], adherenceTrend: any[]) {
  return `# Reporte mensual de progreso\n\nPaciente: ${patientName}\nGenerado: ${new Date().toISOString()}\n\n## Escalas\n${JSON.stringify(scaleTrend, null, 2)}\n\n## Adherencia\n${JSON.stringify(adherenceTrend, null, 2)}\n`;
}

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

    const { patient_id: patientId } = await req.json();
    if (!patientId) {
      return new Response(JSON.stringify({ success: false, error: 'patient_id is required' }), { status: 400, headers: corsHeaders });
    }

    const [{ data: patient }, { data: scaleTrend }, { data: adherenceTrend }] = await Promise.all([
      supabase.from('patients').select('full_name').eq('id', patientId).maybeSingle(),
      supabase.from('scale_assessments').select('created_at, score, severity, scale_id').eq('patient_id', patientId).order('created_at', { ascending: true }).limit(120),
      supabase.from('patient_adherence').select('date, adherence_score, status').eq('patient_id', patientId).order('date', { ascending: true }).limit(120),
    ]);

    const content = buildReportMarkdown(patient?.full_name || patientId, scaleTrend || [], adherenceTrend || []);
    const filePath = `${patientId}/report-${new Date().toISOString().slice(0, 10)}.md`;
    const { error: uploadError } = await supabase.storage
      .from('progress-reports')
      .upload(filePath, new Blob([content], { type: 'text/markdown' }), { upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('progress-reports').getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        success: true,
        file_path: filePath,
        public_url: publicUrlData.publicUrl,
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
