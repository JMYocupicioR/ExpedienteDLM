const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔌 Conectando a Supabase...');
  console.log('URL:', supabaseUrl);
  console.log('Estado de conexión:', supabase ? '✅ Cliente creado' : '❌ Error al crear cliente');
  
  try {
    // Test 1: Verificar conexión básica
    console.log('\n📡 Probando conexión básica...');
    const { data: testData, error: testError } = await supabase
      .from('medical_specialties')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError.message);
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    // Test 2: Obtener especialidades médicas
    console.log('\n🏥 Obteniendo especialidades médicas...');
    const { data: specialties, error: specialtiesError } = await supabase
      .from('medical_specialties')
      .select('id, name, category, is_active')
      .eq('is_active', true)
      .order('name');
    
    if (specialtiesError) {
      console.error('❌ Error al obtener especialidades:', specialtiesError.message);
      return;
    }
    
    console.log(`✅ Especialidades encontradas: ${specialties.length}`);
    
    // Agrupar por categoría
    const groupedByCategory = {};
    specialties.forEach(spec => {
      if (!groupedByCategory[spec.category]) {
        groupedByCategory[spec.category] = [];
      }
      groupedByCategory[spec.category].push(spec.name);
    });
    
    console.log('\n📋 Especialidades por categoría:');
    Object.keys(groupedByCategory).forEach(category => {
      console.log(`\n📁 ${category.toUpperCase()} (${groupedByCategory[category].length}):`);
      groupedByCategory[category].forEach(name => {
        console.log(`  - ${name}`);
      });
    });
    
    // Test 3: Verificar otras tablas importantes
    console.log('\n🗄️ Verificando otras tablas...');
    
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('count')
      .limit(1);
    
    if (clinicsError) {
      console.log('⚠️ Tabla clinics no disponible:', clinicsError.message);
    } else {
      console.log('✅ Tabla clinics disponible');
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.log('⚠️ Tabla profiles no disponible:', profilesError.message);
    } else {
      console.log('✅ Tabla profiles disponible');
    }
    
    console.log('\n🎉 Conexión a Supabase verificada exitosamente');
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

testConnection(); 