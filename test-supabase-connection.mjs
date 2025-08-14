import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

console.log('🔌 Conectando a Supabase...');
console.log('📡 URL:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
async function testConnection() {
  try {
    console.log('🧪 Probando conexión...');
    
    // Test 1: Basic connection
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('⚠️ Error en sesión:', sessionError.message);
    } else {
      console.log('✅ Conexión básica exitosa');
    }
    
    // Test 2: Database query
    const { data: dbData, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.log('⚠️ Error en consulta DB:', dbError.message);
    } else {
      console.log('✅ Consulta a base de datos exitosa');
    }
    
    // Test 3: Storage bucket check
    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.log('⚠️ Error en storage:', storageError.message);
    } else {
      console.log('✅ Storage accesible');
      console.log('📦 Buckets disponibles:', storageData.map(b => b.name));
    }
    
    console.log('\n🎉 Prueba de conexión completada!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Run test
testConnection();
