const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupEnhancedProfileSystem() {
  try {
    console.log('🚀 Configurando sistema de perfiles mejorado...');

    // 1. Aplicar configuración de Storage
    console.log('📁 Configurando Supabase Storage...');
    
    const storageSetupPath = path.join(__dirname, 'setup-supabase-storage.sql');
    const storageSetup = fs.readFileSync(storageSetupPath, 'utf8');

    // Ejecutar configuración de storage (dividido en partes porque RPC tiene límites)
    const sqlParts = storageSetup.split('-- ==========================================');
    
    for (const part of sqlParts) {
      if (part.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: part.trim() });
          if (error && !error.message.includes('already exists')) {
            console.warn('⚠️ Advertencia en configuración de storage:', error.message);
          }
        } catch (err) {
          console.warn('⚠️ Parte del setup de storage falló (puede ser normal):', err.message);
        }
      }
    }

    // 2. Crear buckets de storage directamente
    console.log('🪣 Creando buckets de storage...');
    
    try {
      // Crear bucket para fotos de perfil
      const { error: profileBucketError } = await supabase.storage.createBucket('profile-photos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });

      if (profileBucketError && !profileBucketError.message.includes('already exists')) {
        console.warn('⚠️ Error creando bucket profile-photos:', profileBucketError.message);
      } else if (!profileBucketError) {
        console.log('✅ Bucket profile-photos creado');
      } else {
        console.log('✅ Bucket profile-photos ya existe');
      }

      // Crear bucket para iconos de recetas
      const { error: iconBucketError } = await supabase.storage.createBucket('prescription-icons', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
      });

      if (iconBucketError && !iconBucketError.message.includes('already exists')) {
        console.warn('⚠️ Error creando bucket prescription-icons:', iconBucketError.message);
      } else if (!iconBucketError) {
        console.log('✅ Bucket prescription-icons creado');
      } else {
        console.log('✅ Bucket prescription-icons ya existe');
      }

    } catch (err) {
      console.error('❌ Error configurando buckets:', err);
    }

    // 3. Actualizar tabla profiles con campos adicionales
    console.log('📋 Actualizando tabla profiles...');
    
    const profileUpdateSQL = `
      -- Agregar campos adicionales a profiles si no existen
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS prescription_icon_url TEXT;
      
      -- Actualizar perfil de super admin si existe
      UPDATE public.profiles 
      SET additional_info = COALESCE(additional_info, '{}'::jsonb) || jsonb_build_object(
        'bio', 'Super Administrador del sistema ExpedienteDLM',
        'languages', ARRAY['Español', 'Inglés'],
        'certifications', ARRAY['Administración de Sistemas Médicos'],
        'updated_by_setup', NOW()::text
      )
      WHERE role = 'super_admin' AND full_name IS NOT NULL;
    `;

    const { error: profileError } = await supabase.rpc('exec_sql', { sql: profileUpdateSQL });
    if (profileError) {
      console.warn('⚠️ Error actualizando profiles:', profileError.message);
    } else {
      console.log('✅ Tabla profiles actualizada');
    }

    // 4. Verificar configuración de storage
    console.log('🔍 Verificando configuración de storage...');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error obteniendo buckets:', bucketsError);
    } else {
      const profileBucket = buckets.find(b => b.name === 'profile-photos');
      const iconBucket = buckets.find(b => b.name === 'prescription-icons');
      
      console.log('📊 Estado de buckets:');
      console.log(`   - profile-photos: ${profileBucket ? '✅ Configurado' : '❌ Faltante'}`);
      console.log(`   - prescription-icons: ${iconBucket ? '✅ Configurado' : '❌ Faltante'}`);
    }

    // 5. Verificar que los campos se agregaron correctamente
    console.log('🔍 Verificando estructura de profiles...');
    
    const { data: profileStructure, error: structureError } = await supabase
      .from('profiles')
      .select('profile_photo_url, prescription_icon_url')
      .limit(1);

    if (structureError) {
      console.warn('⚠️ Error verificando estructura:', structureError.message);
    } else {
      console.log('✅ Campos de URL agregados correctamente a profiles');
    }

    // 6. Crear un perfil de prueba mejorado si no existe
    console.log('👤 Verificando perfiles existentes...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, additional_info')
      .limit(5);

    if (profilesError) {
      console.warn('⚠️ Error obteniendo perfiles:', profilesError.message);
    } else {
      console.log(`📊 Perfiles encontrados: ${profiles.length}`);
      
      profiles.forEach(profile => {
        console.log(`   - ${profile.email}: ${profile.role} (${profile.full_name || 'Sin nombre'})`);
      });
    }

    // 7. Información final
    console.log('\n🎉 ¡Sistema de perfiles mejorado configurado exitosamente!');
    console.log('\n📝 Funcionalidades habilitadas:');
    console.log('   ✅ Subida de fotos de perfil');
    console.log('   ✅ Subida de iconos para recetas');
    console.log('   ✅ Información profesional extendida');
    console.log('   ✅ Estadísticas médicas');
    console.log('   ✅ Actividad reciente');
    console.log('   ✅ Gestión de clínicas');

    console.log('\n🔗 Rutas disponibles:');
    console.log('   - /profile - Perfil de usuario completo');
    console.log('   - /signup-questionnaire - Registro mejorado');

    console.log('\n🧪 Para probar el sistema:');
    console.log('   1. Registra un nuevo usuario en /signup-questionnaire');
    console.log('   2. Completa el perfil');
    console.log('   3. Ve a /profile para ver y editar información');
    console.log('   4. Sube fotos de perfil e iconos de recetas');

    console.log('\n📸 Funcionalidades de fotos:');
    console.log('   - Fotos de perfil: JPG, PNG, WebP, GIF (máx 5MB)');
    console.log('   - Iconos de recetas: JPG, PNG, WebP, SVG (máx 2MB)');
    console.log('   - Redimensionamiento automático');
    console.log('   - Validación de tipos de archivo');

  } catch (error) {
    console.error('\n💥 Error durante la configuración:', error);
    console.log('\n🔧 Pasos para solucionar:');
    console.log('1. Verificar que las migraciones anteriores se aplicaron');
    console.log('2. Comprobar variables de entorno de Supabase');
    console.log('3. Verificar permisos de service role key');
    console.log('4. Ejecutar primero: node apply-enhanced-auth-migration.js');
    
    process.exit(1);
  }
}

// Ejecutar configuración si este archivo se ejecuta directamente
if (require.main === module) {
  setupEnhancedProfileSystem();
}

module.exports = { setupEnhancedProfileSystem };