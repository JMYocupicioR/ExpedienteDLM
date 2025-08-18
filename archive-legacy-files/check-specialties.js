import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZWxicnpqcm1qeHBqeGxseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNDQ1NDUsImV4cCI6MjA2MjkyMDU0NX0.YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpecialties() {
  console.log('🔍 Verificando especialidades actuales...');
  
  try {
    const { data, error } = await supabase
      .from('medical_specialties')
      .select('name, category')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log(`✅ Especialidades encontradas: ${data.length}`);
    console.log('\n📋 Lista actual:');
    
    const groupedByCategory = {};
    data.forEach(spec => {
      if (!groupedByCategory[spec.category]) {
        groupedByCategory[spec.category] = [];
      }
      groupedByCategory[spec.category].push(spec.name);
    });
    
    Object.keys(groupedByCategory).forEach(category => {
      console.log(`\n📁 ${category.toUpperCase()}:`);
      groupedByCategory[category].forEach(name => {
        console.log(`  - ${name}`);
      });
    });
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

checkSpecialties();
