import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qcelbrzjrmjxpjxllyhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0MDU0MjIsImV4cCI6MjA0MDk4MTQyMn0.Z4CR0yF1N2pE1Vt-1k0xg_M5LrDM3x56JcBZe8hP2VY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAdminStatus() {
  console.log('🔍 Verificando estado de administrador...\n');

  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      console.log('Por favor, inicia sesión primero');
      return;
    }

    console.log('✅ Usuario autenticado:', user.email);
    console.log('   ID:', user.id);

    // Obtener perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, clinic_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError);
      return;
    }

    console.log('\n📋 Información del perfil:');
    console.log('   Nombre:', profile.full_name || 'No especificado');
    console.log('   Rol:', profile.role || 'No especificado');
    console.log('   Clínica ID:', profile.clinic_id || 'No asignada');

    // Verificar si es admin
    const isAdmin = profile.role === 'admin_staff' || profile.role === 'super_admin';
    console.log('\n🔐 ¿Es administrador?:', isAdmin ? 'SÍ' : 'NO');

    if (profile.clinic_id) {
      // Verificar relación con la clínica
      const { data: relationship } = await supabase
        .from('clinic_user_relationships')
        .select('role_in_clinic, is_active')
        .eq('user_id', user.id)
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();

      if (relationship) {
        console.log('\n🏥 Relación con la clínica:');
        console.log('   Rol en clínica:', relationship.role_in_clinic);
        console.log('   Activo:', relationship.is_active ? 'SÍ' : 'NO');
      }

      // Obtener información de la clínica
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name, type')
        .eq('id', profile.clinic_id)
        .single();

      if (clinic) {
        console.log('\n🏥 Información de la clínica:');
        console.log('   Nombre:', clinic.name);
        console.log('   Tipo:', clinic.type);
      }
    }

    // Contar pacientes
    const { count: patientCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact' });

    console.log('\n📊 Total de pacientes en el sistema:', patientCount || 0);

    if (!isAdmin) {
      console.log('\n⚠️  Para ver la sección de administración en el Dashboard:');
      console.log('1. Ve a Configuración');
      console.log('2. Activa el toggle "Soy administrador de esta clínica"');
      console.log('3. Guarda los cambios');
      console.log('4. Recarga la página del Dashboard');
    } else {
      console.log('\n✅ Deberías poder ver la sección de "Pacientes de la Clínica" en el Dashboard');
      console.log('Si no la ves, intenta recargar la página (F5)');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }

  process.exit(0);
}

checkAdminStatus();
