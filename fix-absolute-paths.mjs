#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

console.log('🔧 Corrigiendo rutas absolutas mal generadas...');

// Mapeo de correcciones específicas
const corrections = [
  // Errores de rutas duplicadas o incorrectas
  ['@/features/lib/', '@/lib/'],
  ['@/features/features/', '@/features/'],
  ['@/hooks/authentication/', '@/features/authentication/'],
  ['@/features/prescriptions/authentication/', '@/features/authentication/'],
  ['@/features/appointments/authentication/', '@/features/authentication/'],
  ['@/features/medical-templates/authentication/', '@/features/authentication/'],

  // Correcciones específicas que observé en el output
  [
    '@/features/medical-records/hooks/useValidation',
    '@/features/medical-records/hooks/useValidation',
  ],
  [
    '@/features/medical-templates/hooks/useTemplates',
    '@/features/medical-templates/hooks/useTemplates',
  ],
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [incorrectPath, correctPath] of corrections) {
      if (content.includes(incorrectPath)) {
        content = content.replace(
          new RegExp(incorrectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          correctPath
        );
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corregido: ${filePath}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  const files = [
    ...(await glob('src/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/**/*.tsx')),
  ];

  console.log(`📁 Verificando ${files.length} archivos...`);

  let fixedFiles = 0;
  files.forEach(file => {
    fixedFiles += fixFile(file);
  });

  console.log(`\n✨ Corrección completada!`);
  console.log(`📊 ${fixedFiles} archivos corregidos`);
}

main().catch(console.error);
