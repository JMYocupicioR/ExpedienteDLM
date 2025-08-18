#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

console.log('🔧 Corrigiendo rutas específicas que faltan...');

// Función para corregir imports específicos por tipo de archivo
function fixSpecificImports(filePath, content) {
  let modified = false;

  // Para archivos en components/ que buscan lib
  if (filePath.startsWith('src/components/')) {
    const fixes = [
      ["from '../lib/", "from '../../lib/"],
      ['from "../lib/', 'from "../../lib/'],
      ["from '../context/", "from '../../context/"],
      ['from "../context/', 'from "../../context/'],
      ["from '../components/", "from '../../components/"],
      ['from "../components/', 'from "../../components/'],
      ["from '../features/", "from '../../features/"],
      ['from "../features/', 'from "../../features/'],
    ];

    for (const [oldPath, newPath] of fixes) {
      if (content.includes(oldPath)) {
        content = content.replace(
          new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newPath
        );
        modified = true;
      }
    }
  }

  // Para archivos en pages/ que buscan lib
  if (filePath.startsWith('src/pages/')) {
    const fixes = [
      ["from '../lib/", "from '../../lib/"],
      ['from "../lib/', 'from "../../lib/'],
      ["from '../context/", "from '../../context/"],
      ['from "../context/', 'from "../../context/'],
      ["from '../components/", "from '../../components/"],
      ['from "../components/', 'from "../../components/'],
      ["from '../features/", "from '../../features/"],
      ['from "../features/', 'from "../../features/'],
    ];

    for (const [oldPath, newPath] of fixes) {
      if (content.includes(oldPath)) {
        content = content.replace(
          new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newPath
        );
        modified = true;
      }
    }
  }

  // Para archivos en hooks/shared que buscan authentication
  if (filePath.includes('src/hooks/shared/')) {
    const fixes = [
      ["from '../authentication/", "from '../../features/authentication/"],
      ['from "../authentication/', 'from "../../features/authentication/'],
    ];

    for (const [oldPath, newPath] of fixes) {
      if (content.includes(oldPath)) {
        content = content.replace(
          new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newPath
        );
        modified = true;
      }
    }
  }

  // Correcciones de context específicas
  const contextFixes = [
    ["from '../../context/ClinicContext'", "from '../../features/clinic/context/ClinicContext'"],
    ['from "../../context/ClinicContext"', 'from "../../features/clinic/context/ClinicContext"'],
    ["from '../context/ClinicContext'", "from '../features/clinic/context/ClinicContext'"],
    ['from "../context/ClinicContext"', 'from "../features/clinic/context/ClinicContext"'],
  ];

  for (const [oldPath, newPath] of contextFixes) {
    if (content.includes(oldPath)) {
      content = content.replace(
        new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        newPath
      );
      modified = true;
    }
  }

  return { content, modified };
}

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const result = fixSpecificImports(filePath, content);

    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
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
  // Buscar archivos específicos que necesitan corrección
  const files = [
    ...(await glob('src/components/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/components/**/*.tsx')),
    ...(await glob('src/pages/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/pages/**/*.tsx')),
    ...(await glob('src/hooks/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/hooks/**/*.tsx')),
    ...(await glob('src/features/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/features/**/*.tsx')),
  ];

  console.log(`📁 Encontrados ${files.length} archivos para verificar...`);

  let updatedFiles = 0;
  files.forEach(file => {
    updatedFiles += processFile(file);
  });

  console.log(`\n✨ Proceso completado!`);
  console.log(`📊 ${updatedFiles} archivos actualizados de ${files.length} archivos totales`);
}

main().catch(console.error);
