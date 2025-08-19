import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

// Usar service key para bypass RLS (solo en entorno seguro)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseDashboard() {
  console.log('🔍 Diagnóstico completo del Dashboard de Administrador\n');
  console.log('================================================\n');

  try {
    // 1. Buscar usuario por email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'jmyocupidor@gmail.com');

    if (profileError || !profiles || profiles.length === 0) {
      console.log('❌ No se encontró el perfil del usuario');
      return;
    }

    const profile = profiles[0];
    console.log('✅ Perfil encontrado:');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Nombre:', profile.full_name);
    console.log('   Rol:', profile.role);
    console.log('   Clínica ID:', profile.clinic_id);

    // 2. Verificar condiciones para mostrar sección de admin
    const isAdminRole = profile.role === 'admin_staff' || profile.role === 'super_admin';
    console.log('\n🔐 Verificación de rol:');
    console.log('   ¿Tiene rol de admin?:', isAdminRole ? 'SÍ' : 'NO');
    console.log('   Rol actual:', profile.role);

    // 3. Verificar relación con clínica si tiene clinic_id
    if (profile.clinic_id) {
      const { data: relationships } = await supabase
        .from('clinic_user_relationships')
        .select('*')
        .eq('user_id', profile.id)
        .eq('clinic_id', profile.clinic_id);

      console.log('\n🏥 Relaciones con la clínica:');
      if (relationships && relationships.length > 0) {
        relationships.forEach(rel => {
          console.log('   - Rol en clínica:', rel.role_in_clinic);
          console.log('     Activo:', rel.is_active ? 'SÍ' : 'NO');
          console.log('     Creado:', new Date(rel.created_at).toLocaleDateString());
        });
      } else {
        console.log('   No hay relaciones registradas');
      }

      // Info de la clínica
      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', profile.clinic_id)
        .single();

      if (clinic) {
        console.log('\n🏢 Información de la clínica:');
        console.log('   Nombre:', clinic.name);
        console.log('   Tipo:', clinic.type);
        console.log('   Activa:', clinic.is_active ? 'SÍ' : 'NO');
      }
    }

    // 4. Contar pacientes
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    const { data: recentPatients } = await supabase
      .from('patients')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n📊 Estadísticas de pacientes:');
    console.log('   Total de pacientes:', totalPatients || 0);
    console.log('   Pacientes recientes:', recentPatients?.length || 0);

    // 5. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('=====================================');

    const shouldShowAdminSection = isAdminRole && profile.clinic_id;

    if (shouldShowAdminSection) {
      console.log('✅ DEBERÍAS ver la sección "Pacientes de la Clínica"');
      console.log('\nPosibles razones por las que NO aparece:');
      console.log('1. El código del Dashboard no se está ejecutando correctamente');
      console.log('2. Hay un error en la detección del estado isAdmin');
      console.log('3. El componente no se está renderizando por algún error');
      console.log('\n🔧 SOLUCIÓN RÁPIDA:');
      console.log('1. Abre las herramientas de desarrollo (F12)');
      console.log('2. Ve a la consola');
      console.log('3. Ejecuta: localStorage.clear()');
      console.log('4. Recarga la página (F5)');
      console.log('5. Vuelve a iniciar sesión');
    } else {
      console.log('❌ NO deberías ver la sección de admin porque:');
      if (!isAdminRole) console.log('   - No tienes rol de admin (actual:', profile.role, ')');
      if (!profile.clinic_id) console.log('   - No tienes clínica asignada');

      console.log('\n🔧 Para solucionarlo:');
      if (!isAdminRole) {
        console.log('   Ejecuta este SQL:');
        console.log(`   UPDATE profiles SET role = 'admin_staff' WHERE id = '${profile.id}';`);
      }
      if (!profile.clinic_id) {
        console.log('   Necesitas asignar una clínica a tu perfil');
      }
    }

    // 6. Verificar si hay algún problema con la consulta
    console.log('\n🔍 Prueba de consulta directa:');
    const testQuery = await supabase
      .from('patients')
      .select(
        `
        id,
        full_name,
        phone,
        email,
        created_at,
        consultations (
          id,
          created_at
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (testQuery.error) {
      console.log('❌ Error en la consulta:', testQuery.error.message);
    } else {
      console.log('✅ La consulta funciona correctamente');
      console.log('   Registros obtenidos:', testQuery.data?.length || 0);
    }
  } catch (error) {
    console.error('❌ Error general:', error);
  }

  process.exit(0);
}

diagnoseDashboard();
