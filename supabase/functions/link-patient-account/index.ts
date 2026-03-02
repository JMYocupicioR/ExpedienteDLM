import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

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

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: buildCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: buildCorsHeaders(req),
    });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Missing service configuration' }), {
        status: 500,
        headers: buildCorsHeaders(req),
      });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: buildCorsHeaders(req),
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth session' }), {
        status: 401,
        headers: buildCorsHeaders(req),
      });
    }

    const currentUser = authData.user;
    const now = Date.now();

    const { data: tokenRow, error: tokenError } = await supabase
      .from('patient_registration_tokens')
      .select('id, token, doctor_id, clinic_id, selected_scale_ids, required_scale_ids, selected_exercise_ids, custom_tasks, assigned_patient_id, expires_at, status, create_conversation, message_template, assigned_task_ids')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 404,
        headers: buildCorsHeaders(req),
      });
    }

    const expired = new Date(tokenRow.expires_at).getTime() < now;
    if (expired) {
      return new Response(JSON.stringify({ error: 'Token expirado' }), {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    if (tokenRow.status !== 'pending' && tokenRow.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Token no disponible para vinculación' }), {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    const { data: linkedPatients } = await supabase
      .from('patients')
      .select('id, clinic_id, primary_doctor_id')
      .eq('patient_user_id', currentUser.id)
      .order('created_at', { ascending: false });

    let patientId: string | null = tokenRow.assigned_patient_id || null;

    if (!patientId) {
      patientId = linkedPatients?.[0]?.id || null;
    }

    if (!patientId && currentUser.email) {
      const { data: existingByEmail } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', tokenRow.clinic_id)
        .eq('primary_doctor_id', tokenRow.doctor_id)
        .eq('email', currentUser.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      patientId = existingByEmail?.id || null;
    }

    if (!patientId) {
      const fallbackName = (currentUser.user_metadata?.full_name as string | undefined)
        || (currentUser.email ? currentUser.email.split('@')[0] : 'Paciente');
      const { data: createdPatient, error: createPatientError } = await supabase
        .from('patients')
        .insert({
          full_name: fallbackName,
          email: currentUser.email || null,
          clinic_id: tokenRow.clinic_id,
          primary_doctor_id: tokenRow.doctor_id,
          patient_user_id: currentUser.id,
          insurance_info: {},
          emergency_contact: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createPatientError || !createdPatient) {
        return new Response(JSON.stringify({ error: 'No se pudo crear el registro de paciente' }), {
          status: 400,
          headers: buildCorsHeaders(req),
        });
      }
      patientId = createdPatient.id;
    } else {
      const { data: patientRow, error: patientError } = await supabase
        .from('patients')
        .select('id, patient_user_id')
        .eq('id', patientId)
        .single();

      if (patientError || !patientRow) {
        return new Response(JSON.stringify({ error: 'Paciente no encontrado para vinculación' }), {
          status: 404,
          headers: buildCorsHeaders(req),
        });
      }

      if (patientRow.patient_user_id && patientRow.patient_user_id !== currentUser.id) {
        return new Response(JSON.stringify({ error: 'Este paciente ya está vinculado a otra cuenta' }), {
          status: 409,
          headers: buildCorsHeaders(req),
        });
      }

      const { error: linkError } = await supabase
        .from('patients')
        .update({
          patient_user_id: currentUser.id,
          email: currentUser.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patientId);

      if (linkError) {
        return new Response(JSON.stringify({ error: 'No se pudo vincular la cuenta con el paciente' }), {
          status: 400,
          headers: buildCorsHeaders(req),
        });
      }

      // Si existe un paciente asignado al token, desasocia duplicados huérfanos del mismo usuario.
      // Previene que el portal lea el paciente equivocado cuando hay más de un registro vinculado.
      if (tokenRow.assigned_patient_id && Array.isArray(linkedPatients) && linkedPatients.length > 0) {
        const orphanIds = linkedPatients
          .filter((row) =>
            row.id !== tokenRow.assigned_patient_id
            && !row.clinic_id
            && !row.primary_doctor_id
          )
          .map((row) => row.id);

        if (orphanIds.length > 0) {
          await supabase
            .from('patients')
            .update({
              patient_user_id: null,
              updated_at: new Date().toISOString(),
            })
            .in('id', orphanIds)
            .eq('patient_user_id', currentUser.id);
        }
      }
    }

    const selectedScaleIds = Array.isArray(tokenRow.selected_scale_ids) ? tokenRow.selected_scale_ids.filter((value: string) => isUuid(value)) : [];
    const requiredScaleIds = Array.isArray(tokenRow.required_scale_ids) ? tokenRow.required_scale_ids.filter((value: string) => isUuid(value)) : [];
    const mergedScaleIds = Array.from(new Set([...selectedScaleIds, ...requiredScaleIds]));
    const requiredSet = new Set(requiredScaleIds);

    const createdTaskIds: string[] = [];
    if (mergedScaleIds.length > 0) {
      const { data: existingTasks } = await supabase
        .from('patient_tasks')
        .select('scale_id')
        .eq('patient_id', patientId)
        .eq('task_type', 'scale')
        .in('scale_id', mergedScaleIds);

      const existingScaleIds = new Set((existingTasks || []).map((row: any) => row.scale_id).filter(Boolean));

      const rowsToInsert = mergedScaleIds
        .filter((scaleId) => !existingScaleIds.has(scaleId))
        .map((scaleId) => ({
          patient_id: patientId,
          doctor_id: tokenRow.doctor_id,
          clinic_id: tokenRow.clinic_id,
          task_type: 'scale',
          title: requiredSet.has(scaleId) ? 'Escala médica obligatoria' : 'Escala médica asignada',
          description: 'Completa esta escala en la app del paciente.',
          scale_id: scaleId,
          scheduled_date: new Date().toISOString().slice(0, 10),
          priority: requiredSet.has(scaleId) ? 'high' : 'normal',
        }));

      if (rowsToInsert.length > 0) {
        const { data: insertedTasks, error: taskError } = await supabase
          .from('patient_tasks')
          .insert(rowsToInsert as any)
          .select('id');

        if (taskError) {
          return new Response(JSON.stringify({ error: `No se pudieron crear tareas de escalas: ${taskError.message}` }), {
            status: 400,
            headers: buildCorsHeaders(req),
          });
        }

        for (const row of insertedTasks || []) {
          if (row?.id) createdTaskIds.push(row.id as string);
        }
      }
    }

    const selectedExerciseIds = Array.isArray(tokenRow.selected_exercise_ids)
      ? tokenRow.selected_exercise_ids.filter((value: string) => isUuid(value))
      : [];
    if (selectedExerciseIds.length > 0) {
      const { data: existingExerciseTasks } = await supabase
        .from('patient_tasks')
        .select('exercise_id')
        .eq('patient_id', patientId)
        .eq('task_type', 'exercise')
        .in('exercise_id', selectedExerciseIds);

      const existingExerciseSet = new Set((existingExerciseTasks || []).map((row: any) => row.exercise_id).filter(Boolean));
      const exerciseRowsToInsert = selectedExerciseIds
        .filter((exerciseId) => !existingExerciseSet.has(exerciseId))
        .map((exerciseId) => ({
          patient_id: patientId,
          doctor_id: tokenRow.doctor_id,
          clinic_id: tokenRow.clinic_id,
          task_type: 'exercise',
          title: 'Ejercicio asignado',
          description: 'Completa tu rutina asignada por tu médico.',
          exercise_id: exerciseId,
          scheduled_date: new Date().toISOString().slice(0, 10),
          priority: 'normal',
        }));

      if (exerciseRowsToInsert.length > 0) {
        const { data: insertedExerciseTasks, error: exerciseTaskError } = await supabase
          .from('patient_tasks')
          .insert(exerciseRowsToInsert as any)
          .select('id');

        if (exerciseTaskError) {
          return new Response(JSON.stringify({ error: `No se pudieron crear tareas de ejercicios: ${exerciseTaskError.message}` }), {
            status: 400,
            headers: buildCorsHeaders(req),
          });
        }

        for (const row of insertedExerciseTasks || []) {
          if (row?.id) createdTaskIds.push(row.id as string);
        }
      }
    }

    const customTasks = Array.isArray(tokenRow.custom_tasks) ? tokenRow.custom_tasks : [];
    if (customTasks.length > 0) {
      const customRowsToInsert = customTasks
        .filter((task: any) => task && typeof task.title === 'string' && task.title.trim().length > 0)
        .map((task: any) => ({
          patient_id: patientId,
          doctor_id: tokenRow.doctor_id,
          clinic_id: tokenRow.clinic_id,
          task_type: 'custom',
          title: String(task.title).trim(),
          description: typeof task.description === 'string' && task.description.trim().length > 0 ? task.description.trim() : null,
          scheduled_date: typeof task.scheduledDate === 'string' && task.scheduledDate.length > 0
            ? task.scheduledDate
            : new Date().toISOString().slice(0, 10),
          priority: 'normal',
        }));

      if (customRowsToInsert.length > 0) {
        const { data: insertedCustomTasks, error: customTaskError } = await supabase
          .from('patient_tasks')
          .insert(customRowsToInsert as any)
          .select('id');

        if (customTaskError) {
          return new Response(JSON.stringify({ error: `No se pudieron crear tareas personalizadas: ${customTaskError.message}` }), {
            status: 400,
            headers: buildCorsHeaders(req),
          });
        }

        for (const row of insertedCustomTasks || []) {
          if (row?.id) createdTaskIds.push(row.id as string);
        }
      }
    }

    let conversationId: string | null = null;
    if (tokenRow.create_conversation) {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('doctor_id', tokenRow.doctor_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingConversation?.id) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            patient_id: patientId,
            doctor_id: tokenRow.doctor_id,
            clinic_id: tokenRow.clinic_id,
            is_active: true,
          } as any)
          .select('id')
          .single();

        if (!conversationError && newConversation?.id) {
          conversationId = newConversation.id;
          if (tokenRow.message_template && tokenRow.message_template.trim().length > 0) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              sender_type: 'system',
              sender_id: tokenRow.doctor_id,
              patient_id: patientId,
              doctor_id: tokenRow.doctor_id,
              content: tokenRow.message_template.trim(),
            } as any);
          }
        }
      }
    }

    const historicalTaskIds = Array.isArray(tokenRow.assigned_task_ids) ? tokenRow.assigned_task_ids : [];
    const allTaskIds = Array.from(new Set([...historicalTaskIds, ...createdTaskIds]));

    await supabase
      .from('patient_registration_tokens')
      .update({
        assigned_patient_id: patientId,
        assigned_task_ids: allTaskIds,
      } as any)
      .eq('id', tokenRow.id);

    return new Response(
      JSON.stringify({
        success: true,
        patient_id: patientId,
        created_tasks_count: createdTaskIds.length,
        conversation_id: conversationId,
      }),
      { status: 200, headers: buildCorsHeaders(req) },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: buildCorsHeaders(req) },
    );
  }
});
