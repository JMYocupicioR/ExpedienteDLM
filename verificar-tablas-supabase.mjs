import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usar variables de entorno)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 VERIFICANDO TABLAS EN SUPABASE');
console.log('================================\n');

async function verificarTablas() {
  try {
    console.log('1. Verificando tabla CLINICS...');

    // Intentar consultar la tabla clinics
    const { data: clinicsData, error: clinicsError } = await supabase
      .from('clinics')
      .select('*')
      .limit(5);

    if (clinicsError) {
      console.log('   ❌ Error en tabla CLINICS:', clinicsError.message);
      if (clinicsError.code === '42P01') {
        console.log('   💡 La tabla "clinics" NO EXISTE');
      }
    } else {
      console.log('   ✅ Tabla CLINICS existe');
      console.log(`   📊 Registros encontrados: ${clinicsData.length}`);
      if (clinicsData.length > 0) {
        console.log('   📝 Primeras clínicas:');
        clinicsData.forEach((clinic, index) => {
          console.log(`      ${index + 1}. ${clinic.name} (ID: ${clinic.id})`);
        });
      }
    }

    console.log('\n2. Verificando tabla CLINIC_MEMBERS...');

    // Intentar consultar la tabla clinic_members
    const { data: membersData, error: membersError } = await supabase
      .from('clinic_members')
      .select('*')
      .limit(5);

    if (membersError) {
      console.log('   ❌ Error en tabla CLINIC_MEMBERS:', membersError.message);
      if (membersError.code === '42P01') {
        console.log('   💡 La tabla "clinic_members" NO EXISTE');
      }
    } else {
      console.log('   ✅ Tabla CLINIC_MEMBERS existe');
      console.log(`   📊 Registros encontrados: ${membersData.length}`);
      if (membersData.length > 0) {
        console.log('   📝 Primeras membresías:');
        membersData.forEach((member, index) => {
          console.log(
            `      ${index + 1}. Usuario: ${member.user_id}, Rol: ${member.role}, Clínica: ${member.clinic_id}`
          );
        });
      }
    }

    console.log('\n3. Verificando columna clinic_id en tabla PATIENTS...');

    // Verificar si la tabla patients tiene la columna clinic_id
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('id, clinic_id')
      .limit(1);

    if (patientsError) {
      console.log('   ❌ Error en tabla PATIENTS:', patientsError.message);
      if (patientsError.message.includes('clinic_id')) {
        console.log('   💡 La columna "clinic_id" NO EXISTE en patients');
      }
    } else {
      console.log('   ✅ Tabla PATIENTS tiene columna clinic_id');
      console.log(`   📊 Registros de pacientes: ${patientsData.length}`);
    }

    console.log('\n4. Verificando funciones SQL...');

    // Intentar llamar a la función create_clinic_with_member
    try {
      const { data: functionTest, error: functionError } = await supabase.rpc(
        'create_clinic_with_member',
        {
          clinic_name: 'TEST_CLINIC_DELETE_ME',
          clinic_address: 'Test Address',
          user_role: 'admin',
        }
      );

      if (functionError) {
        console.log('   ❌ Error en función create_clinic_with_member:', functionError.message);
        if (functionError.code === '42883') {
          console.log('   💡 La función "create_clinic_with_member" NO EXISTE');
        }
      } else {
        console.log('   ✅ Función create_clinic_with_member existe y funciona');
        console.log(
          `   🧪 Clínica de prueba creada: ${functionTest.name} (ID: ${functionTest.id})`
        );

        // Eliminar la clínica de prueba
        await supabase.from('clinics').delete().eq('id', functionTest.id);
        console.log('   🗑️ Clínica de prueba eliminada');
      }
    } catch (error) {
      console.log('   ❌ Error al probar función:', error.message);
    }
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }

  console.log('\n📊 RESUMEN DE VERIFICACIÓN');
  console.log('==========================');
  console.log('Si ves errores "NO EXISTE", significa que la migración NO se ha aplicado.');
  console.log('Para aplicar la migración:');
  console.log('1. Ve a https://app.supabase.com');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Ve a SQL Editor');
  console.log('4. Copia y pega el contenido de APLICAR_MIGRACION_MULTICLINICA.sql');
  console.log('5. Ejecuta la migración');
}

// Ejecutar verificación
verificarTablas();
