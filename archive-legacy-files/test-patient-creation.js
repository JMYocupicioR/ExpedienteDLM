import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

console.log('🧪 Probando creación de pacientes...\n');

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPatientCreation() {
  try {
    console.log('📊 Verificando estado de la tabla patients...');
    
    // 1. Verificar acceso a la tabla
    const { data: testAccess, error: accessError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    if (accessError) {
      console.log('❌ Error de acceso a tabla patients:', accessError.message);
      console.log('🔒 Posible problema de RLS o permisos');
      return false;
    }
    
    console.log('✅ Acceso a tabla patients confirmado');
    
    // 2. Verificar políticas RLS para inserción
    console.log('\n🔒 Probando inserción de paciente de prueba...');
    
    const testPatient = {
      full_name: `Paciente Prueba ${Date.now()}`,
      birth_date: '1990-01-01',
      gender: 'masculino',
      email: `prueba${Date.now()}@test.com`,
      phone: '+52 555 123 4567',
      address: 'Dirección de prueba',
      city_of_birth: 'Ciudad de prueba',
      city_of_residence: 'Residencia de prueba',
      social_security_number: '123456789'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('patients')
      .insert([testPatient])
      .select();
    
    if (insertError) {
      console.log('❌ Error insertando paciente:', insertError.message);
      
      if (insertError.message.includes('RLS')) {
        console.log('🔒 Problema: Row Level Security está bloqueando la inserción');
        console.log('💡 Solución: Necesitas estar autenticado o ajustar las políticas RLS');
      } else if (insertError.message.includes('permission')) {
        console.log('🔒 Problema: Permisos insuficientes');
        console.log('💡 Solución: Verificar permisos de la tabla');
      } else if (insertError.message.includes('violates')) {
        console.log('📋 Problema: Violación de restricciones de la tabla');
        console.log('💡 Solución: Verificar campos requeridos y tipos de datos');
      }
      return false;
    }
    
    console.log('✅ Paciente creado exitosamente:', insertData[0].id);
    
    // 3. Verificar que se puede leer el paciente creado
    console.log('\n🔍 Verificando lectura del paciente creado...');
    
    const { data: readData, error: readError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', insertData[0].id)
      .single();
    
    if (readError) {
      console.log('❌ Error leyendo paciente:', readError.message);
      return false;
    }
    
    console.log('✅ Paciente leído exitosamente:', readData.full_name);
    
    // 4. Limpiar - eliminar paciente de prueba
    console.log('\n🧹 Limpiando paciente de prueba...');
    
    const { error: deleteError } = await supabase
      .from('patients')
      .delete()
      .eq('id', insertData[0].id);
    
    if (deleteError) {
      console.log('⚠️  Advertencia: No se pudo eliminar el paciente de prueba:', deleteError.message);
    } else {
      console.log('✅ Paciente de prueba eliminado');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
    return false;
  }
}

// Función para verificar autenticación necesaria
async function checkAuthRequirement() {
  console.log('\n🔐 Verificando requerimientos de autenticación...');
  
  // Verificar si necesitamos estar autenticados
  const { data: currentUser } = await supabase.auth.getUser();
  
  if (!currentUser.user) {
    console.log('⚠️  No hay usuario autenticado');
    console.log('💡 Para crear pacientes en la aplicación necesitas:');
    console.log('   1. Registrarte/iniciar sesión en http://localhost:5173');
    console.log('   2. Crear un perfil de doctor');
    console.log('   3. Las políticas RLS permitirán entonces crear pacientes');
    return false;
  } else {
    console.log('✅ Usuario autenticado:', currentUser.user.email);
    return true;
  }
}

// Función para verificar políticas RLS
async function checkRLSPolicies() {
  console.log('\n🔒 Información sobre políticas RLS...');
  console.log('Las políticas RLS pueden estar configuradas para:');
  console.log('   - Permitir solo a usuarios autenticados');
  console.log('   - Permitir solo a usuarios con rol "doctor"');
  console.log('   - Permitir solo a usuarios con perfil completo');
  console.log('\n💡 Soluciones:');
  console.log('   1. Asegúrate de estar logueado en la aplicación');
  console.log('   2. Verifica que tu perfil tenga el rol correcto');
  console.log('   3. Aplica la migración final si no lo has hecho');
}

// Ejecutar pruebas
async function main() {
  console.log('🚀 Iniciando diagnóstico de creación de pacientes...\n');
  
  const authOk = await checkAuthRequirement();
  const creationOk = await testPatientCreation();
  
  console.log('\n📋 Resumen del diagnóstico:');
  console.log(`   Autenticación: ${authOk ? '✅' : '❌'}`);
  console.log(`   Creación de pacientes: ${creationOk ? '✅' : '❌'}`);
  
  if (!creationOk) {
    await checkRLSPolicies();
    
    console.log('\n🔧 Próximos pasos recomendados:');
    console.log('1. Ve a http://localhost:5173 y regístrate/inicia sesión');
    console.log('2. Si ya estás logueado, verifica las políticas RLS');
    console.log('3. Aplica la migración final en el SQL Editor');
    console.log('4. Reinicia el servidor de desarrollo');
  } else {
    console.log('\n🎉 ¡Todo está funcionando correctamente!');
    console.log('El problema puede estar en el frontend o en el estado de autenticación');
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});