const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Iniciando migración del sistema de autenticación mejorado...');

    // Leer archivo de migración del esquema
    const schemaMigrationPath = path.join(__dirname, 'ENHANCED_AUTH_MIGRATION.sql');
    const schemaMigration = fs.readFileSync(schemaMigrationPath, 'utf8');

    console.log('📊 Aplicando migración del esquema...');
    const { error: schemaError } = await supabase.rpc('exec_sql', {
      sql: schemaMigration
    });

    if (schemaError) {
      console.error('❌ Error en migración del esquema:', schemaError);
      throw schemaError;
    }

    console.log('✅ Migración del esquema completada');

    // Leer archivo de migración de RLS
    const rlsMigrationPath = path.join(__dirname, 'ENHANCED_RLS_POLICIES.sql');
    const rlsMigration = fs.readFileSync(rlsMigrationPath, 'utf8');

    console.log('🔒 Aplicando políticas de seguridad RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsMigration
    });

    if (rlsError) {
      console.error('❌ Error en políticas RLS:', rlsError);
      throw rlsError;
    }

    console.log('✅ Políticas RLS aplicadas correctamente');

    // Verificar que las tablas se crearon correctamente
    console.log('🔍 Verificando estructura de base de datos...');
    
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('count')
      .limit(1);

    if (clinicsError) {
      console.error('❌ Error verificando tabla clinics:', clinicsError);
    } else {
      console.log('✅ Tabla clinics verificada');
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);

    if (rolesError) {
      console.error('❌ Error verificando tabla user_roles:', rolesError);
    } else {
      console.log('✅ Tabla user_roles verificada');
    }

    const { data: specialties, error: specialtiesError } = await supabase
      .from('medical_specialties')
      .select('count')
      .limit(1);

    if (specialtiesError) {
      console.error('❌ Error verificando tabla medical_specialties:', specialtiesError);
    } else {
      console.log('✅ Tabla medical_specialties verificada');
    }

    // Verificar datos iniciales
    console.log('📋 Verificando datos iniciales...');
    
    const { data: rolesData, error: rolesDataError } = await supabase
      .from('user_roles')
      .select('name, display_name')
      .order('name');

    if (rolesDataError) {
      console.error('❌ Error obteniendo roles:', rolesDataError);
    } else {
      console.log('✅ Roles disponibles:');
      rolesData.forEach(role => {
        console.log(`   - ${role.name}: ${role.display_name}`);
      });
    }

    const { data: specialtiesData, error: specialtiesDataError } = await supabase
      .from('medical_specialties')
      .select('name, category')
      .order('name')
      .limit(10);

    if (specialtiesDataError) {
      console.error('❌ Error obteniendo especialidades:', specialtiesDataError);
    } else {
      console.log('✅ Especialidades disponibles (primeras 10):');
      specialtiesData.forEach(specialty => {
        console.log(`   - ${specialty.name} (${specialty.category})`);
      });
    }

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. El sistema de autenticación mejorado está listo');
    console.log('2. Los usuarios pueden registrarse con diferentes roles');
    console.log('3. Las políticas de seguridad RLS están implementadas');
    console.log('4. Prueba el registro en /signup-questionnaire');
    
  } catch (error) {
    console.error('💥 Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  applyMigration();
}

module.exports = { applyMigration };