#!/usr/bin/env node

/**
 * Script para verificar si el sistema de citas mejorado necesita migración
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Verificar variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.log('⚠️  Variables de entorno no configuradas');
  console.log('Por favor configura SUPABASE_URL y SUPABASE_ANON_KEY');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMigrationStatus() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // Verificar tabla appointments
    let appointmentsExists = false;
    let appointmentsHasNewColumns = false;
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, external_calendar_event_id')
        .limit(1);
      
      if (!error) {
        appointmentsExists = true;
        // Si puede seleccionar estas columnas, las nuevas columnas existen
        appointmentsHasNewColumns = true;
      }
    } catch (err) {
      // Tabla no existe o no tiene las nuevas columnas
    }

    // Verificar tabla notifications
    let notificationsExists = false;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);
      
      if (!error) {
        notificationsExists = true;
      }
    } catch (err) {
      // Tabla no existe
    }

    // Verificar funciones
    let functionsExist = false;
    
    try {
      const { data, error } = await supabase
        .rpc('check_appointment_conflict', {
          p_doctor_id: '00000000-0000-0000-0000-000000000000',
          p_appointment_date: '2025-01-01',
          p_appointment_time: '09:00',
          p_duration: 30
        });
      
      if (!error || error.message.includes('function check_appointment_conflict')) {
        functionsExist = true;
      }
    } catch (err) {
      // Función no existe
    }

    // Mostrar estado
    console.log('📊 Estado de la base de datos:');
    console.log(`   Tabla appointments: ${appointmentsExists ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   Nuevas columnas appointments: ${appointmentsHasNewColumns ? '✅ Existen' : '❌ No existen'}`);
    console.log(`   Tabla notifications: ${notificationsExists ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   Funciones de verificación: ${functionsExist ? '✅ Existen' : '❌ No existen'}`);

    const needsMigration = !appointmentsExists || !appointmentsHasNewColumns || !notificationsExists || !functionsExist;

    if (needsMigration) {
      console.log('\n🚨 MIGRACIÓN NECESARIA');
      console.log('Para implementar el sistema de citas mejorado, ejecuta:');
      console.log('   node apply-enhanced-appointment-system.js');
      console.log('\nEsto creará:');
      console.log('   • Tabla appointments con estados mejorados');
      console.log('   • Tabla notifications para notificaciones en tiempo real');
      console.log('   • Funciones para verificación de conflictos');
      console.log('   • Políticas de seguridad (RLS)');
      console.log('   • Índices optimizados');
    } else {
      console.log('\n✅ ¡Sistema de citas mejorado ya está implementado!');
      console.log('Todas las tablas y funciones necesarias están disponibles.');
      console.log('\nCaracterísticas disponibles:');
      console.log('   • Estados de citas con ciclo de vida completo');
      console.log('   • Verificación automática de conflictos');
      console.log('   • Sistema de notificaciones en tiempo real');
      console.log('   • Preparado para integración con Google Calendar');
    }

  } catch (error) {
    console.error('\n❌ Error verificando la base de datos:');
    console.error(error.message);
    console.log('\nVerifica:');
    console.log('   • Credenciales de Supabase correctas');
    console.log('   • Conexión a internet');
    console.log('   • Permisos de acceso a la base de datos');
  }
}

checkMigrationStatus().catch(console.error);
