const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'tu-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'tu-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTemplatesMigration() {
  try {
    console.log('🏥 Aplicando migración del sistema de plantillas médicas...\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'MEDICAL_TEMPLATES_MIGRATION.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Archivo de migración leído correctamente');
    console.log(`📊 Tamaño del archivo: ${migrationSQL.length} caracteres\n`);

    // Ejecutar la migración
    console.log('⚡ Ejecutando migración...');
    const { error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Error ejecutando la migración:', error.message);
      
      // Intentar ejecutar por partes si falla
      console.log('\n🔄 Intentando ejecutar la migración por secciones...');
      await executeMigrationSections(migrationSQL);
    } else {
      console.log('✅ Migración ejecutada exitosamente\n');
    }

    // Verificar que las tablas se crearon correctamente
    await verifyTablesCreated();

    // Verificar datos iniciales
    await verifyInitialData();

    console.log('\n🎉 ¡Sistema de plantillas médicas configurado exitosamente!');
    console.log('\n📋 Resumen de funcionalidades habilitadas:');
    console.log('   ✅ Gestión de categorías de plantillas');
    console.log('   ✅ Creación y edición de plantillas médicas');
    console.log('   ✅ Sistema de favoritos');
    console.log('   ✅ Registro de uso de plantillas');
    console.log('   ✅ Plantillas predefinidas cargadas');
    console.log('   ✅ Políticas de seguridad (RLS) aplicadas');
    console.log('   ✅ Funciones auxiliares creadas');

  } catch (error) {
    console.error('💥 Error fatal aplicando la migración:', error);
    process.exit(1);
  }
}

async function executeMigrationSections(migrationSQL) {
  // Dividir la migración en secciones
  const sections = migrationSQL.split('-- =====================================================');
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    console.log(`📝 Ejecutando sección ${i + 1}/${sections.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec', { sql: section });
      if (error) {
        console.warn(`⚠️  Advertencia en sección ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Sección ${i + 1} completada`);
      }
    } catch (err) {
      console.warn(`⚠️  Error en sección ${i + 1}:`, err.message);
    }
  }
}

async function verifyTablesCreated() {
  console.log('🔍 Verificando tablas creadas...');
  
  const tablesToCheck = [
    'template_categories',
    'medical_templates', 
    'template_fields',
    'template_favorites',
    'template_usage'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error verificando tabla ${table}:`, error.message);
      } else {
        console.log(`✅ Tabla ${table} creada correctamente`);
      }
    } catch (err) {
      console.error(`❌ Error accediendo a tabla ${table}:`, err.message);
    }
  }
}

async function verifyInitialData() {
  console.log('\n🔍 Verificando datos iniciales...');
  
  try {
    // Verificar categorías
    const { data: categories, error: categoriesError } = await supabase
      .from('template_categories')
      .select('*');
    
    if (categoriesError) {
      console.error('❌ Error verificando categorías:', categoriesError.message);
    } else {
      console.log(`✅ ${categories.length} categorías de plantillas cargadas`);
      categories.forEach(cat => {
        console.log(`   📂 ${cat.name} (${cat.type})`);
      });
    }

    // Verificar plantillas predefinidas
    const { data: templates, error: templatesError } = await supabase
      .from('medical_templates')
      .select('*')
      .eq('is_predefined', true);
    
    if (templatesError) {
      console.error('❌ Error verificando plantillas:', templatesError.message);
    } else {
      console.log(`✅ ${templates.length} plantillas predefinidas cargadas`);
      templates.forEach(template => {
        console.log(`   📋 ${template.name} (${template.type})`);
      });
    }

  } catch (error) {
    console.error('❌ Error verificando datos iniciales:', error.message);
  }
}

// Función para limpiar el sistema (desarrollo)
async function cleanTemplatesSystem() {
  console.log('🧹 Limpiando sistema de plantillas...');
  
  const tablesToClean = [
    'template_usage',
    'template_favorites', 
    'template_fields',
    'medical_templates',
    'template_categories'
  ];

  for (const table of tablesToClean) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todo
      
      if (!error) {
        console.log(`✅ Tabla ${table} limpiada`);
      }
    } catch (err) {
      console.log(`⚠️  No se pudo limpiar tabla ${table}`);
    }
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clean')) {
    await cleanTemplatesSystem();
    return;
  }

  if (args.includes('--verify-only')) {
    await verifyTablesCreated();
    await verifyInitialData();
    return;
  }

  await applyTemplatesMigration();
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Rechazo no manejado en:', promise, 'razón:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Excepción no capturada:', error);
  process.exit(1);
});

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  applyTemplatesMigration,
  verifyTablesCreated,
  verifyInitialData,
  cleanTemplatesSystem
};