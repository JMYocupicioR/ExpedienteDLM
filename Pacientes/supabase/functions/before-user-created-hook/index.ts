<<<<<<< Current (Your changes)
=======
// Hook que se ejecuta antes de crear un usuario en Supabase
// Esta función se ejecuta automáticamente cuando un usuario se registra

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

    // Obtener datos del usuario que se está creando
    const { user, event } = await req.json()

    console.log('🔄 Hook before-user-created ejecutándose para:', user.email)

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando usuario existente:', checkError)
      throw checkError
    }

    if (existingUser) {
      console.log('⚠️ Usuario ya existe en profiles:', user.id)
      return new Response(
        JSON.stringify({ message: 'Usuario ya existe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const metadataRole = user.user_metadata?.role;
    const sourceApp = user.user_metadata?.source_app;
    const normalizedRole = typeof metadataRole === 'string' ? metadataRole.toLowerCase() : null;
    const resolvedRole =
      normalizedRole && ['patient', 'doctor', 'health_staff', 'admin_staff'].includes(normalizedRole)
        ? normalizedRole
        : sourceApp === 'pacientes'
          ? 'patient'
          : 'doctor';

    // Crear perfil básico para el usuario
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      role: resolvedRole,
      registration_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Campos adicionales del perfil
      phone: user.user_metadata?.phone || '',
      address: user.user_metadata?.address || '',
      bio: user.user_metadata?.bio || '',
      consultation_fee: user.user_metadata?.consultation_fee || '',
      languages: user.user_metadata?.languages || '',
      certifications: user.user_metadata?.certifications || '',
      awards: user.user_metadata?.awards || '',
      emergency_contact: user.user_metadata?.emergency_contact || ''
    }

    // Insertar perfil en la base de datos
    const { data: profile, error: insertError } = await supabaseClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creando perfil:', insertError)
      throw insertError
    }

    console.log('✅ Perfil creado exitosamente para:', user.email)

    // Retornar respuesta exitosa
    return new Response(
      JSON.stringify({ 
        message: 'Usuario creado exitosamente',
        profile: profile 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Error en before-user-created hook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
>>>>>>> Incoming (Background Agent changes)
