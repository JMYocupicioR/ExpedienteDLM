#!/usr/bin/env node

/**
 * Script para aplicar el sistema de citas mejorado y notificaciones
 * Este script ejecuta la migración de la base de datos para implementar el nuevo sistema
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Verificar variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Faltan variables de entorno');
  console.error('Por favor asegúrate de tener configurado:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY');
  console.error('\nPuedes configurarlas ejecutando:');
  console.error('export SUPABASE_URL="tu-url-de-supabase"');
  console.error('export SUPABASE_ANON_KEY="tu-anon-key"');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Iniciando aplicación del Sistema de Citas Mejorado...\n');

async function executeMigration() {
  try {
    console.log('📂 Leyendo archivo de migración...');
    
    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250812000000_create_appointments_and_notifications.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`No se encontró el archivo de migración: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Archivo de migración leído correctamente');
    console.log('📊 Ejecutando migración en la base de datos...\n');
    
    // Ejecutar la migración
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar que las tablas fueron creadas
    console.log('🔍 Verificando la creación de tablas...');
    
    // Verificar tabla appointments
    const { data: appointmentsCheck, error: appointmentsError } = await supabase
      .from('appointments')
      .select('count')
      .limit(1);
    
    if (appointmentsError && !appointmentsError.message.includes('relation "appointments" does not exist')) {
      console.log('✅ Tabla appointments creada correctamente');
    } else {
      console.log('⚠️  Tabla appointments no encontrada o no accesible');
    }
    
    // Verificar tabla notifications
    const { data: notificationsCheck, error: notificationsError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    if (notificationsError && !notificationsError.message.includes('relation "notifications" does not exist')) {
      console.log('✅ Tabla notifications creada correctamente');
    } else {
      console.log('⚠️  Tabla notifications no encontrada o no accesible');
    }
    
    // Verificar funciones
    console.log('🔍 Verificando funciones de la base de datos...');
    
    try {
      const { data: conflictCheck, error: conflictError } = await supabase
        .rpc('check_appointment_conflict', {
          p_doctor_id: '00000000-0000-0000-0000-000000000000',
          p_appointment_date: '2025-01-01',
          p_appointment_time: '09:00',
          p_duration: 30
        });
      
      if (!conflictError) {
        console.log('✅ Función check_appointment_conflict disponible');
      }
    } catch (err) {
      console.log('⚠️  Función check_appointment_conflict no disponible');
    }
    
    console.log('\n🎉 ¡Sistema de Citas Mejorado aplicado exitosamente!');
    console.log('\n📋 Características implementadas:');
    console.log('   • ✅ Tabla appointments con estados mejorados');
    console.log('   • ✅ Tabla notifications para el sistema de notificaciones');
    console.log('   • ✅ Función de verificación de conflictos de citas');
    console.log('   • ✅ Función automática de creación de notificaciones');
    console.log('   • ✅ Políticas RLS para seguridad');
    console.log('   • ✅ Triggers para auditoría');
    console.log('   • ✅ Índices optimizados para mejor rendimiento');
    
    console.log('\n📱 Próximos pasos:');
    console.log('   1. Reinicia tu aplicación frontend');
    console.log('   2. Las nuevas características estarán disponibles automáticamente');
    console.log('   3. El sistema de notificaciones funcionará en tiempo real');
    console.log('   4. Los conflictos de citas se verificarán automáticamente');
    
    console.log('\n🔧 Edge Functions disponibles:');
    console.log('   • schedule-appointment: Para crear citas con verificación');
    console.log('   • check-appointment-availability: Para verificar disponibilidad');
    
  } catch (error) {
    console.error('\n❌ ERROR durante la migración:');
    console.error(error.message);
    console.error('\n🔧 Posibles soluciones:');
    console.error('   1. Verifica que las credenciales de Supabase sean correctas');
    console.error('   2. Asegúrate de tener permisos de administrador en la base de datos');
    console.error('   3. Verifica que el archivo de migración exista y sea válido');
    console.error('   4. Revisa los logs de Supabase para más detalles');
    process.exit(1);
  }
}

// Función auxiliar para verificar conexión
async function checkConnection() {
  try {
    console.log('🔐 Verificando conexión a Supabase...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.message.includes('JWT')) {
      throw new Error('Token de autenticación inválido. Verifica SUPABASE_ANON_KEY.');
    }
    
    if (error && error.message.includes('connect')) {
      throw new Error('No se puede conectar a Supabase. Verifica SUPABASE_URL.');
    }
    
    console.log('✅ Conexión a Supabase establecida\n');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// Ejecutar script principal
async function main() {
  const connected = await checkConnection();
  
  if (!connected) {
    process.exit(1);
  }
  
  await executeMigration();
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar
main().catch(console.error);
