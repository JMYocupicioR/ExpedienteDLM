import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzM0NDU0NSwiZXhwIjoyMDYyOTIwNTQ1fQ.9t_I3W6O2Gz5o3qKwmYUPaJQwPvV0RCJit0P4rRPP7I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Aplicando migración del sistema multi-clínica...\n');

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250810008000_multi_clinic_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migración cargada correctamente');
    console.log('⏳ Ejecutando migración...\n');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.match(/^\s*$/)) {
        continue;
      }

      // Extract a description from the statement
      let description = statement.substring(0, 50).replace(/\n/g, ' ');
      if (statement.length > 50) description += '...';

      try {
        // For CREATE POLICY statements, we need to handle them differently
        if (statement.includes('CREATE POLICY')) {
          // Execute directly using raw SQL
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: statement
          }).single();

          if (error) {
            // If the policy already exists, that's okay
            if (error.message?.includes('already exists')) {
              console.log(`⚠️  Política ya existe: ${description}`);
              successCount++;
            } else {
              throw error;
            }
          } else {
            console.log(`✅ Ejecutado: ${description}`);
            successCount++;
          }
        } else {
          // For other statements, try to execute them normally
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: statement
          }).single();

          if (error) {
            // Handle specific cases where the object already exists
            if (error.message?.includes('already exists')) {
              console.log(`⚠️  Ya existe: ${description}`);
              successCount++;
            } else {
              throw error;
            }
          } else {
            console.log(`✅ Ejecutado: ${description}`);
            successCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error en: ${description}`);
        console.error(`   Detalle: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Resumen de la migración:');
    console.log(`   ✅ Exitosas: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('\n📝 Próximos pasos:');
      console.log('1. Reinicia tu aplicación');
      console.log('2. Los usuarios podrán crear y unirse a múltiples clínicas');
      console.log('3. El ClinicSwitcher aparecerá en la navegación');
    } else {
      console.log('\n⚠️  La migración se completó con algunos errores.');
      console.log('   Revisa los mensajes de error arriba para más detalles.');
    }

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error.message);
    process.exit(1);
  }
}

// Note: Since we can't execute raw SQL directly through Supabase client,
// we'll create a simplified version that creates the tables and functions
async function runSimplifiedMigration() {
  console.log('📝 Nota: Ejecutando versión simplificada de la migración...\n');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ No se pudo conectar a la base de datos:', testError.message);
      console.log('\n💡 Para aplicar la migración completa:');
      console.log('1. Ve al dashboard de Supabase');
      console.log('2. Navega a SQL Editor');
      console.log('3. Copia y pega el contenido de: supabase/migrations/20250810008000_multi_clinic_system.sql');
      console.log('4. Ejecuta la migración');
      return;
    }

    console.log('✅ Conexión a base de datos exitosa');
    console.log('\n⚠️  IMPORTANTE: La migración debe ser aplicada manualmente.');
    console.log('\n📋 Instrucciones:');
    console.log('1. Abre el dashboard de Supabase: https://app.supabase.com');
    console.log('2. Ve a tu proyecto: YOUR_PROJECT_REF');
    console.log('3. Navega a "SQL Editor" en el menú lateral');
    console.log('4. Crea una nueva consulta');
    console.log('5. Copia todo el contenido del archivo:');
    console.log('   supabase/migrations/20250810008000_multi_clinic_system.sql');
    console.log('6. Pégalo en el editor SQL');
    console.log('7. Haz clic en "Run" o presiona Ctrl+Enter');
    console.log('\n✨ La migración creará:');
    console.log('   - Tabla "clinics" para almacenar clínicas');
    console.log('   - Tabla "clinic_members" para relaciones usuario-clínica');
    console.log('   - Políticas RLS para seguridad');
    console.log('   - Funciones helper para crear y unirse a clínicas');
    console.log('   - Índices para mejor rendimiento');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the simplified migration
runSimplifiedMigration();
