#!/usr/bin/env node

/**
 * Script de emergencia para limpiar políticas RLS duplicadas
 * Útil cuando las migraciones fallan por conflictos de políticas
 */

import { execSync } from 'child_process';

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function emergencyCleanup() {
  log('🚨 INICIANDO LIMPIEZA DE EMERGENCIA DE POLÍTICAS RLS');
  log('=====================================================\n');
  
  try {
    // Paso 1: Aplicar solo la migración de emergencia
    log('Paso 1: Aplicando limpieza de emergencia...');
    execSync('npx supabase db push --include-all', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('Limpieza de emergencia aplicada exitosamente', 'success');
    
    // Paso 2: Verificar que no hay políticas INSERT
    log('\nPaso 2: Verificando estado de políticas...');
    execSync('node verify-migrations.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('\n🎉 ¡Limpieza de emergencia completada!', 'success');
    log('\n📋 Estado actual:');
    log('   ✅ Políticas INSERT duplicadas eliminadas');
    log('   ✅ Base de datos lista para nuevas políticas');
    log('   ✅ Puedes continuar con las migraciones normales');
    
    log('\n🔄 Próximos pasos:');
    log('   1. Ejecutar: node apply-curp-migrations.js');
    log('   2. O aplicar manualmente: npx supabase db push');
    
  } catch (error) {
    log(`Error durante la limpieza de emergencia: ${error.message}`, 'error');
    log('\n🔧 Solución de problemas manual:');
    log('   1. Conectar a Supabase Dashboard > SQL Editor');
    log('   2. Ejecutar manualmente:');
    log('      DROP POLICY IF EXISTS "patients_insert_only_active_approved_clinics" ON public.patients;');
    log('      DROP POLICY IF EXISTS "patients_insert_by_clinic" ON public.patients;');
    log('      DROP POLICY IF EXISTS "patients_insert_clinic" ON public.patients;');
    log('   3. Verificar con: SELECT * FROM pg_policies WHERE tablename = \'patients\';');
    process.exit(1);
  }
}

function main() {
  log('⚠️  ADVERTENCIA: Este script eliminará TODAS las políticas INSERT de la tabla patients');
  log('   Solo ejecuta esto si tienes problemas con políticas duplicadas');
  log('   ¿Deseas continuar? (y/N)');
  
  // En modo automático, continuar
  if (process.env.AUTO_CONFIRM === 'true') {
    log('Modo automático detectado, continuando...');
    emergencyCleanup();
  } else {
    // En modo interactivo, esperar confirmación
    process.stdin.once('data', (data) => {
      const input = data.toString().trim().toLowerCase();
      if (input === 'y' || input === 'yes') {
        emergencyCleanup();
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

export { main as emergencyPolicyCleanup };
