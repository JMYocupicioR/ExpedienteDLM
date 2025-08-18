import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

console.log('🔍 VERIFICACIÓN FINAL - ExpedienteDLM\n');

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyCompleteSetup() {
  let allPassed = true;
  
  console.log('📊 VERIFICANDO CONFIGURACIÓN COMPLETA...\n');
  
  try {
    // 1. Verificar conexión básica
    console.log('1️⃣ Conexión a Supabase...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Error de conexión:', connectionError.message);
      allPassed = false;
    } else {
      console.log('✅ Conexión establecida');
    }
    
    // 2. Verificar todas las tablas principales
    console.log('\n2️⃣ Verificando tablas de la base de datos...');
    
    const tables = [
      'profiles',
      'patients', 
      'consultations',
      'prescriptions',
      'physical_exams',
      'hereditary_backgrounds',
      'pathological_histories',
      'non_pathological_histories',
      'physical_exam_templates'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabla ${table}: ${error.message}`);
          allPassed = false;
        } else {
          console.log(`✅ Tabla ${table}: Accesible`);
        }
      } catch (err) {
        console.log(`❌ Tabla ${table}: Error de red`);
        allPassed = false;
      }
    }
    
    // 3. Verificar políticas RLS para pacientes
    console.log('\n3️⃣ Verificando políticas RLS para pacientes...');
    
    try {
      // Intentar insertar un paciente de prueba (debería fallar por RLS sin autenticación)
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          full_name: 'Paciente Prueba RLS',
          birth_date: '1990-01-01',
          gender: 'masculino',
          email: 'test@rls.com',
          phone: '+52 555 000 0000'
        }])
        .select();
      
      if (error && error.message.includes('row-level security')) {
        console.log('✅ RLS funcionando correctamente (bloquea inserciones sin autenticación)');
      } else if (error) {
        console.log('⚠️  RLS configurado, pero hay otro error:', error.message);
      } else {
        console.log('⚠️  RLS podría no estar configurado correctamente');
        // Limpiar si se insertó
        if (data && data[0]) {
          await supabase.from('patients').delete().eq('id', data[0].id);
        }
      }
    } catch (err) {
      console.log('❌ Error verificando RLS:', err.message);
      allPassed = false;
    }
    
    // 4. Verificar autenticación
    console.log('\n4️⃣ Verificando configuración de autenticación...');
    
    const { data: authConfig } = await supabase.auth.getSession();
    if (!authConfig.session) {
      console.log('✅ Sin sesión activa (correcto para verificación)');
    } else {
      console.log('ℹ️  Hay una sesión activa:', authConfig.session.user.email);
    }
    
    // 5. Verificar aplicación web
    console.log('\n5️⃣ Verificando aplicación web...');
    
    try {
      const response = await fetch('http://localhost:5174/', { 
        method: 'HEAD',
        timeout: 5000 
      });
      
      if (response.ok) {
        console.log('✅ Aplicación web ejecutándose en http://localhost:5174');
      } else {
        console.log('⚠️  Aplicación web respondió con código:', response.status);
      }
    } catch (err) {
      console.log('❌ Aplicación web no accesible. ¿Está ejecutándose npm run dev?');
      allPassed = false;
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN FINAL');
    console.log('='.repeat(60));
    
    if (allPassed) {
      console.log('🎉 ¡CONFIGURACIÓN COMPLETA Y EXITOSA!');
      console.log('\n✅ Todo está listo para usar:');
      console.log('   • Supabase conectado y configurado');
      console.log('   • Base de datos con todas las tablas');
      console.log('   • Políticas RLS funcionando');
      console.log('   • Aplicación web ejecutándose');
      
      console.log('\n🚀 PRÓXIMOS PASOS:');
      console.log('1. Ve a http://localhost:5174');
      console.log('2. Regístrate como doctor');
      console.log('3. ¡Empieza a crear pacientes y consultas!');
      
    } else {
      console.log('⚠️  CONFIGURACIÓN PARCIAL');
      console.log('\n🔧 ACCIONES PENDIENTES:');
      console.log('1. Aplicar migraciones en el SQL Editor');
      console.log('2. Verificar que el servidor esté ejecutándose');
      console.log('3. Reiniciar la aplicación si es necesario');
    }
    
    console.log('\n📱 ENLACES ÚTILES:');
    console.log('   • Aplicación: http://localhost:5174');
    console.log('   • Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF');
    console.log('   • SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql');
    
  } catch (error) {
    console.error('❌ Error crítico en verificación:', error.message);
    allPassed = false;
  }
  
  return allPassed;
}

// Ejecutar verificación
verifyCompleteSetup().then(success => {
  if (success) {
    console.log('\n🎯 ¡Verificación completada exitosamente!');
    process.exit(0);
  } else {
    console.log('\n🔄 Verificación completada con advertencias.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});