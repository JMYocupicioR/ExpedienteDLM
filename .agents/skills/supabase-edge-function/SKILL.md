---
name: supabase-edge-function
description: Cómo crear y editar Edge Functions de Supabase (Deno) para ExpedienteDLM
---

# Supabase Edge Function Skill

## Ubicación
`supabase/functions/<nombre-funcion>/index.ts`

## Estructura base

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const buildCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get('origin') || '*';
  const reqHeaders = req.headers.get('access-control-request-headers') 
    || 'authorization, x-client-info, apikey, content-type';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': reqHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
};

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: buildCorsHeaders(req) });
  }

  // 2. Method validation
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: buildCorsHeaders(req),
    });
  }

  try {
    // 3. Parse body
    const body = await req.json();

    // 4. Supabase client con SERVICE_ROLE (bypasea RLS)
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // 5. Auth validation
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: buildCorsHeaders(req),
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth session' }), {
        status: 401, headers: buildCorsHeaders(req),
      });
    }

    const currentUser = authData.user;

    // 6. Business logic aquí...

    // 7. Response exitosa
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: buildCorsHeaders(req),
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Internal error' }), {
      status: 500, headers: buildCorsHeaders(req),
    });
  }
});
```

## Edge functions existentes (18)

| Función | Propósito |
|---|---|
| `link-patient-account` | Vinculación paciente-usuario via token |
| `complete-patient-registration` | Registro público de paciente |
| `validate-patient-registration` | Validación previa al registro |
| `check-patient-exists` | Verificar si existe paciente |
| `check-appointment-availability` | Disponibilidad de citas |
| `schedule-appointment` | Agendar cita |
| `search-clinics` | Búsqueda de clínicas |
| `google-calendar-auth` | OAuth de Google Calendar |
| `google-calendar-sync` | Sincronización de calendario |
| `verify-hcaptcha` | Verificación captcha |
| `send-push-notification` | Notificaciones push |
| `calculate-adherence` | Cálculo de adherencia |
| `sync-patient-tasks` | Sincronización de tareas |
| `process-automation-rules` | Motor de automatización |
| `process-clinical-rules` | Reglas clínicas |
| `generate-progress-report` | Reportes de progreso |
| `before-user-created-hook` | Auth hook: pre-creación |
| `custom-access-token-hook` | Auth hook: JWT custom |

## Reglas críticas

1. **SIEMPRE** manejar OPTIONS (CORS preflight)
2. **SIEMPRE** validar auth con `supabase.auth.getUser(bearerToken)`
3. Usar `SUPABASE_SERVICE_ROLE_KEY` (no la anon key) — bypasea RLS
4. Respuestas siempre incluyen `buildCorsHeaders(req)`
5. Errores en español para el usuario: `'Token inválido'`, `'No autorizado'`
6. `persistSession: false` en el client config

## Cómo invocar desde el frontend

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.functions.invoke('nombre-funcion', {
  body: { param1: 'valor' },
});
```

## Testing local

```powershell
supabase functions serve nombre-funcion --env-file .env.local
```

## Variables de entorno disponibles en Deno

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- Variables custom configuradas en Supabase Dashboard > Edge Functions > Secrets
