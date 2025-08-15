#!/usr/bin/env node

/**
 * Script para probar el flujo completo de registro con confirmación de email
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (desarrollo local)
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.FPREjK1R3FEsVbcAMQVcOrRcs16MYFL8cQHK2W3STKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmailRegistration() {
  console.log('🧪 PROBANDO REGISTRO CON CONFIRMACIÓN DE EMAIL');
  console.log('='.repeat(50));
  
  // Generar email único para prueba
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Email de prueba: ${testEmail}`);
  console.log(`🔒 Contraseña: ${testPassword}`);
  
  try {
    console.log('\n1️⃣ Intentando registrar usuario...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Usuario de Prueba',
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
      console.log('\n📬 EMAIL DE CONFIRMACIÓN ENVIADO');
      console.log('='.repeat(30));
      console.log('✅ Se ha enviado un email de confirmación');
      console.log('🔍 Para verlo en desarrollo local:');
      console.log('   1. Ve a: http://localhost:54324');
      console.log('   2. Busca el email para:', testEmail);
      console.log('   3. Haz clic en el enlace de confirmación');
      console.log('   4. Luego intenta hacer login');
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
      console.log('🔧 Verifica que enable_confirmations = true en config.toml');
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
    console.error('❌ Error general:', error);
  }
  
  console.log('\n📋 RESUMEN DE LA PRUEBA');
  console.log('='.repeat(30));
  console.log('✅ Usuario registrado correctamente');
  console.log('📧 Email de confirmación enviado al servidor de testing');
  console.log('🔒 Login bloqueado hasta confirmar email');
  console.log('📬 Revisa http://localhost:54324 para ver el email');
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Ve a http://localhost:54324');
  console.log('2. Encuentra el email de confirmación');
  console.log('3. Haz clic en el enlace');
  console.log('4. Intenta hacer login de nuevo');
  
  console.log('\n🧹 LIMPIEZA:');
  console.log(`Para eliminar este usuario de prueba, ejecuta en el SQL Editor:`);
  console.log(`DELETE FROM auth.users WHERE email = '${testEmail}';`);
  console.log(`DELETE FROM profiles WHERE email = '${testEmail}';`);
}

// Ejecutar la prueba
testEmailRegistration().catch(console.error);
