#!/usr/bin/env node

/**
 * Script para aplicar migraciones de CURP en el orden correcto
 * Previene conflictos de políticas RLS existentes
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';

const MIGRATIONS_DIR = './supabase/migrations';
const REQUIRED_MIGRATIONS = [
  '20250814000000_patient_unique_constraints.sql',
  '20250814001000_populate_curp_for_existing_patients.sql',
  '20250814002000_cleanup_existing_policies.sql',
  '20250814003000_emergency_policy_cleanup.sql',
  '20250815000000_strengthen_patient_insert_policy.sql'
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function checkMigrationFiles() {
  log('Verificando archivos de migración...');
  
  const existingFiles = readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  log(`Encontrados ${existingFiles.length} archivos de migración`);
  
  for (const required of REQUIRED_MIGRATIONS) {
    if (!existingFiles.includes(required)) {
      log(`Falta archivo de migración: ${required}`, 'error');
      return false;
    }
    log(`✓ ${required}`);
  }
  
  return true;
}

function applyMigrations() {
  log('Iniciando aplicación de migraciones de CURP...\n');
  
  try {
    // Paso 1: Aplicar migraciones de base de datos
    log('Paso 1: Aplicando migraciones de base de datos...');
    execSync('npx supabase db push', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('Migraciones de base de datos aplicadas exitosamente', 'success');
    
    // Paso 2: Desplegar Edge Function
    log('\nPaso 2: Desplegando Edge Function...');
    execSync('npx supabase functions deploy check-patient-exists', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('Edge Function desplegada exitosamente', 'success');
    
    // Paso 3: Verificar aplicación
    log('\nPaso 3: Verificando aplicación...');
    execSync('node verify-migrations.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('\n🎉 ¡Todas las migraciones se aplicaron exitosamente!', 'success');
    log('\n📋 Resumen de lo que se implementó:');
    log('   ✅ Columna CURP con constraint UNIQUE');
    log('   ✅ Función helper para verificación');
    log('   ✅ Índices optimizados');
    log('   ✅ Políticas RLS fortalecidas');
    log('   ✅ Auditoría automática');
    log('   ✅ Edge Function para validación');
    
  } catch (error) {
    log(`Error durante la aplicación: ${error.message}`, 'error');
    log('\n🔧 Solución de problemas:');
    log('   1. Verifica que Supabase esté ejecutándose');
    log('   2. Revisa los logs en Supabase Dashboard');
    log('   3. Ejecuta manualmente: npx supabase db push');
    log('   4. Si hay conflictos, ejecuta primero:');
    log('      npx supabase db reset');
    process.exit(1);
  }
}

function main() {
  log('🚀 Aplicador de Migraciones CURP - Expediente DLM');
  log('==================================================\n');
  
  // Verificar archivos
  if (!checkMigrationFiles()) {
    log('No se pueden aplicar las migraciones. Faltan archivos requeridos.', 'error');
    process.exit(1);
  }
  
  // Confirmar con el usuario
  log('\n⚠️  ADVERTENCIA: Esta operación modificará la estructura de la base de datos.');
  log('   Se aplicarán las siguientes migraciones:');
  REQUIRED_MIGRATIONS.forEach((migration, index) => {
    log(`   ${index + 1}. ${migration}`);
  });
  
  log('\n¿Deseas continuar? (y/N)');
  
  // En modo automático, continuar
  if (process.env.AUTO_CONFIRM === 'true') {
    log('Modo automático detectado, continuando...');
    applyMigrations();
  } else {
    // En modo interactivo, esperar confirmación
    process.stdin.once('data', (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 'y' || input === 'yes') {
        applyMigrations();
      } else {
        log('Operación cancelada por el usuario.', 'warning');
        process.exit(0);
      }
    });
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as applyCurpMigrations };
