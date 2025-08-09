import { writeFileSync, readFileSync, existsSync } from 'fs';

// Configuración de DeepSeek
const DEEPSEEK_API_KEY = 'sk-86b8d2f019654ced9078e775d656dfcb';

// Configuración de Supabase (existente)
const SUPABASE_URL = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

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
  console.log(`🔑 API Key: ${DEEPSEEK_API_KEY.substring(0, 20)}...`);
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
  console.log(`VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}`);
  console.log('');
  console.log('# DeepSeek API Configuration');
  console.log(`REACT_APP_DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}`);
}