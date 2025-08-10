import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Configuración de Supabase
const SUPABASE_URL = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

// Función para leer archivos de migración
function readMigrations() {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Encontrados ${files.length} archivos de migración:`);
    files.forEach(file => {
      console.log(`   - ${file}`);
      try {
        const content = readFileSync(join(migrationsDir, file), 'utf8');
        const lines = content.split('\n').length;
        console.log(`     (${lines} líneas de SQL)`);
      } catch (error) {
        console.log(`     (Error leyendo archivo)`);
      }
    });
    
    return files.map(file => ({
      name: file,
      content: readFileSync(join(migrationsDir, file), 'utf8')
    }));
  } catch (error) {
    console.error('❌ Error leyendo migraciones:', error.message);
    return [];
  }
}

// Función para aplicar migraciones usando RPC
async function applyMigrations() {
  console.log('🚀 Aplicando migraciones a Supabase...\n');
  
  // Crear cliente de Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Leer migraciones
  const migrations = readMigrations();
  if (migrations.length === 0) {
    console.log('❌ No se encontraron archivos de migración');
    return false;
  }
  
  console.log('\n🔄 Aplicando migraciones...\n');
  
  for (const migration of migrations) {
    try {
      console.log(`📝 Aplicando: ${migration.name}`);
      
      // Dividir el SQL en comandos individuales
      const commands = migration.content
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const command of commands) {
        if (command.trim().length === 0) continue;
        
        try {
          // Intentar ejecutar el comando usando RPC
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: command + ';'
          });
          
          if (error) {
            console.log(`   ⚠️  Comando falló: ${error.message.substring(0, 100)}...`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.log(`   ❌ Error ejecutando comando: ${error.message.substring(0, 100)}...`);
          errorCount++;
        }
      }
      
      console.log(`   ✅ ${successCount} comandos exitosos, ❌ ${errorCount} errores`);
      
    } catch (error) {
      console.log(`❌ Error en ${migration.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 Proceso de migración completado');
  return true;
}

// Función para verificar tablas
async function checkTables() {
  console.log('\n🔍 Verificando tablas en la base de datos...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Lista de tablas esperadas
  const expectedTables = ['profiles', 'patients', 'consultations', 'prescriptions', 'physical_exams'];
  
  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabla ${tableName}: No existe o no accesible`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Tabla ${tableName}: Existe y accesible`);
      }
    } catch (error) {
      console.log(`❌ Tabla ${tableName}: Error - ${error.message}`);
    }
  }
}

// Función para crear función RPC si no existe
async function createRPCFunction() {
  console.log('🔧 Verificando función RPC...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Intentar usar la función RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1;'
    });
    
    if (error && error.message.includes('function "exec_sql" does not exist')) {
      console.log('⚠️  Función RPC no existe. Creando...');
      
      // Crear la función RPC
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
          RETURN '{"success": true}'::json;
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object('error', SQLERRM);
        END;
        $$;
      `;
      
      // Intentar crear la función usando una consulta directa
      console.log('💡 La función RPC no está disponible.');
      console.log('📝 Usando método alternativo...');
      return false;
    }
    
    console.log('✅ Función RPC disponible');
    return true;
  } catch (error) {
    console.log('❌ Error verificando función RPC:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🗄️  Aplicador de Migraciones - ExpedienteDLM\n');
  
  console.log('📋 Configuración:');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Key: ✅ Configurada\n`);
  
  // Verificar función RPC
  const rpcAvailable = await createRPCFunction();
  
  if (!rpcAvailable) {
    console.log('\n💡 Método alternativo:');
    console.log('1. Ve al SQL Editor de Supabase:');
    console.log('   https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/sql');
    console.log('2. Copia y pega el contenido de cada archivo .sql');
    console.log('3. Ejecuta las consultas en orden');
    
    // Mostrar migraciones disponibles
    const migrations = readMigrations();
    if (migrations.length > 0) {
      console.log('\n📁 Archivos de migración disponibles:');
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    }
  } else {
    // Aplicar migraciones automáticamente
    const success = await applyMigrations();
    if (success) {
      await checkTables();
    }
  }
  
  console.log('\n📖 Enlaces útiles:');
  console.log('   - Dashboard: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk');
  console.log('   - SQL Editor: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/sql');
  console.log('   - Table Editor: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/editor');
  console.log('   - Aplicación: http://localhost:5173');
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 