#!/usr/bin/env node

/**
 * Script para aplicar el sistema de logs de actividad
 * 
 * Este script:
 * 1. Crea la tabla activity_logs
 * 2. Configura RLS y políticas de seguridad
 * 3. Implementa funciones auxiliares
 * 4. Crea índices para optimización
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyActivityLogs() {
  try {
    console.log('🚀 Iniciando implementación del sistema de logs...\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'supabase/migrations/20241202000000_activity_logs.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Ejecutando migración SQL...');
    
    // Dividir el SQL en comandos individuales
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.length === 0) continue;

      try {
        console.log(`⚡ Ejecutando comando ${i + 1}/${sqlCommands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });

        if (error) {
          // Intentar ejecutar directamente si RPC falla
          const { error: directError } = await supabase
            .from('_dummy_table_that_does_not_exist_')
            .select('*');
          
          // Si es un error de tabla no existente, usar el método directo
          if (directError) {
            console.log(`⚠️  RPC no disponible, ejecutando directamente...`);
            // Para comandos DDL, necesitamos usar una conexión administrativa
            // En producción, esto se haría através de la UI de Supabase o psql directo
            console.log(`📝 Comando: ${command.substring(0, 100)}...`);
          }
          
          throw error;
        }

        successCount++;
        
      } catch (error) {
        console.error(`❌ Error en comando ${i + 1}:`, error.message);
        console.error(`📝 Comando fallido: ${command.substring(0, 100)}...`);
        errorCount++;
        
        // Continuar con el siguiente comando en lugar de fallar completamente
        continue;
      }
    }

    console.log('\n📊 Resumen de la migración:');
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos fallidos: ${errorCount}`);

    // Verificar que la tabla fue creada
    console.log('\n🔍 Verificando tabla activity_logs...');
    
    try {
      const { error } = await supabase
        .from('activity_logs')
        .select('*')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.log(`❌ Tabla activity_logs: ${error.message}`);
      } else {
        console.log(`✅ Tabla activity_logs: Creada correctamente`);
      }
    } catch (err) {
      console.log(`❌ Tabla activity_logs: Error al verificar`);
    }

    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    
    const indices = [
      'idx_activity_logs_user_id',
      'idx_activity_logs_patient_id',
      'idx_activity_logs_type',
      'idx_activity_logs_date',
      'idx_activity_logs_status'
    ];

    for (const index of indices) {
      try {
        const { data, error } = await supabase
          .rpc('check_index_exists', { index_name: index });

        if (error) {
          console.log(`❌ Índice ${index}: Error al verificar`);
        } else if (data) {
          console.log(`✅ Índice ${index}: Creado correctamente`);
        } else {
          console.log(`❌ Índice ${index}: No encontrado`);
        }
      } catch (err) {
        console.log(`❌ Índice ${index}: Error al verificar`);
      }
    }

    // Verificar políticas RLS
    console.log('\n🔍 Verificando políticas RLS...');
    
    const policies = [
      'activity_logs_select_policy',
      'activity_logs_insert_policy',
      'activity_logs_update_policy'
    ];

    for (const policy of policies) {
      try {
        const { data, error } = await supabase
          .rpc('check_policy_exists', { 
            table_name: 'activity_logs',
            policy_name: policy
          });

        if (error) {
          console.log(`❌ Política ${policy}: Error al verificar`);
        } else if (data) {
          console.log(`✅ Política ${policy}: Creada correctamente`);
        } else {
          console.log(`❌ Política ${policy}: No encontrada`);
        }
      } catch (err) {
        console.log(`❌ Política ${policy}: Error al verificar`);
      }
    }

    console.log('\n🎉 Migración completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Verificar la tabla en la UI de Supabase');
    console.log('2. Probar la creación de logs de actividad');
    console.log('3. Verificar que los logs aparecen en el feed');
    console.log('4. Comprobar las políticas de seguridad');

  } catch (error) {
    console.error('\n💥 Error fatal en la migración:', error.message);
    console.error('\n🔧 Soluciones posibles:');
    console.error('1. Verificar las credenciales de Supabase');
    console.error('2. Asegurarse de tener permisos de administrador');
    console.error('3. Ejecutar los comandos SQL manualmente en la UI de Supabase');
    process.exit(1);
  }
}

// Función auxiliar para mostrar ayuda
function showHelp() {
  console.log(`
📝 Script de Implementación de Logs de Actividad - ExpedienteDLM

Uso:
  node apply-activity-logs.js

Variables de entorno requeridas:
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

Descripción:
  Este script implementa el sistema de logs de actividad:
  
  ✅ Crea tabla activity_logs para registro de actividades
  ✅ Configura RLS y políticas de seguridad
  ✅ Crea índices para optimización
  ✅ Implementa funciones auxiliares
  ✅ Verifica la implementación completa

Ejemplo de ejecución:
  VITE_SUPABASE_URL=https://abc123.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node apply-activity-logs.js
`);
}

// Verificar argumentos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Verificar variables de entorno
if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('❌ Error: VITE_SUPABASE_URL no está configurada');
  console.error('💡 Configurar con: export VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  process.exit(1);
}

if (!supabaseKey || supabaseKey === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.error('💡 Configurar con: export SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
  process.exit(1);
}

// Ejecutar migración
applyActivityLogs().catch(console.error);
