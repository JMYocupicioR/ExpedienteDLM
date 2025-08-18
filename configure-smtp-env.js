#!/usr/bin/env node

/**
 * Script para configurar variables de entorno SMTP
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 CONFIGURANDO VARIABLES DE ENTORNO SMTP');
console.log('='.repeat(50));

const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

const envContent = `# Variables de entorno para DeepLux Med
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# SMTP Configuration para Ionos
# IMPORTANTE: No incluyas contraseñas reales en repositorio
# Define SMTP_PASSWORD en variables de entorno de Netlify/producción
SMTP_PASSWORD=

# Environment
NODE_ENV=development
`;

try {
  // Intentar crear .env.local primero
  if (!fs.existsSync(envLocalPath)) {
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ Archivo .env.local creado exitosamente');
    console.log('📍 Ubicación:', envLocalPath);
  } else {
    console.log('📁 Archivo .env.local ya existe');
  }
  
  // Si .env.local no se puede crear, intentar .env
  if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env creado exitosamente');
    console.log('📍 Ubicación:', envPath);
  }
  
} catch (error) {
  console.error('❌ Error creando archivo de variables:', error.message);
  console.log('\n📝 CONFIGURACIÓN MANUAL REQUERIDA');
  console.log('='.repeat(40));
  console.log('Crea manualmente un archivo .env en la raíz del proyecto con este contenido:\n');
  console.log(envContent);
}

console.log('\n🔑 CONFIGURACIÓN SMTP DETECTADA');
console.log('='.repeat(40));
console.log('📧 Host: smtp.ionos.mx');
console.log('🔌 Puerto: 587');
console.log('👤 Usuario: soporte@deepluxmed.mx');
console.log('🏷️ Nombre: DeepLuxMed');

console.log('\n⚠️ ACCIÓN REQUERIDA:');
console.log('='.repeat(30));
console.log('1. Edita el archivo .env/.env.local');
console.log('2. Configura SMTP_PASSWORD en entorno seguro');
console.log('3. Guarda el archivo');
console.log('4. Reinicia tu servidor de desarrollo');

console.log('\n🔒 SEGURIDAD:');
console.log('• NUNCA compartas tu archivo .env');
console.log('• El archivo está en .gitignore (no se subirá a git)');
console.log('• Usa variables de entorno en producción');

console.log('\n✅ PASOS SIGUIENTES:');
console.log('1. Configurar variables en .env');
console.log('2. Ejecutar: npm run dev');
console.log('3. Probar registro de usuario');
console.log('4. Verificar que lleguen los emails');
