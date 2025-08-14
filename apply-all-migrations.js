import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de Supabase no configuradas');
  console.log('Por favor ejecuta primero: node setup-env-variables.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Aplicando migraciones de base de datos...\n');
  
  // Lista de migraciones en orden
  const migrations = [
    '20250810000000_patients_rls_by_clinic.sql',
    '20250810002000_clinics_and_relationships_rls.sql',
    '20250810003000_patient_registration_tokens.sql',
    '20250810004000_add_med_rehabilitation_specialty.sql',
    '20250810005000_fix_clinic_relationships_recursion.sql',
    '20250810006000_complete_storage_setup.sql',
    '20250810007000_fix_patients_recursion.sql'
  ];
  
  console.log(`📋 ${migrations.length} migraciones pendientes de aplicar\n`);
  
  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migration);
    
    if (fs.existsSync(migrationPath)) {
      console.log(`📄 Aplicando: ${migration}`);
      console.log(`   Ruta: ${migrationPath}`);
      console.log('   ⚠️  Debes aplicar esta migración manualmente en Supabase');
      console.log('   Ve a: SQL Editor > New Query > Pega el contenido del archivo\n');
    } else {
      console.log(`❌ No encontrado: ${migration}`);
    }
  }
  
  console.log('\n📝 Instrucciones para aplicar las migraciones:');
  console.log('1. Ve a tu proyecto en Supabase: https://app.supabase.com');
  console.log('2. Navega a SQL Editor');
  console.log('3. Crea una nueva consulta (New Query)');
  console.log('4. Copia y pega el contenido de cada archivo SQL en orden');
  console.log('5. Ejecuta cada migración con el botón "Run"');
  console.log('\n⚠️  IMPORTANTE: Aplica las migraciones en el orden listado arriba');
  
  // Verificar tablas existentes
  console.log('\n🔍 Verificando tablas existentes...');
  
  try {
    // Verificar tabla appointments
    const { error: aptError } = await supabase.from('appointments').select('id').limit(1);
    if (aptError?.code === '42P01') {
      console.log('❌ Tabla "appointments" no existe');
    } else if (!aptError) {
      console.log('✅ Tabla "appointments" existe');
    }
    
    // Verificar tabla activity_logs
    const { error: logError } = await supabase.from('activity_logs').select('id').limit(1);
    if (logError?.code === '42P01') {
      console.log('❌ Tabla "activity_logs" no existe');
    } else if (!logError) {
      console.log('✅ Tabla "activity_logs" existe');
    }
    
    // Verificar tabla clinic_user_relationships
    const { error: relError } = await supabase.from('clinic_user_relationships').select('id').limit(1);
    if (relError?.code === '42P01') {
      console.log('❌ Tabla "clinic_user_relationships" no existe');
    } else if (!relError) {
      console.log('✅ Tabla "clinic_user_relationships" existe');
    } else if (relError) {
      console.log('⚠️  Error en tabla "clinic_user_relationships":', relError.message);
    }
    
    // Verificar storage buckets
    console.log('\n🗄️  Verificando Storage Buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (!bucketsError && buckets) {
      const requiredBuckets = ['profile-photos', 'prescription-icons', 'clinic-assets'];
      requiredBuckets.forEach(bucketName => {
        const exists = buckets.some(b => b.name === bucketName);
        console.log(exists ? `✅ Bucket "${bucketName}" existe` : `❌ Bucket "${bucketName}" no existe`);
      });
    }
    
  } catch (error) {
    console.error('Error verificando tablas:', error);
  }
}

applyMigrations();
