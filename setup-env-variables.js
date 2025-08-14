// Script para configurar variables de entorno para Supabase
import fs from 'fs';
import path from 'path';

const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=https://qcelbrzjrmjxpjxllyhk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw

# Environment
NODE_ENV=development
`;

const envPath = path.join(process.cwd(), '.env');

try {
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('📁 Archivo .env ya existe');
    
    // Read current content
    const currentContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if Supabase variables are already configured
    if (currentContent.includes('VITE_SUPABASE_URL') && currentContent.includes('VITE_SUPABASE_ANON_KEY')) {
      console.log('✅ Variables de Supabase ya están configuradas');
    } else {
      console.log('⚠️ Variables de Supabase no encontradas, actualizando...');
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Archivo .env actualizado con variables de Supabase');
    }
  } else {
    // Create new .env file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado con variables de Supabase');
  }
  
  console.log('\n🔧 CONFIGURACIÓN COMPLETADA');
  console.log('============================');
  console.log('📡 URL de Supabase:', 'https://qcelbrzjrmjxpjxllyhk.supabase.co');
  console.log('🔑 Clave anónima configurada');
  console.log('📁 Archivo .env ubicado en:', envPath);
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Reinicia tu servidor de desarrollo');
  console.log('2. Verifica que la aplicación se conecte correctamente');
  console.log('3. Las variables estarán disponibles como import.meta.env.VITE_SUPABASE_URL');
  
} catch (error) {
  console.error('❌ Error configurando variables de entorno:', error.message);
}
