// Hook que personaliza los tokens de acceso de Supabase
// Esta función se ejecuta antes de emitir un token JWT

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener datos del usuario y el token
    const { user, event } = await req.json()

    console.log('🔄 Hook custom-access-token ejecutándose para:', user.email)

    // Obtener perfil del usuario para incluir información adicional en el token
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, full_name, registration_completed')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error obteniendo perfil:', profileError)
      // No fallar si no hay perfil, continuar con datos básicos
    }

    // Crear claims personalizados para el token
    const customClaims = {
      // Claims estándar de Supabase
      sub: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at ? true : false,
      
      // Claims personalizados de ExpedienteDLM
      role: profile?.role || 'doctor',
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      registration_completed: profile?.registration_completed || false,
      
      // Metadatos del usuario
      user_metadata: user.user_metadata,
      
      // Timestamp de creación del token
      iat: Math.floor(Date.now() / 1000),
      
      // Información de la aplicación
      aud: 'authenticated',
      iss: 'supabase',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hora
    }

    console.log('✅ Claims personalizados creados para:', user.email)

    // Retornar los claims personalizados
    return new Response(
      JSON.stringify({ 
        message: 'Token personalizado creado exitosamente',
        claims: customClaims 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Error en custom-access-token hook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
