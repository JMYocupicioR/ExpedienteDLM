import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Función para verificar si Supabase CLI está instalado
function checkSupabaseCLI() {
  try {
    const version = execSync('supabase --version', { encoding: 'utf8' });
    console.log('✅ Supabase CLI instalado:', version.trim());
    return true;
  } catch (error) {
    console.log('❌ Supabase CLI no está instalado');
    console.log('💡 Para instalarlo ejecuta: npm install -g supabase');
    return false;
  }
}

// Función para verificar el estado del proyecto Supabase
function checkSupabaseProject() {
  const supabaseDir = join(process.cwd(), 'supabase');
  
  if (!existsSync(supabaseDir)) {
    console.log('❌ Directorio supabase/ no encontrado');
    console.log('💡 Para inicializar Supabase ejecuta: supabase init');
    return false;
  }
  
  console.log('✅ Directorio supabase/ encontrado');
  
  // Verificar archivos de migración
  const migrationsDir = join(supabaseDir, 'migrations');
  if (existsSync(migrationsDir)) {
    try {
      const files = execSync('dir supabase\\migrations', { encoding: 'utf8' });
      const migrationCount = files.split('\n').filter(line => line.includes('.sql')).length;
      console.log(`✅ ${migrationCount} archivos de migración encontrados`);
    } catch (error) {
      console.log('⚠️  No se pudieron listar las migraciones');
    }
  } else {
    console.log('⚠️  Directorio de migraciones no encontrado');
  }
  
  return true;
}

// Función para verificar el estado de la base de datos
async function checkDatabaseStatus() {
  try {
    console.log('\n🔄 Verificando estado de la base de datos...');
    const status = execSync('supabase status', { encoding: 'utf8' });
    console.log('📊 Estado de Supabase:');
    console.log(status);
    return true;
  } catch (error) {
    console.log('❌ No se pudo verificar el estado de Supabase');
    console.log('💡 Asegúrate de que Supabase esté iniciado: supabase start');
    return false;
  }
}

// Función principal
async function main() {
  console.log('🔍 Verificando estado de Supabase...\n');
  
  const cliInstalled = checkSupabaseCLI();
  const projectExists = checkSupabaseProject();
  
  if (cliInstalled && projectExists) {
    await checkDatabaseStatus();
  }
  
  console.log('\n📋 Resumen:');
  console.log(`   CLI instalado: ${cliInstalled ? '✅' : '❌'}`);
  console.log(`   Proyecto configurado: ${projectExists ? '✅' : '❌'}`);
  
  if (!cliInstalled) {
    console.log('\n💡 Para instalar Supabase CLI:');
    console.log('   npm install -g supabase');
  }
  
  if (!projectExists) {
    console.log('\n💡 Para inicializar el proyecto:');
    console.log('   supabase init');
  }
  
  console.log('\n📖 Para más información, consulta: supabase-setup.md');
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
}); 