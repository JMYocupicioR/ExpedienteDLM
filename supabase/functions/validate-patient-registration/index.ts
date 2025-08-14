import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Missing service configuration' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: row, error } = await supabase
      .from('patient_registration_tokens')
      .select('*')
      .eq('token', token)
      .single();
    if (error || !row) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const expired = new Date(row.expires_at).getTime() < Date.now();
    if (row.status !== 'pending' || expired) {
      return new Response(JSON.stringify({ error: 'Token expirado o usado' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const [{ data: doctor }, { data: clinic }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', row.doctor_id).single(),
      supabase.from('clinics').select('name').eq('id', row.clinic_id).single(),
    ]);

    let scales: Array<{ id: string; name: string; definition: unknown }> = [];
    const scaleIds: string[] = Array.isArray(row.selected_scale_ids) ? row.selected_scale_ids : [];
    if (scaleIds.length > 0) {
      const { data: defs, error: defsErr } = await supabase
        .from('medical_scales')
        .select('id, name, definition')
        .in('id', scaleIds);
      if (!defsErr && defs) {
        scales = defs as any;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        token_id: row.id,
        token,
        doctor: doctor || null,
        clinic: clinic || null,
        selected_scale_ids: row.selected_scale_ids || [],
        expires_at: row.expires_at,
        status: row.status,
        scales,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Error validate token', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});


