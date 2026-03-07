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

    // ── 1. Validate token ──
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

    // ── 2. Resolve patient record (fixed priority order) ──
    // Priority 1: Use assigned_patient_id from token (set by complete-patient-registration)
    // Priority 2: Search by email + doctor + clinic (finds records created via public registration)
    // Priority 3: Look for already-linked patient records for this user
    // Priority 4: Create a new patient record

    let patientId: string | null = null;

    // Priority 1: Token's assigned_patient_id
    if (tokenRow.assigned_patient_id) {
      const { data: assignedPatient } = await supabase
        .from('patients')
        .select('id, patient_user_id')
        .eq('id', tokenRow.assigned_patient_id)
        .single();

      if (assignedPatient) {
        // Verify not linked to a different user
        if (assignedPatient.patient_user_id && assignedPatient.patient_user_id !== currentUser.id) {
          return new Response(JSON.stringify({ error: 'Este paciente ya está vinculado a otra cuenta' }), {
            status: 409,
            headers: buildCorsHeaders(req),
          });
        }
        patientId = assignedPatient.id;
      }
    }

    // Priority 2: Search by email + doctor + clinic
    if (!patientId && currentUser.email) {
      const { data: existingByEmail } = await supabase
        .from('patients')
        .select('id, patient_user_id')
        .eq('primary_doctor_id', tokenRow.doctor_id)
        .eq('clinic_id', tokenRow.clinic_id)
        .eq('email', currentUser.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingByEmail) {
        if (existingByEmail.patient_user_id && existingByEmail.patient_user_id !== currentUser.id) {
          return new Response(JSON.stringify({ error: 'Este paciente ya está vinculado a otra cuenta' }), {
            status: 409,
            headers: buildCorsHeaders(req),
          });
        }
        patientId = existingByEmail.id;
      }
    }

    // Priority 3: Already-linked patient for this user (with same doctor or any)
    if (!patientId) {
      const { data: linkedPatients } = await supabase
        .from('patients')
        .select('id, clinic_id, primary_doctor_id')
        .eq('patient_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (linkedPatients && linkedPatients.length > 0) {
        // Prefer one with the same doctor, otherwise take first
        const sameDoctor = linkedPatients.find(
          (p) => p.primary_doctor_id === tokenRow.doctor_id
        );
        patientId = sameDoctor?.id || linkedPatients[0].id;
      }
    }

    // Priority 4: Create a new patient record
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
    }

    // ── 3. Link the patient record to the current user ──
    // Always set patient_user_id, primary_doctor_id, and clinic_id from the token
    const { error: linkError } = await supabase
      .from('patients')
      .update({
        patient_user_id: currentUser.id,
        email: currentUser.email || null,
        primary_doctor_id: tokenRow.doctor_id,
        clinic_id: tokenRow.clinic_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId);

    if (linkError) {
      return new Response(JSON.stringify({ error: 'No se pudo vincular la cuenta con el paciente' }), {
        status: 400,
        headers: buildCorsHeaders(req),
      });
    }

    // ── 4. Ensure the user's profile has role 'patient' and is active ──
    await supabase
      .from('profiles')
      .update({
        role: 'patient',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id)
      .neq('role', 'super_admin');

    // ── 5. Detach orphan patient records ──
    // If the user has other patient records with no doctor/clinic, detach them
    // to prevent the portal from reading the wrong record.
    const { data: allLinkedPatients } = await supabase
      .from('patients')
      .select('id, clinic_id, primary_doctor_id')
      .eq('patient_user_id', currentUser.id)
      .neq('id', patientId);

    if (allLinkedPatients && allLinkedPatients.length > 0) {
      const orphanIds = allLinkedPatients
        .filter((row) => !row.clinic_id && !row.primary_doctor_id)
        .map((row) => row.id);

      if (orphanIds.length > 0) {
        await supabase
          .from('patients')
          .update({
            patient_user_id: null,
            updated_at: new Date().toISOString(),
          })
          .in('id', orphanIds);
      }
    }

    // ── 6. Create tasks (scales) ──
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

    // ── 7. Create tasks (exercises) ──
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
        .filter((exerciseId: string) => !existingExerciseSet.has(exerciseId))
        .map((exerciseId: string) => ({
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

    // ── 8. Create tasks (custom) ──
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

    // ── 9. Conversation ──
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

    // ── 10. Update token with assigned info ──
    const historicalTaskIds = Array.isArray(tokenRow.assigned_task_ids) ? tokenRow.assigned_task_ids : [];
    const allTaskIds = Array.from(new Set([...historicalTaskIds, ...createdTaskIds]));

    await supabase
      .from('patient_registration_tokens')
      .update({
        assigned_patient_id: patientId,
        assigned_task_ids: allTaskIds,
      } as any)
      .eq('id', tokenRow.id);

    // ── 11. Fetch doctor info for response ──
    let doctorName: string | null = null;
    let doctorSpecialty: string | null = null;
    if (tokenRow.doctor_id) {
      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('full_name, specialty')
        .eq('id', tokenRow.doctor_id)
        .single();
      if (doctorProfile) {
        doctorName = doctorProfile.full_name;
        doctorSpecialty = doctorProfile.specialty;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: doctorName ? `Vinculado exitosamente con Dr. ${doctorName}` : 'Vinculación exitosa',
        patient_id: patientId,
        doctor_name: doctorName,
        doctor_specialty: doctorSpecialty,
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
