#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

console.log('🔧 Corrigiendo rutas de importación en features...');

// Mapeo de rutas incorrectas a correctas para archivos en features/
const featureImportMappings = {
  // Desde features/ a lib/ (necesita ../../)
  "'../lib/supabase'": "'../../lib/supabase'",
  "'../lib/database.types'": "'../../lib/database.types'",
  "'../lib/medicalConfig'": "'../../lib/medicalConfig'",
  "'../lib/validation'": "'../../lib/validation'",
  "'../lib/services/appointment-service'": "'../../lib/services/appointment-service'",
  "'../lib/services/enhanced-appointment-service'":
    "'../../lib/services/enhanced-appointment-service'",
  "'../lib/services/notification-service'": "'../../lib/services/notification-service'",

  // Desde features/ a context/ (necesita ../../)
  "'../context/ClinicContext'": "'../../context/ClinicContext'",

  // Desde features/ a otros features/
  "'../authentication/hooks/useAuth'": "'../authentication/hooks/useAuth'",

  // Correcciones específicas para components/
  "'../hooks/shared/useActivityLog'": "'../../hooks/shared/useActivityLog'",
  "'../../lib/services/enhanced-appointment-service'":
    "'../../lib/services/enhanced-appointment-service'",
  "'../../lib/services/appointment-service'": "'../../lib/services/appointment-service'",
  "'../lib/database.types'": "'../../lib/database.types'",
  "'../components/shared/Logo'": "'../../components/shared/Logo'",
  "'../components/shared/MedicalDataTable'": "'../../components/shared/MedicalDataTable'",
  "'../components/shared/PhotoUploader'": "'../../components/shared/PhotoUploader'",
  "'../components/shared/ActivityFeed'": "'../../components/shared/ActivityFeed'",
  "'../features/patients/components/NewPatientForm'":
    "'../../features/patients/components/NewPatientForm'",
  "'../features/authentication/components/OAuthButtons'":
    "'../../features/authentication/components/OAuthButtons'",
  "'../features/appointments/components/AppointmentsCalendar'":
    "'../../features/appointments/components/AppointmentsCalendar'",
  "'../features/medical-templates/components/TemplateEditor'":
    "'../../features/medical-templates/components/TemplateEditor'",
  "'../context/ClinicContext'": "'../../context/ClinicContext'",
};

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Aplicar cada mapeo
    for (const [oldImport, newImport] of Object.entries(featureImportMappings)) {
      if (content.includes(oldImport)) {
        content = content.replace(
          new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newImport
        );
        modified = true;
      }
    }

    // Guardar archivo si fue modificado
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  // Buscar todos los archivos TypeScript/JavaScript en features, components y pages
  const files = [
    ...(await glob('src/features/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/features/**/*.tsx')),
    ...(await glob('src/components/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/components/**/*.tsx')),
    ...(await glob('src/pages/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/pages/**/*.tsx')),
    ...(await glob('src/hooks/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/hooks/**/*.tsx')),
    ...(await glob('src/App.tsx')),
  ];

  console.log(`📁 Encontrados ${files.length} archivos para procesar...`);

  let updatedFiles = 0;
  files.forEach(file => {
    updatedFiles += processFile(file);
  });

  console.log(`\n✨ Proceso completado!`);
  console.log(`📊 ${updatedFiles} archivos actualizados de ${files.length} archivos totales`);

  if (updatedFiles > 0) {
    console.log(`\n🔍 Siguiente paso: ejecuta 'npm run typecheck' para verificar los cambios`);
  }
}

main().catch(console.error);
