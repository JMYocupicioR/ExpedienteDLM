import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Función para cargar variables de entorno
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!key.startsWith('#') && value) {
          envVars[key.trim()] = value;
        }
      }
    });
    
    Object.assign(process.env, envVars);
    return true;
  } catch (error) {
    console.error('❌ Error leyendo archivo .env:', error.message);
    return false;
  }
}

// Función para verificar tablas
async function checkTables() {
  console.log('🔍 Verificando tablas en la base de datos...\n');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
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

// Función para mostrar información de migraciones
function showMigrations() {
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
    
    return files;
  } catch (error) {
    console.error('❌ Error leyendo migraciones:', error.message);
    return [];
  }
}

// Función principal
async function main() {
  console.log('🗄️  Verificador de Base de Datos - ExpedienteDLM\n');
  
  // Cargar variables de entorno
  if (!loadEnvFile()) {
    console.log('❌ No se pudieron cargar las variables de entorno');
    return;
  }
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('📋 Configuración:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseAnonKey ? '✅ Configurada' : '❌ No configurada'}\n`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Variables de entorno de Supabase no configuradas');
    return;
  }
  
  // Mostrar migraciones disponibles
  const migrations = showMigrations();
  
  if (migrations.length === 0) {
    console.log('\n❌ No se encontraron archivos de migración');
    return;
  }
  
  console.log('\n💡 Para aplicar las migraciones:');
  console.log('1. Ve al dashboard de Supabase:');
  console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql');
  console.log('2. Copia y pega el contenido de cada archivo .sql');
  console.log('3. Ejecuta las consultas en orden');
  
  // Verificar tablas existentes
  await checkTables();
  
  console.log('\n📖 Enlaces útiles:');
  console.log('   - Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF');
  console.log('   - SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql');
  console.log('   - Table Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor');
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 