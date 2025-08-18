#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

console.log('🚀 Convirtiendo a importaciones absolutas usando @/...');

// Función para convertir rutas relativas a absolutas
function convertToAbsolute(filePath, content) {
  let modified = false;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Buscar líneas de import que usen rutas relativas hacia src/
    const importMatch = line.match(/(import.*from\s+['"])([\.\/]+)(.*?)(['"])/);

    if (importMatch) {
      const [fullMatch, beforePath, relativePath, restPath, afterQuote] = importMatch;

      // Solo procesar si la ruta apunta hacia src o sus subdirectorios
      if (relativePath.includes('./') || relativePath.includes('../')) {
        // Calcular la ruta absoluta desde src/
        const currentDir = path.dirname(filePath);
        const targetPath = path.resolve(currentDir, relativePath + restPath);
        const srcPath = path.resolve('src');

        // Si el target está dentro de src/, convertir a ruta absoluta
        if (targetPath.startsWith(srcPath)) {
          const relativeToSrc = path.relative(srcPath, targetPath).replace(/\\/g, '/');
          const newLine = line.replace(fullMatch, `${beforePath}@/${relativeToSrc}${afterQuote}`);

          if (newLine !== line) {
            lines[i] = newLine;
            modified = true;
            console.log(`  📝 ${filePath}: ${relativePath}${restPath} → @/${relativeToSrc}`);
          }
        }
      }
    }
  }

  return { content: lines.join('\n'), modified };
}

// Función para procesar un archivo
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = convertToAbsolute(filePath, content);

    if (result.modified) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  // Buscar todos los archivos TypeScript/JavaScript
  const files = [
    ...(await glob('src/**/*.ts', { ignore: 'src/**/*.d.ts' })),
    ...(await glob('src/**/*.tsx')),
    ...(await glob('src/**/*.js')),
    ...(await glob('src/**/*.jsx')),
  ];

  console.log(`📁 Encontrados ${files.length} archivos para convertir...`);

  let updatedFiles = 0;
  for (const file of files) {
    updatedFiles += processFile(file);
  }

  console.log(`\n✨ Conversión completada!`);
  console.log(`📊 ${updatedFiles} archivos actualizados de ${files.length} archivos totales`);

  if (updatedFiles > 0) {
    console.log(`\n🔍 Siguiente paso: ejecuta 'npm run typecheck' para verificar los cambios`);
  }
}

main().catch(console.error);
