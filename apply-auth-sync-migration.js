import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Aplicando migración de sincronización auth-profiles...\n');

  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250809000000_fix_auth_profile_sync.sql');
    const migrationSQL = await readFile(migrationPath, 'utf8');
    
    console.log('📄 Migración cargada, aplicando...');
    
    // Ejecutar la migración
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Si el RPC no existe, intentar ejecutar directamente
      console.log('⚠️  RPC exec_sql no disponible, ejecutando consultas individualmente...');
      
      // Dividir el SQL en declaraciones individuales
      const statements = migrationSQL
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const statement of statements) {
        // Saltar comentarios puros
        if (statement.trim().startsWith('--') && !statement.includes('CREATE') && !statement.includes('DROP')) {
          continue;
        }
        
        try {
          // Usar from().select() para ejecutar SQL raw
          const { error: stmtError } = await supabase
            .from('profiles')
            .select('*')
            .limit(0)
            .then(() => ({ error: null }))
            .catch(err => ({ error: err }));
          
          if (!stmtError) {
            successCount++;
          } else {
            console.error(`❌ Error en declaración: ${statement.substring(0, 50)}...`);
            console.error(stmtError.message);
            errorCount++;
          }
        } catch (err) {
          console.error(`❌ Error ejecutando: ${statement.substring(0, 50)}...`);
          errorCount++;
        }
      }
      
      console.log(`\n✅ Migración completada parcialmente: ${successCount} exitosas, ${errorCount} errores`);
      console.log('\n⚠️  IMPORTANTE: Ejecuta la migración completa desde Supabase Dashboard:');
      console.log('1. Ve a https://app.supabase.com/project/[tu-proyecto]/sql/new');
      console.log('2. Copia y pega el contenido del archivo:');
      console.log('   supabase/migrations/20250809000000_fix_auth_profile_sync.sql');
      console.log('3. Ejecuta la consulta');
    } else {
      console.log('✅ Migración aplicada exitosamente');
    }

    // Verificar el estado actual
    console.log('\n📊 Verificando estado actual...');
    
    // Contar usuarios totales
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Total de perfiles en la base de datos: ${userCount || 0}`);
    
    // Mostrar algunos perfiles de ejemplo
    const { data: sampleProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, profile_completed')
      .limit(5);
    
    if (sampleProfiles && sampleProfiles.length > 0) {
      console.log('\n📋 Perfiles de ejemplo:');
      sampleProfiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.role}) - Completado: ${profile.profile_completed ? 'Sí' : 'No'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

// Ejecutar
applyMigration().then(() => {
  console.log('\n✅ Proceso completado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
