import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingResult {
  success: boolean;
  processed_rules: number;
  notifications_created: number;
  processed_at: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🏥 Iniciando procesamiento de reglas clínicas automáticas...')
    
    // Call the database function to process clinical rules
    const { data, error } = await supabaseClient
      .rpc('process_clinical_rules')

    if (error) {
      console.error('❌ Error procesando reglas clínicas:', error)
      throw error
    }

    const result: ProcessingResult = data as ProcessingResult

    console.log(`✅ Procesamiento completado:`)
    console.log(`   - Reglas procesadas: ${result.processed_rules}`)
    console.log(`   - Notificaciones creadas: ${result.notifications_created}`)
    console.log(`   - Tiempo de procesamiento: ${result.processed_at}`)

    // Optionally, we can add additional logging or monitoring here
    if (result.notifications_created > 0) {
      console.log(`📧 Se crearon ${result.notifications_created} nuevas notificaciones clínicas`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reglas clínicas procesadas exitosamente',
        data: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Error fatal en procesamiento de reglas clínicas:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      },
    )
  }
})

/* 
DOCUMENTACIÓN DE LA EDGE FUNCTION

Esta función se ejecuta automáticamente para procesar reglas clínicas y generar
notificaciones proactivas según los requerimientos de la NOM-024.

FUNCIONALIDAD:
1. Llama a la función process_clinical_rules() de PostgreSQL
2. Genera notificaciones automáticas para pacientes que requieren seguimiento
3. Registra estadísticas del procesamiento
4. Maneja errores de forma robusta

REGLAS IMPLEMENTADAS:
- Pacientes con diabetes sin consulta en 6+ meses
- Pacientes con hipertensión sin consulta en 4+ meses  
- Pacientes con cardiopatías sin consulta en 3+ meses

CONFIGURACIÓN DE CRON:
Para ejecutar automáticamente, configurar en el panel de Supabase:
- Función: process-clinical-rules
- Frecuencia: Diaria (ej: 0 8 * * * - todos los días a las 8 AM)
- Región: Misma que la base de datos

MONITOREO:
- Los logs aparecen en la consola de Edge Functions
- Estadísticas incluyen: reglas procesadas, notificaciones creadas
- Errores se registran con detalles completos

CUMPLIMIENTO NOM-024:
- Genera alertas preventivas automatizadas
- Mejora la continuidad de la atención médica
- Reduce riesgos por falta de seguimiento
- Fortalece la propuesta de valor de "Sofisticación Clínica"
*/
