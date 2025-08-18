const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupOrphanUsers() {
  console.log('🧹 Buscando usuarios huérfanos...\n');

  try {
    // 1. Contar perfiles actuales
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de perfiles en la base de datos: ${profileCount || 0}`);
    
    // 2. Obtener lista de perfiles con sus IDs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, created_at, profile_completed')
      .order('created_at', { ascending: false });
    
    if (!profiles || profiles.length === 0) {
      console.log('No se encontraron perfiles.');
      return;
    }
    
    // 3. Identificar perfiles incompletos creados hace más de 24 horas
    const now = new Date();
    const orphanProfiles = profiles.filter(profile => {
      if (profile.profile_completed) return false;
      
      const createdAt = new Date(profile.created_at);
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
      
      return hoursSinceCreation > 24;
    });
    
    console.log(`\n⚠️  Perfiles huérfanos encontrados: ${orphanProfiles.length}`);
    
    if (orphanProfiles.length > 0) {
      console.log('\nPerfiles huérfanos (creados hace más de 24h sin completar):');
      orphanProfiles.forEach(profile => {
        const createdAt = new Date(profile.created_at);
        const hoursSince = Math.round((now - createdAt) / (1000 * 60 * 60));
        console.log(`  - ${profile.email} (ID: ${profile.id.substring(0, 8)}...) - Creado hace ${hoursSince}h`);
      });
      
      console.log('\n⚠️  IMPORTANTE: Para eliminar estos usuarios huérfanos:');
      console.log('1. Ve a tu proyecto en Supabase Dashboard');
      console.log('2. Navega a Authentication > Users');
      console.log('3. Busca y elimina manualmente los usuarios listados arriba');
      console.log('\nO ejecuta esta consulta SQL en el SQL Editor:');
      console.log('\n-- ⚠️  CUIDADO: Esta consulta eliminará usuarios y sus datos');
      console.log('-- Primero, verifica los usuarios que serán eliminados:');
      console.log(`
SELECT au.id, au.email, au.created_at, p.profile_completed
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE (p.profile_completed IS FALSE OR p.profile_completed IS NULL)
  AND au.created_at < NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;
      `);
      
      console.log('\n-- Si estás seguro, puedes eliminar los perfiles huérfanos:');
      console.log(`
-- Eliminar perfiles huérfanos
DELETE FROM public.profiles
WHERE profile_completed = FALSE
  AND created_at < NOW() - INTERVAL '24 hours';
      `);
      
      console.log('\n-- Nota: Los usuarios en auth.users deben eliminarse manualmente desde el Dashboard');
    }
    
    // 4. Buscar usuarios temporales creados por el flujo anterior
    console.log('\n🔍 Buscando usuarios temporales del flujo anterior...');
    const { data: tempProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or('email.like.%temp_verification%,full_name.like.%verification_attempt%');
    
    if (tempProfiles && tempProfiles.length > 0) {
      console.log(`\n⚠️  Usuarios temporales encontrados: ${tempProfiles.length}`);
      tempProfiles.forEach(profile => {
        console.log(`  - ${profile.email} (ID: ${profile.id.substring(0, 8)}...)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
cleanupOrphanUsers().then(() => {
  console.log('\n✅ Análisis completado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
