const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_') || supabaseKey.includes('YOUR_')) {
  console.error('❌ Por favor configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleClinics = [
  {
    name: 'Hospital General San José',
    type: 'hospital',
    address: 'Av. Insurgentes Sur 123, Col. Centro, CDMX',
    phone: '+52 55 1234 5678',
    email: 'contacto@hospitalsanjose.com',
    website: 'https://www.hospitalsanjose.com',
    is_active: true
  },
  {
    name: 'Clínica Especializada Santa María',
    type: 'specialist_clinic',
    address: 'Calle Reforma 456, Col. Juárez, CDMX',
    phone: '+52 55 2345 6789',
    email: 'info@clinicasantamaria.com',
    is_active: true
  },
  {
    name: 'Centro Médico Los Ángeles',
    type: 'medical_center',
    address: 'Av. Universidad 789, Col. Del Valle, CDMX',
    phone: '+52 55 3456 7890',
    email: 'contacto@centrolosangeles.com',
    website: 'https://www.centrolosangeles.com',
    is_active: true
  },
  {
    name: 'Clínica Dental Sonrisa',
    type: 'dental_clinic',
    address: 'Calle Madero 321, Col. Roma Norte, CDMX',
    phone: '+52 55 4567 8901',
    email: 'citas@clinicasonrisa.com',
    is_active: true
  },
  {
    name: 'Centro de Fisioterapia Integral',
    type: 'physiotherapy',
    address: 'Av. Patriotismo 654, Col. San Pedro de los Pinos, CDMX',
    phone: '+52 55 5678 9012',
    email: 'terapia@fisiointegral.com',
    is_active: true
  }
];

async function seedClinics() {
  try {
    console.log('🏥 Verificando clínicas existentes...');
    
    // Verificar si ya hay clínicas
    const { data: existingClinics, error: checkError } = await supabase
      .from('clinics')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error verificando clínicas:', checkError);
      return;
    }

    if (existingClinics && existingClinics.length > 0) {
      console.log('✅ Ya existen clínicas en la base de datos');
      
      // Mostrar clínicas existentes
      const { data: allClinics, error: allError } = await supabase
        .from('clinics')
        .select('name, is_active')
        .order('name');
      
      if (!allError && allClinics) {
        console.log('📋 Clínicas existentes:');
        allClinics.forEach(clinic => {
          console.log(`  - ${clinic.name} (${clinic.is_active ? 'Activa' : 'Inactiva'})`);
        });
      }
      return;
    }

    console.log('🌱 Creando clínicas de ejemplo...');
    
    // Insertar clínicas de ejemplo
    const { data: insertedClinics, error: insertError } = await supabase
      .from('clinics')
      .insert(sampleClinics)
      .select();

    if (insertError) {
      console.error('❌ Error insertando clínicas:', insertError);
      return;
    }

    console.log('✅ Clínicas creadas exitosamente:');
    insertedClinics.forEach(clinic => {
      console.log(`  - ${clinic.name}`);
    });

    console.log(`\n🎉 Se crearon ${insertedClinics.length} clínicas de ejemplo`);
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar el script
seedClinics();
