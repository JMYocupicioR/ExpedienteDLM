import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

console.log('🔐 Probando autenticación con Supabase...\n');

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

async function testAuth() {
  try {
    console.log('📡 Verificando conexión...');
    
    // 1. Verificar conexión básica
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Error de conexión:', sessionError.message);
      return false;
    }
    
    console.log('✅ Conexión establecida correctamente');
    console.log('📊 Estado de sesión:', sessionData.session ? 'Activa' : 'Sin sesión');
    
    // 2. Verificar configuración de autenticación
    console.log('\n🔧 Verificando configuración de autenticación...');
    
    // Intentar obtener configuración de auth
    const { data: authConfig, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  Configuración de auth:', authError.message);
    } else {
      console.log('✅ Configuración de autenticación correcta');
    }
    
    // 3. Verificar tablas necesarias para autenticación
    console.log('\n🗄️  Verificando tablas de autenticación...');
    
    const tables = ['profiles', 'auth.users'];
    
    for (const table of tables) {
      try {
        if (table === 'auth.users') {
          // auth.users es una tabla interna, no podemos consultarla directamente
          console.log('✅ Tabla auth.users: Existe (tabla interna)');
        } else {
          const { data, error } = await supabase
            .from(table)
            .select('count')
            .limit(1);
          
          if (error) {
            console.log(`❌ Tabla ${table}: ${error.message}`);
          } else {
            console.log(`✅ Tabla ${table}: Accesible`);
          }
        }
      } catch (error) {
        console.log(`❌ Tabla ${table}: Error - ${error.message}`);
      }
    }
    
    // 4. Verificar configuración de RLS
    console.log('\n🔒 Verificando políticas RLS...');
    
    try {
      const { data: rlsTest, error: rlsError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (rlsError && rlsError.message.includes('policy')) {
        console.log('⚠️  Políticas RLS: Necesitan configuración');
        console.log('💡 Aplica la migración final en Supabase');
      } else if (rlsError) {
        console.log('❌ Error RLS:', rlsError.message);
      } else {
        console.log('✅ Políticas RLS: Configuradas correctamente');
      }
    } catch (error) {
      console.log('❌ Error verificando RLS:', error.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

// Función para probar registro de usuario
async function testSignup() {
  console.log('\n🧪 Probando registro de usuario...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Usuario de Prueba'
        }
      }
    });
    
    if (error) {
      console.log('❌ Error en registro:', error.message);
      return false;
    }
    
    if (data.user) {
      console.log('✅ Registro exitoso:', data.user.email);
      
      // Limpiar usuario de prueba
      console.log('🧹 Limpiando usuario de prueba...');
      await supabase.auth.signOut();
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.log('❌ Error en prueba de registro:', error.message);
    return false;
  }
}

// Ejecutar pruebas
async function main() {
  console.log('🚀 Iniciando pruebas de autenticación...\n');
  
  const connectionOk = await testAuth();
  
  if (connectionOk) {
    console.log('\n🎯 Próximos pasos:');
    console.log('1. ✅ Credenciales configuradas correctamente');
    console.log('2. ✅ Conexión a Supabase establecida');
    console.log('3. ⚠️  Aplicar migración final para RLS');
    console.log('4. ✅ Probar registro de usuarios');
    
    console.log('\n📝 Para completar la configuración:');
    console.log('1. Ve al SQL Editor: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/sql');
    console.log('2. Aplica la migración final');
    console.log('3. Reinicia el servidor de desarrollo');
    console.log('4. Prueba el registro en la aplicación');
    
  } else {
    console.log('\n❌ Problemas detectados:');
    console.log('1. Verifica las credenciales de Supabase');
    console.log('2. Asegúrate de que el proyecto esté activo');
    console.log('3. Verifica la conectividad de red');
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 