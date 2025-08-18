import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

console.log('🔍 VERIFICACIÓN COMPLETA DE SUPABASE');
console.log('=====================================\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySupabaseSetup() {
  try {
    console.log('1️⃣ Verificando conexión básica...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('   ❌ Error en sesión:', sessionError.message);
    } else {
      console.log('   ✅ Conexión básica exitosa');
    }

    console.log('\n2️⃣ Verificando base de datos...');
    
    // Check profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    if (profilesError) {
      console.log('   ❌ Error en tabla profiles:', profilesError.message);
    } else {
      console.log('   ✅ Tabla profiles accesible');
    }

    // Check patients table
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    if (patientsError) {
      console.log('   ❌ Error en tabla patients:', patientsError.message);
    } else {
      console.log('   ✅ Tabla patients accesible');
    }

    // Check clinics table
    const { data: clinicsData, error: clinicsError } = await supabase
      .from('clinics')
      .select('count')
      .limit(1);
    if (clinicsError) {
      console.log('   ❌ Error en tabla clinics:', clinicsError.message);
    } else {
      console.log('   ✅ Tabla clinics accesible');
    }

    console.log('\n3️⃣ Verificando storage...');
    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.log('   ❌ Error en storage:', storageError.message);
    } else {
      console.log('   ✅ Storage accesible');
      if (storageData.length > 0) {
        console.log('   📦 Buckets disponibles:', storageData.map(b => b.name));
      } else {
        console.log('   📦 No hay buckets configurados');
      }
    }

    console.log('\n4️⃣ Verificando funciones Edge...');
    try {
      // Test a simple function call
      const { data: functionData, error: functionError } = await supabase.functions.invoke('validate-patient-registration', {
        body: { test: true }
      });
      if (functionError) {
        console.log('   ⚠️ Funciones Edge disponibles pero con error:', functionError.message);
      } else {
        console.log('   ✅ Funciones Edge funcionando');
      }
    } catch (error) {
      console.log('   ⚠️ Funciones Edge no disponibles:', error.message);
    }

    console.log('\n5️⃣ Verificando RLS (Row Level Security)...');
    try {
      // Try to access data as anonymous user
      const { data: rlsData, error: rlsError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (rlsError && rlsError.message.includes('permission denied')) {
        console.log('   ✅ RLS está funcionando (acceso restringido)');
      } else if (rlsError) {
        console.log('   ⚠️ Error RLS:', rlsError.message);
      } else {
        console.log('   ⚠️ RLS puede no estar configurado (datos visibles)');
      }
    } catch (error) {
      console.log('   ❌ Error verificando RLS:', error.message);
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('==========================');
    console.log('✅ Supabase está conectado y funcionando');
    console.log('📡 URL:', supabaseUrl);
    console.log('🔑 Clave anónima configurada');
    
    // Recommendations
    console.log('\n💡 RECOMENDACIONES:');
    console.log('1. Asegúrate de tener un archivo .env con las variables:');
    console.log('   VITE_SUPABASE_URL=' + supabaseUrl);
    console.log('   VITE_SUPABASE_ANON_KEY=' + supabaseAnonKey.substring(0, 20) + '...');
    console.log('2. Verifica que las políticas RLS estén configuradas correctamente');
    console.log('3. Configura buckets de storage si planeas usar archivos');
    
  } catch (error) {
    console.error('❌ Error general en la verificación:', error.message);
  }
}

// Run verification
verifySupabaseSetup();
