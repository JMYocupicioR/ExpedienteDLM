#!/usr/bin/env node

/**
 * Script para aplicar las migraciones maestras de seguridad
 * Este script aplica las dos migraciones críticas que consolidan
 * el sistema de seguridad del backend.
 * 
 * IMPORTANTE: Ejecutar SOLO después de hacer un backup completo
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  console.error('Por favor, asegúrate de tener un archivo .env con estas variables configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migraciones a aplicar en orden
const migrations = [
  {
    file: '20250817120000_consolidate_master_rls_policies.sql',
    name: 'Consolidación Maestra de Políticas RLS',
    description: 'Unifica todas las políticas de seguridad en un único script maestro'
  },
  {
    file: '20250817130000_automate_profile_creation_trigger.sql',
    name: 'Automatización de Creación de Perfiles',
    description: 'Crea triggers automáticos para sincronizar auth.users con public.profiles'
  }
];

/**
 * Lee el contenido de un archivo SQL
 */
async function readSQLFile(filename) {
  const filepath = path.join(__dirname, 'supabase', 'migrations', filename);
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return content;
  } catch (error) {
    console.error(`❌ Error al leer el archivo ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Ejecuta una migración SQL
 */
async function executeMigration(sql, migrationName) {
  try {
    console.log(`\n🔄 Ejecutando: ${migrationName}...`);
    
    // Dividir el SQL en declaraciones individuales si es necesario
    // Supabase puede manejar múltiples declaraciones, pero es mejor ser explícito
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // Si el RPC no existe, intentar con el cliente SQL directo
      const { data, error: directError } = await supabase
        .from('_supabase_migrations')
        .select('*')
        .limit(1);
      
      if (directError?.message?.includes('exec_sql')) {
        console.log('⚠️  La función exec_sql no existe. Usa el Supabase CLI para aplicar las migraciones:');
        console.log(`   supabase db push`);
        return false;
      }
      
      throw error;
    }
    
    console.log(`✅ ${migrationName} aplicada exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error al ejecutar ${migrationName}:`, error.message);
    throw error;
  }
}

/**
 * Verifica el estado actual del sistema
 */
async function verifySystemState() {
  console.log('\n🔍 Verificando estado del sistema...');
  
  try {
    // Verificar que podemos conectarnos
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      throw new Error(`No se puede acceder a la tabla profiles: ${profilesError.message}`);
    }
    
    // Verificar usuarios sin perfil
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id');
    
    const profileIds = new Set(profilesData?.map(p => p.id) || []);
    const usersWithoutProfile = authUsers?.users?.filter(u => !profileIds.has(u.id)) || [];
    
    if (usersWithoutProfile.length > 0) {
      console.log(`⚠️  Hay ${usersWithoutProfile.length} usuarios sin perfil. Se crearán automáticamente.`);
    } else {
      console.log('✅ Todos los usuarios tienen perfil.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al verificar el estado:', error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando aplicación de migraciones maestras de seguridad');
  console.log('================================================');
  
  // Advertencia importante
  console.log('\n⚠️  ADVERTENCIA IMPORTANTE:');
  console.log('   - Asegúrate de haber hecho un BACKUP COMPLETO de la base de datos');
  console.log('   - Estas migraciones reemplazarán TODAS las políticas de seguridad existentes');
  console.log('   - Se recomienda probar primero en un entorno de staging\n');
  
  // Esperar confirmación del usuario
  console.log('Presiona Ctrl+C para cancelar o espera 10 segundos para continuar...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    // Verificar estado inicial
    const canProceed = await verifySystemState();
    if (!canProceed) {
      console.error('\n❌ El sistema no está en un estado válido para aplicar las migraciones.');
      process.exit(1);
    }
    
    // Aplicar migraciones
    console.log('\n📋 Aplicando migraciones...');
    let allSuccess = true;
    
    for (const migration of migrations) {
      try {
        const sql = await readSQLFile(migration.file);
        const success = await executeMigration(sql, migration.name);
        
        if (!success) {
          allSuccess = false;
          console.log(`\n⚠️  ${migration.name} requiere aplicación manual.`);
          console.log(`   Archivo: supabase/migrations/${migration.file}`);
        }
      } catch (error) {
        allSuccess = false;
        console.error(`\n❌ Error en ${migration.name}:`, error.message);
      }
    }
    
    if (!allSuccess) {
      console.log('\n⚠️  Algunas migraciones no se pudieron aplicar automáticamente.');
      console.log('   Por favor, usa el Supabase CLI para aplicarlas:');
      console.log('   > supabase db push');
      console.log('\n   O aplícalas manualmente desde el dashboard de Supabase.');
    } else {
      // Verificar estado final
      console.log('\n🔍 Verificando estado final...');
      await verifySystemState();
      
      console.log('\n✅ ¡Migraciones aplicadas exitosamente!');
      console.log('\n📝 Próximos pasos recomendados:');
      console.log('   1. Verifica que la aplicación funcione correctamente');
      console.log('   2. Revisa los logs de Supabase para cualquier error');
      console.log('   3. Ejecuta pruebas de integración');
      console.log('   4. Si todo funciona bien, procede a eliminar los archivos obsoletos');
      console.log('      (ver OBSOLETE_FILES_TO_DELETE.md)');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error('\n⚠️  Si hay problemas, restaura desde el backup y revisa los logs.');
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);
