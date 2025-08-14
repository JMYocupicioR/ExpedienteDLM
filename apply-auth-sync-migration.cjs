const { createClient } = require('@supabase/supabase-js');
const { readFile } = require('fs/promises');
const { config } = require('dotenv');
const { join } = require('path');

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

async function applyMigration() {
  console.log('🚀 Aplicando migración de sincronización auth-profiles...\n');
  console.log('⚠️  IMPORTANTE: Es mejor ejecutar esta migración directamente en Supabase Dashboard\n');

  try {
    // Verificar el estado actual primero
    console.log('📊 Verificando estado actual...');
    
    // Contar usuarios totales
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Total de perfiles actuales: ${profileCount || 0}`);
    
    // Verificar usuarios sin perfil
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    if (authUsers && authUsers.users) {
      console.log(`✅ Total de usuarios en auth.users: ${authUsers.users.length}`);
      
      // Buscar usuarios sin perfil
      const userIds = authUsers.users.map(u => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', userIds);
      
      const profileIds = profiles ? profiles.map(p => p.id) : [];
      const usersWithoutProfile = userIds.filter(id => !profileIds.includes(id));
      
      if (usersWithoutProfile.length > 0) {
        console.log(`\n⚠️  Usuarios sin perfil encontrados: ${usersWithoutProfile.length}`);
        console.log('Estos usuarios necesitan un perfil asociado.');
      } else {
        console.log('\n✅ Todos los usuarios tienen perfil asociado');
      }
    }
    
    // Mostrar instrucciones para aplicar la migración
    console.log('\n📝 Para aplicar la migración completa:');
    console.log('1. Ve a tu proyecto en Supabase Dashboard');
    console.log('2. Navega a SQL Editor');
    console.log('3. Crea una nueva consulta');
    console.log('4. Copia y pega el contenido del archivo:');
    console.log('   supabase/migrations/20250809000000_fix_auth_profile_sync.sql');
    console.log('5. Ejecuta la consulta');
    console.log('\nEsto asegurará que:');
    console.log('- Se cree un trigger para sincronizar nuevos usuarios');
    console.log('- Los usuarios existentes tengan perfiles');
    console.log('- Las políticas RLS estén correctamente configuradas');

  } catch (error) {
    console.error('❌ Error verificando estado:', error.message);
    
    if (error.message && error.message.includes('auth.admin')) {
      console.log('\n⚠️  No se puede acceder a auth.admin con service role key');
      console.log('Verifica que estés usando el service role key correcto');
    }
  }
}

// Ejecutar
applyMigration().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
