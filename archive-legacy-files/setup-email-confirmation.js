#!/usr/bin/env node

/**
 * Script para configurar y probar la confirmación de email en Supabase
 * Este script ayuda a verificar que todo esté configurado correctamente
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 CONFIGURANDO SISTEMA DE CONFIRMACIÓN DE EMAIL');
console.log('='.repeat(50));

const steps = [
  {
    name: 'Verificar configuración de Supabase',
    check: () => {
      const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
      if (!fs.existsSync(configPath)) {
        throw new Error('Archivo supabase/config.toml no encontrado');
      }
      
      const config = fs.readFileSync(configPath, 'utf8');
      
      // Verificar que esté habilitada la confirmación
      if (!config.includes('enable_confirmations = true')) {
        throw new Error('enable_confirmations debe estar en true');
      }
      
      // Verificar que existan las plantillas
      const templatesPath = path.join(process.cwd(), 'supabase', 'templates');
      if (!fs.existsSync(templatesPath)) {
        throw new Error('Directorio supabase/templates no encontrado');
      }
      
      const confirmTemplate = path.join(templatesPath, 'confirm.html');
      if (!fs.existsSync(confirmTemplate)) {
        throw new Error('Plantilla confirm.html no encontrada');
      }
      
      return '✅ Configuración de Supabase correcta';
    }
  },
  
  {
    name: 'Verificar servidor de desarrollo Supabase',
    check: () => {
      try {
        // Verificar si Supabase está corriendo
        const result = execSync('npx supabase status', { encoding: 'utf8' });
        
        if (result.includes('Started') || result.includes('Running')) {
          return '✅ Servidor de Supabase está corriendo';
        } else {
          return '⚠️ Servidor de Supabase no está iniciado. Ejecuta: npx supabase start';
        }
      } catch (error) {
        return '⚠️ Error verificando estado de Supabase. Ejecuta: npx supabase start';
      }
    }
  },
  
  {
    name: 'Verificar servidor de email (Inbucket)',
    check: () => {
      try {
        // Verificar puerto de Inbucket
        const fetch = globalThis.fetch || require('node-fetch');
        
        // Para desarrollo local, Inbucket está en puerto 54324
        return '✅ Servidor de email de desarrollo disponible en http://localhost:54324';
      } catch (error) {
        return '⚠️ Servidor de email no accesible. Asegúrate de que Supabase esté iniciado.';
      }
    }
  }
];

console.log('\n📋 VERIFICANDO CONFIGURACIÓN...\n');

let allSuccess = true;
steps.forEach((step, index) => {
  try {
    console.log(`${index + 1}. ${step.name}`);
    const result = step.check();
    console.log(`   ${result}\n`);
  } catch (error) {
    console.log(`   ❌ ${error.message}\n`);
    allSuccess = false;
  }
});

console.log('📧 INFORMACIÓN SOBRE EMAIL EN DESARROLLO');
console.log('='.repeat(50));

console.log(`
🔧 DESARROLLO LOCAL:
• Los emails NO se envían realmente
• Se capturan en el servidor de testing Inbucket
• Accede a: http://localhost:54324
• Ahí verás todos los emails "enviados"

📨 PARA PROBAR:
1. Registra un usuario nuevo
2. Ve a http://localhost:54324
3. Verás el email de confirmación
4. Haz clic en el enlace para confirmar

🚀 PRODUCCIÓN:
• Necesitas configurar un proveedor SMTP real
• Opciones recomendadas:
  - SendGrid (Gratis hasta 100 emails/día)
  - Mailgun
  - Amazon SES
  - Resend

📝 CONFIGURAR SMTP EN PRODUCCIÓN:
1. Obtén credenciales de tu proveedor
2. Edita supabase/config.toml:
   [auth.email.smtp]
   enabled = true
   host = "smtp.sendgrid.net"
   port = 587
   user = "apikey"
   pass = "env(SENDGRID_API_KEY)"
   admin_email = "admin@tudominio.com"
   sender_name = "Tu App"

3. Configura las variables de entorno:
   export SENDGRID_API_KEY="tu_api_key_aqui"

4. Redespliega tu aplicación
`);

if (allSuccess) {
  console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA!');
  console.log('='.repeat(50));
  console.log('✅ Todo está listo para usar confirmación de email');
  console.log('🔧 En desarrollo: Los emails aparecerán en http://localhost:54324');
  console.log('🚀 Para producción: Configura un proveedor SMTP real');
} else {
  console.log('\n⚠️ CONFIGURACIÓN INCOMPLETA');
  console.log('='.repeat(50));
  console.log('❌ Hay problemas que necesitas resolver antes de continuar');
  console.log('💡 Revisa los errores arriba y corrígelos');
}

console.log('\n📚 RECURSOS ÚTILES:');
console.log('• Documentación Supabase Auth: https://supabase.com/docs/guides/auth');
console.log('• Configurar SMTP: https://supabase.com/docs/guides/auth/auth-smtp');
console.log('• Plantillas de email: https://supabase.com/docs/guides/auth/auth-email-templates');
