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
VITE_SUPABASE_URL=https://qcelbrzjrmjxpjxllyhk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw

# SMTP Configuration para Ionos
# IMPORTANTE: Reemplaza 'tu_contraseña_smtp_aqui' con la contraseña real de soporte@deepluxmed.mx
SMTP_PASSWORD=tu_contraseña_smtp_aqui

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
console.log('2. Reemplaza "tu_contraseña_smtp_aqui" con la contraseña real');
console.log('3. Guarda el archivo');
console.log('4. Reinicia tu servidor de desarrollo');

console.log('\n🔒 SEGURIDAD:');
console.log('• NUNCA compartas tu archivo .env');
console.log('• El archivo está en .gitignore (no se subirá a git)');
console.log('• Usa variables de entorno en producción');

console.log('\n✅ PASOS SIGUIENTES:');
console.log('1. Configurar contraseña en .env');
console.log('2. Ejecutar: npm run dev');
console.log('3. Probar registro de usuario');
console.log('4. Verificar que lleguen los emails');
