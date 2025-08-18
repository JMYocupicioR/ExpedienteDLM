import { existsSync, readFileSync, writeFileSync } from 'fs';

// Configuración de DeepSeek
// NOTE: Do not hardcode real API keys in the repository.
// Use environment variables instead and reference them at runtime.
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || 'YOUR_DEEPSEEK_API_KEY';

// Configuración de Supabase (usar variables de entorno o placeholders)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('🚀 Configurando archivo .env con DeepSeek R1...\n');

try {
  let envContent = '';

  // Verificar si ya existe un archivo .env
  if (existsSync('.env')) {
    envContent = readFileSync('.env', 'utf8');
    console.log('📁 Archivo .env existente encontrado, actualizando...');
  } else {
    console.log('📝 Creando nuevo archivo .env...');
  }

  // Configurar las variables de entorno
  const envConfig = `# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# DeepSeek API Configuration
VITE_DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}

# Medical AI Configuration
VITE_AI_MODEL=deepseek-chat
VITE_AI_TEMPERATURE=0.3
VITE_AI_MAX_TOKENS=1000
`;

  // Escribir el archivo .env
  writeFileSync('.env', envConfig);

  console.log('✅ Archivo .env configurado correctamente');
  console.log('🤖 DeepSeek R1 configurado');
  if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'YOUR_DEEPSEEK_API_KEY') {
    console.log(`🔑 API Key detected (masked)`);
  } else {
    console.log('🔑 API Key no configurada (usa VITE_DEEPSEEK_API_KEY en .env)');
  }
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);

  console.log('\n🔄 Pasos siguientes:');
  console.log('1. Reinicia el servidor de desarrollo');
  console.log('2. Ve a Nueva Consulta → Padecimiento Actual');
  console.log('3. Prueba el Asistente de IA con DeepSeek R1');
} catch (error) {
  console.error('❌ Error configurando archivo .env:', error.message);
  console.log('\n📝 Configuración manual requerida:');
  console.log('Crea un archivo .env en la raíz del proyecto con:');
  console.log('');
  console.log('# Supabase Configuration');
  console.log(`VITE_SUPABASE_URL=${SUPABASE_URL}`);
  console.log('VITE_SUPABASE_ANON_KEY=<your_anon_key>');
  console.log('');
  console.log('# DeepSeek API Configuration');
  console.log('REACT_APP_DEEPSEEK_API_KEY=<CONFIGURE_IN_ENV>');
}
