import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUsers() {
  console.log('🔍 Buscando todos los usuarios en el sistema...\n');

  try {
    // Buscar en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (!authError && authUsers) {
      console.log('👤 Usuarios en auth.users:');
      console.log('========================');
      authUsers.users.forEach(user => {
        console.log(`\nID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Creado: ${new Date(user.created_at).toLocaleDateString()}`);
      });
    }

    // Buscar en profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n\n📋 Perfiles en la tabla profiles:');
    console.log('=================================');
    
    if (!profilesError && profiles) {
      if (profiles.length === 0) {
        console.log('No hay perfiles en la base de datos');
      } else {
        profiles.forEach(profile => {
          console.log(`\nID: ${profile.id}`);
          console.log(`Email: ${profile.email || 'No especificado'}`);
          console.log(`Nombre: ${profile.full_name || 'No especificado'}`);
          console.log(`Rol: ${profile.role || 'No especificado'}`);
          console.log(`Clínica ID: ${profile.clinic_id || 'No asignada'}`);
          console.log(`---`);
        });
      }
    }

    // Contar pacientes
    const { count: patientCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Total de pacientes en el sistema:', patientCount || 0);

    // Si encontramos el usuario jmyocupidor
    const jmyUser = profiles?.find(p => p.email?.includes('jmyocupidor'));
    if (jmyUser) {
      console.log('\n✅ Usuario jmyocupidor encontrado con ID:', jmyUser.id);
      console.log('\n🔧 Para hacerlo administrador, ejecuta este SQL en Supabase:');
      console.log(`\nUPDATE profiles SET role = 'admin_staff' WHERE id = '${jmyUser.id}';`);
    } else {
      console.log('\n⚠️  No se encontró un perfil para jmyocupidor@gmail.com');
      console.log('Esto podría significar que:');
      console.log('1. El usuario existe en auth pero no tiene perfil');
      console.log('2. El email está registrado de forma diferente');
      console.log('\nIntenta iniciar sesión nuevamente para que se cree el perfil automáticamente');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkUsers();
