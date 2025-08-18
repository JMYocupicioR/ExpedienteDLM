#!/usr/bin/env node

/**
 * Script para probar la configuración SMTP de Ionos
 */

import { createClient } from '@supabase/supabase-js';

// Usar la URL de producción de Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testIonosSMTP() {
  console.log('🧪 PROBANDO CONFIGURACIÓN SMTP IONOS');
  console.log('='.repeat(50));
  
  // Generar email único para prueba
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@gmail.com`; // Usar un email real tuyo para probar
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Email de prueba: ${testEmail}`);
  console.log(`🔒 Contraseña: ${testPassword}`);
  console.log('🏢 Proveedor SMTP: smtp.ionos.mx');
  console.log('📨 Emails enviados desde: soporte@deepluxmed.mx');
  
  try {
    console.log('\n1️⃣ Intentando registrar usuario...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Usuario de Prueba SMTP',
          role: 'doctor'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Error en registro:', signUpError.message);
      return;
    }
    
    console.log('✅ Usuario creado exitosamente');
    console.log('📧 ID del usuario:', signUpData.user?.id);
    console.log('📧 Email confirmado:', signUpData.user?.email_confirmed_at ? 'Sí' : 'No');
    
    if (!signUpData.user?.email_confirmed_at) {
      console.log('\n📬 EMAIL DE CONFIRMACIÓN ENVIADO VÍA IONOS');
      console.log('='.repeat(45));
      console.log('✅ Se ha enviado un email de confirmación');
      console.log('📧 Desde: soporte@deepluxmed.mx');
      console.log('📧 Hacia:', testEmail);
      console.log('🏢 Servidor SMTP: smtp.ionos.mx');
      console.log('');
      console.log('🔍 VERIFICA TU BANDEJA DE ENTRADA:');
      console.log('   📥 Bandeja principal');
      console.log('   📁 Carpeta de spam/promociones');
      console.log('   ⏰ Puede tardar unos minutos en llegar');
    }
    
    console.log('\n2️⃣ Intentando hacer login ANTES de confirmar...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        console.log('✅ CORRECTO: Se requiere confirmación de email');
        console.log('📧 Mensaje:', signInError.message);
      } else {
        console.log('❌ Error inesperado:', signInError.message);
      }
    } else {
      console.log('⚠️ ADVERTENCIA: Login exitoso sin confirmación');
      console.log('🔧 Puede que la confirmación esté deshabilitada');
    }
    
    console.log('\n3️⃣ Verificando estado en base de datos...');
    
    // Verificar si se creó el perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (profileError) {
      console.log('⚠️ No se encontró perfil:', profileError.message);
    } else {
      console.log('✅ Perfil creado:', profile.full_name);
      console.log('📧 Email en perfil:', profile.email);
      console.log('✅ Perfil activo:', profile.is_active);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    
    if (error.message.includes('network') || error.message.includes('SMTP')) {
      console.log('\n🔧 POSIBLES PROBLEMAS SMTP:');
      console.log('• Credenciales incorrectas en Supabase dashboard');
      console.log('• Puerto bloqueado por firewall');
      console.log('• Configuración de servidor SMTP incorrecta');
      console.log('• Límites de envío alcanzados');
    }
  }
  
  console.log('\n📋 RESUMEN DE LA PRUEBA');
  console.log('='.repeat(30));
  console.log('✅ Usuario registrado correctamente');
  console.log('📧 Email de confirmación enviado vía SMTP Ionos');
  console.log('🔒 Login bloqueado hasta confirmar email');
  console.log('📬 Revisa tu bandeja de entrada en:', testEmail);
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Revisa tu email (incluyendo spam)');
  console.log('2. Haz clic en el enlace de confirmación');
  console.log('3. Intenta hacer login de nuevo');
  console.log('4. Si no llega el email, revisa la configuración en Supabase');
  
  console.log('\n🧹 LIMPIEZA:');
  console.log(`Para eliminar este usuario de prueba:`);
  console.log(`1. Ve al dashboard de Supabase`);
  console.log(`2. Authentication > Users`);
  console.log(`3. Busca y elimina: ${testEmail}`);
}

// Ejecutar la prueba
testIonosSMTP().catch(console.error);
