import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Función para cargar variables de entorno desde .env
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  
  if (!existsSync(envPath)) {
    console.log('📝 Archivo .env no encontrado. Creando archivo de ejemplo...');
    
    const envContent = `# Supabase Configuration
# Reemplaza estos valores con tus credenciales reales de Supabase
VITE_SUPABASE_URL=https://qcelbrzjrmjxpjxllyhk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw

# Otras variables de entorno
VITE_APP_NAME=ExpedienteDLM
VITE_APP_VERSION=1.0.0
`;
    
    try {
      writeFileSync(envPath, envContent);
      console.log('✅ Archivo .env creado exitosamente');
      console.log('📝 Por favor, edita el archivo .env con tus credenciales reales');
      return false;
    } catch (error) {
      console.error('❌ Error creando archivo .env:', error.message);
      return false;
    }
  }
  
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!key.startsWith('#') && value) {
          envVars[key.trim()] = value;
        }
      }
    });
    
    // Cargar variables en process.env
    Object.assign(process.env, envVars);
    return true;
  } catch (error) {
    console.error('❌ Error leyendo archivo .env:', error.message);
    return false;
  }
}

// Función para probar la conexión a Supabase
async function testSupabaseConnection() {
  console.log('🔍 Probando conexión a Supabase...\n');
  
  // Cargar variables de entorno
  if (!loadEnvFile()) {
    console.log('\n💡 Por favor, configura el archivo .env y ejecuta este script nuevamente');
    return false;
  }
  
  // Verificar variables de entorno
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('📋 Configuración actual:');
  console.log(`   URL: ${supabaseUrl || '❌ No configurada'}`);
  console.log(`   Anon Key: ${supabaseAnonKey ? '✅ Configurada' : '❌ No configurada'}\n`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ ERROR: Variables de entorno no configuradas');
    console.log('\n📝 Para configurar Supabase:');
    console.log('1. Edita el archivo .env en la raíz del proyecto');
    console.log('2. Reemplaza los valores de ejemplo con tus credenciales reales:');
    console.log('   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.log('   VITE_SUPABASE_ANON_KEY=tu-clave-anonima');
    console.log('\n3. Obtén estas credenciales desde:');
    console.log('   https://supabase.com/dashboard/project/[tu-proyecto]/settings/api');
    return false;
  }
  
  // Verificar formato de URL
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.log('❌ ERROR: URL de Supabase inválida');
    console.log('   La URL debe tener el formato: https://tu-proyecto.supabase.co');
    return false;
  }
  
  try {
    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('🔄 Intentando conectar...');
    
    // Probar conexión básica
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Error de conexión:', error.message);
      return false;
    }
    
    console.log('✅ Conexión exitosa a Supabase!');
    console.log('📊 Estado de sesión:', data.session ? 'Activa' : 'Sin sesión');
    
    // Probar consulta a la base de datos
    console.log('\n🔄 Probando consulta a la base de datos...');
    
    // Intentar una consulta simple
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Advertencia: No se pudo consultar la tabla "profiles"');
      console.log('   Error:', testError.message);
      console.log('   Esto puede ser normal si la tabla no existe aún');
    } else {
      console.log('✅ Consulta a base de datos exitosa');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Error inesperado:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🚀 Configurador de Supabase para ExpedienteDLM\n');
  
  const success = await testSupabaseConnection();
  
  if (success) {
    console.log('\n🎉 ¡Supabase está configurado correctamente!');
    console.log('💡 Puedes iniciar el servidor de desarrollo con: npm run dev');
  } else {
    console.log('\n💡 Sigue los pasos de configuración arriba');
    console.log('📖 Consulta el archivo supabase-setup.md para más detalles');
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 