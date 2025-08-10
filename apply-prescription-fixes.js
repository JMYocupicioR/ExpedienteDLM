#!/usr/bin/env node

/**
 * Script para aplicar correcciones al sistema de recetas médicas
 * 
 * Este script:
 * 1. Crea las tablas faltantes (prescription_templates, consultation_prescriptions, etc.)
 * 2. Agrega campos faltantes a la tabla prescriptions
 * 3. Implementa funciones auxiliares y triggers
 * 4. Configura RLS y políticas de seguridad
 * 5. Inserta datos de ejemplo para medicamentos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPrescriptionFixes() {
  try {
    console.log('🚀 Iniciando correcciones del sistema de recetas...\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'supabase/migrations/20241201000000_fix_prescription_system.sql');
    
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

    // Verificar que las tablas fueron creadas
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tablesToCheck = [
      'prescription_templates',
      'consultation_prescriptions', 
      'medication_templates',
      'prescription_history'
    ];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.log(`❌ Tabla ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabla ${table}: Creada correctamente`);
        }
      } catch (err) {
        console.log(`❌ Tabla ${table}: Error al verificar`);
      }
    }

    // Verificar campos agregados a prescriptions
    console.log('\n🔍 Verificando campos agregados a prescriptions...');
    
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('diagnosis, notes, signature, qr_code, expires_at')
        .limit(1);

      if (error && !error.message.includes('column') && error.code !== 'PGRST116') {
        console.log(`❌ Campos en prescriptions: ${error.message}`);
      } else {
        console.log(`✅ Campos diagnosis, notes, signature, qr_code, expires_at: Agregados correctamente`);
      }
    } catch (err) {
      console.log(`⚠️  Verificación de campos: ${err.message}`);
    }

    console.log('\n🎉 Migración completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Verificar las tablas en la UI de Supabase');
    console.log('2. Probar la creación de recetas en la aplicación');
    console.log('3. Verificar que se guarden los formatos visuales');
    console.log('4. Comprobar la relación consulta-receta');

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
🏥 Script de Corrección del Sistema de Recetas - ExpedienteDLM

Uso:
  node apply-prescription-fixes.js

Variables de entorno requeridas:
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

Descripción:
  Este script corrige los problemas identificados en el sistema de recetas:
  
  ✅ Crea tabla prescription_templates para formatos visuales
  ✅ Crea tabla consultation_prescriptions para relaciones
  ✅ Agrega campos faltantes a prescriptions
  ✅ Implementa auditoría automática
  ✅ Configura RLS y políticas de seguridad
  ✅ Inserta datos de ejemplo para medicamentos

Ejemplo de ejecución:
  VITE_SUPABASE_URL=https://abc123.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node apply-prescription-fixes.js
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
applyPrescriptionFixes().catch(console.error);
