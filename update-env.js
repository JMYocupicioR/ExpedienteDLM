import { writeFileSync, readFileSync } from 'fs';

// Credenciales correctas de Supabase
const SUPABASE_URL = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

console.log('🔧 Actualizando archivo .env con credenciales correctas...\n');

try {
  // Leer el archivo .env actual
  const currentEnv = readFileSync('.env', 'utf8');
  
  // Reemplazar las credenciales
  const updatedEnv = currentEnv
    .replace(/VITE_SUPABASE_URL=.*/g, `VITE_SUPABASE_URL=${SUPABASE_URL}`)
    .replace(/VITE_SUPABASE_ANON_KEY=.*/g, `VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}`);
  
  // Escribir el archivo actualizado
  writeFileSync('.env', updatedEnv);
  
  console.log('✅ Archivo .env actualizado correctamente');
  console.log(`📡 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  
  console.log('\n🔄 Reiniciando servidor de desarrollo...');
  console.log('💡 Presiona Ctrl+C en la terminal donde está ejecutándose el servidor');
  console.log('💡 Luego ejecuta: npm run dev');
  
} catch (error) {
  console.error('❌ Error actualizando archivo .env:', error.message);
  console.log('\n📝 Actualización manual requerida:');
  console.log('1. Abre el archivo .env en tu editor');
  console.log('2. Reemplaza las líneas:');
  console.log(`   VITE_SUPABASE_URL=${SUPABASE_URL}`);
  console.log(`   VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}`);
  console.log('3. Guarda el archivo');
  console.log('4. Reinicia el servidor de desarrollo');
} 