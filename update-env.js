import { readFileSync, writeFileSync } from 'fs';

// Credenciales de Supabase (usar variables de entorno, no hardcodear)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('🔧 Actualizando archivo .env con credenciales...');

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
  console.log('🔑 Key: <masked>');

  console.log('\n🔄 Reiniciando servidor de desarrollo...');
  console.log('💡 Presiona Ctrl+C en la terminal donde está ejecutándose el servidor');
  console.log('💡 Luego ejecuta: npm run dev');

} catch (error) {
  console.error('❌ Error actualizando archivo .env:', error.message);
  console.log('\n📝 Actualización manual requerida:');
  console.log('1. Abre el archivo .env en tu editor');
  console.log('2. Reemplaza las líneas:');
  console.log(`   VITE_SUPABASE_URL=${SUPABASE_URL}`);
  console.log('   VITE_SUPABASE_ANON_KEY=<your_anon_key>');
  console.log('3. Guarda el archivo');
  console.log('4. Reinicia el servidor de desarrollo');
}
