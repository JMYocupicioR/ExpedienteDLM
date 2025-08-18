import { createClient } from '@supabase/supabase-js';

// Usa tus credenciales de Supabase aquí
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0MDU0MjIsImV4cCI6MjA0MDk4MTQyMn0.Z4CR0yF1N2pE1Vt-1k0xg_M5LrDM3x56JcBZe8hP2VY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorageSetup() {
  console.log('🔍 Verificando configuración de Storage...\n');

  try {
    // Verificar buckets
    console.log('📦 Verificando buckets...');
    const buckets = ['profile-photos', 'clinic-assets', 'patient-documents'];
    
    for (const bucketId of buckets) {
      try {
        const { data, error } = await supabase.storage.from(bucketId).list('', { limit: 1 });
        if (error) {
          console.log(`❌ Bucket '${bucketId}': ${error.message}`);
        } else {
          console.log(`✅ Bucket '${bucketId}': Accesible`);
        }
      } catch (err) {
        console.log(`❌ Bucket '${bucketId}': Error al verificar`);
      }
    }

    // Verificar usuario actual
    console.log('\n👤 Usuario actual:');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      
      // Verificar perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, clinic_id')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        console.log(`   Rol: ${profile.role}`);
        console.log(`   Clínica ID: ${profile.clinic_id || 'No asignada'}`);
      }
    } else {
      console.log('   ⚠️ No hay usuario autenticado');
    }

    console.log('\n📋 Instrucciones:');
    console.log('1. Si ves errores de buckets, ejecuta el SQL en: supabase/migrations/20250810006000_complete_storage_setup.sql');
    console.log('2. Si tienes errores de recursión, ejecuta el SQL en: supabase/migrations/20250810005000_fix_clinic_relationships_recursion.sql');
    console.log('3. Asegúrate de estar autenticado antes de subir archivos');

  } catch (error) {
    console.error('❌ Error general:', error);
  }

  process.exit(0);
}

checkStorageSetup();
