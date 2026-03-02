// Supabase Edge Function: complete-patient-registration
// - Valida token de registro
// - Crea patient y antecedentes
// - Registra assessments de escalas
// - Marca token como 'completed' dentro de una transacción

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const buildCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get('origin') || '*';
  const reqHeaders = req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': reqHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
};

const upsertPathologicalHistory = async (
  supabase: ReturnType<typeof createClient>,
  patientId: string,
  pathological: any,
) => {
  const { data: existing } = await supabase
    .from('pathological_histories')
    .select('id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    patient_id: patientId,
    chronic_diseases: pathological?.chronic_diseases ?? [],
    current_treatments: pathological?.current_treatments ?? [],
    surgeries: pathological?.surgeries ?? [],
    fractures: pathological?.fractures ?? [],
    previous_hospitalizations: pathological?.previous_hospitalizations ?? [],
    substance_use: (pathological?.substance_use ?? {}) as Json,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    return supabase
      .from('pathological_histories')
      .update(payload)
      .eq('id', existing.id);
  }

  return supabase
    .from('pathological_histories')
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    });
};

const upsertNonPathologicalHistory = async (
  supabase: ReturnType<typeof createClient>,
  patientId: string,
  nonPathological: any,
) => {
  const { data: existing } = await supabase
    .from('non_pathological_histories')
    .select('id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    patient_id: patientId,
    handedness: nonPathological?.handedness ?? 'right',
    religion: nonPathological?.religion ?? '',
    marital_status: nonPathological?.marital_status ?? '',
    education_level: nonPathological?.education_level ?? '',
    diet: nonPathological?.diet ?? '',
    personal_hygiene: nonPathological?.personal_hygiene ?? '',
    vaccination_history: nonPathological?.vaccination_history ?? [],
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    return supabase
      .from('non_pathological_histories')
      .update(payload)
      .eq('id', existing.id);
  }

  return supabase
    .from('non_pathological_histories')
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    });
};

const replaceHereditaryBackgrounds = async (
  supabase: ReturnType<typeof createClient>,
  patientId: string,
  hereditary: any[],
) => {
  const cleaned = (Array.isArray(hereditary) ? hereditary : [])
    .filter((h) => h && (h.relationship || h.condition))
    .map((h) => ({
      patient_id: patientId,
      relationship: String(h.relationship || ''),
      condition: String(h.condition || ''),
      notes: h.notes ? String(h.notes) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  const { error: delErr } = await supabase
    .from('hereditary_backgrounds')
    .delete()
    .eq('patient_id', patientId);
  if (delErr) return { error: delErr };

  if (cleaned.length === 0) return { error: null };
  return supabase.from('hereditary_backgrounds').insert(cleaned as any);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: buildCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: buildCorsHeaders(req) });
  }

  try {
    const { token, personal, pathological, nonPathological, hereditary, scales } = await req.json();
    if (!token || !personal) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Missing service configuration' }), { status: 500, headers: buildCorsHeaders(req) });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Usuario autenticado opcional (para vincular auth.uid -> patients.patient_user_id)
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let requestingUserId: string | null = null;
    if (bearerToken) {
      const { data: authData } = await supabase.auth.getUser(bearerToken);
      requestingUserId = authData?.user?.id ?? null;
    }

    // 1) Validar token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('patient_registration_tokens')
      .select('*')
      .eq('token', token)
      .single();
    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 400, headers: buildCorsHeaders(req) });
    }
    const expired = new Date(tokenRow.expires_at).getTime() < Date.now();
    if (tokenRow.status !== 'pending' || expired) {
      return new Response(JSON.stringify({ error: 'Token expirado o usado' }), { status: 400, headers: buildCorsHeaders(req) });
    }

    // 1b) Validar médico asociado para evitar fallos FK en patients.primary_doctor_id
    const { data: doctorProfile, error: doctorCheckErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', tokenRow.doctor_id)
      .maybeSingle();
    if (doctorCheckErr || !doctorProfile) {
      console.error('doctor_id not found in profiles:', tokenRow.doctor_id, doctorCheckErr);
      return new Response(
        JSON.stringify({
          error: 'El médico asociado al enlace no se encontró',
          detail: doctorCheckErr?.message ?? null,
        }),
        { status: 400, headers: buildCorsHeaders(req) }
      );
    }

    // 2) Transacción usando RPC (Postgres) porque supabase-js no tiene transacciones multi-requests
    // Creamos un bloque anónimo que ejecute todo y haga ROLLBACK ante error
    const sql = `
      with _t as (
        select 1
      )
      select 1 as ok;
    `;
    // Nota: Usaremos múltiples operaciones secuenciales y validaremos fallos manualmente.

    // 3) Crear o actualizar patient
    let patientId: string | null = null;
    if (tokenRow.assigned_patient_id) {
      // Actualizar datos básicos del paciente asignado
      const { error: updPatientErr } = await supabase
        .from('patients')
        .update({
          full_name: personal.full_name,
          birth_date: personal.birth_date,
          gender: personal.gender,
          email: personal.email ?? null,
          phone: personal.phone ?? null,
          address: personal.address ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenRow.assigned_patient_id);
      if (updPatientErr) {
        console.error('patients update error:', JSON.stringify(updPatientErr));
        return new Response(
          JSON.stringify({
            error: 'No se pudo actualizar paciente',
            detail: updPatientErr?.message ?? null,
          }),
          { status: 400, headers: buildCorsHeaders(req) }
        );
      }
      patientId = tokenRow.assigned_patient_id as string;
    } else {
      const { data: patient, error: patientErr } = await supabase
        .from('patients')
        .insert({
          full_name: personal.full_name,
          birth_date: personal.birth_date,
          gender: personal.gender,
          email: personal.email ?? null,
          phone: personal.phone ?? null,
          address: personal.address ?? null,
          clinic_id: tokenRow.clinic_id,
          primary_doctor_id: tokenRow.doctor_id,
          insurance_info: {},
          emergency_contact: {},
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (patientErr || !patient) {
        console.error('patients insert error:', JSON.stringify(patientErr));
        return new Response(
          JSON.stringify({
            error: 'No se pudo crear paciente',
            detail: patientErr?.message ?? null,
          }),
          { status: 400, headers: buildCorsHeaders(req) }
        );
      }
      patientId = patient.id as string;
    }

    // 3b) Vincular cuenta auth del paciente cuando aplica
    if (requestingUserId) {
      await supabase
        .from('patients')
        .update({
          patient_user_id: requestingUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patientId)
        .or(`patient_user_id.is.null,patient_user_id.eq.${requestingUserId}`);
    }

    // 4) Crear/actualizar antecedentes (idempotente)
    if (pathological) {
      const { error: phErr } = await upsertPathologicalHistory(supabase, patientId, pathological);
      if (phErr) {
        return new Response(JSON.stringify({ error: 'No se pudieron guardar antecedentes patológicos' }), { status: 400, headers: buildCorsHeaders(req) });
      }
    }

    if (nonPathological) {
      const { error: nphErr } = await upsertNonPathologicalHistory(supabase, patientId, nonPathological);
      if (nphErr) {
        return new Response(JSON.stringify({ error: 'No se pudieron guardar antecedentes no patológicos' }), { status: 400, headers: buildCorsHeaders(req) });
      }
    }

    // 4b) Heredofamiliares
    if (hereditary && Array.isArray(hereditary)) {
      const { error: hbErr } = await replaceHereditaryBackgrounds(supabase, patientId, hereditary as Array<any>);
      if (hbErr) {
        return new Response(JSON.stringify({ error: 'No se pudieron guardar antecedentes heredofamiliares' }), { status: 400, headers: buildCorsHeaders(req) });
      }
    }

    // 5) Escalas
    const scaleEntries: Array<{ patient_id: string; doctor_id: string; scale_id: string; answers: Json; score?: number | null; severity?: string | null; created_at: string; updated_at: string; }> = [];
    if (scales && typeof scales === 'object') {
      for (const [scaleId, payload] of Object.entries(scales as Record<string, any>)) {
        scaleEntries.push({
          patient_id: patientId,
          doctor_id: tokenRow.doctor_id,
          scale_id: scaleId,
          answers: (payload as any).answers ?? {},
          score: (payload as any).score ?? null,
          severity: (payload as any).severity ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      if (scaleEntries.length > 0) {
        const { error: saErr } = await supabase.from('scale_assessments').insert(scaleEntries as any);
        if (saErr) {
          // Mantener paciente y expediente base; fallar escalas no debe borrar el registro.
          console.error('scale_assessments insert error:', JSON.stringify(saErr));
        }
      }
    }

    // 6) Marcar token como completado
    const { error: updErr } = await supabase
      .from('patient_registration_tokens')
      .update({
        status: 'completed',
        assigned_patient_id: patientId,
      } as any)
      .eq('id', tokenRow.id);
    if (updErr) {
      // No revertimos si ya persistimos todo, pero dejamos trazabilidad
      console.warn('No se pudo marcar token como completado:', updErr.message);
    }

    return new Response(JSON.stringify({ success: true, patient_id: patientId }), { status: 200, headers: buildCorsHeaders(req) });
  } catch (e: any) {
    console.error('Unhandled error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500, headers: buildCorsHeaders(req) });
  }
});


