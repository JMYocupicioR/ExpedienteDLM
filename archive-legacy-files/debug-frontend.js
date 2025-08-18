const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosticando problema de página en blanco...\n');

// 1. Verificar que todos los archivos principales existen
const files = [
  'src/main.tsx',
  'src/App.tsx',
  'src/pages/LandingPage.tsx',
  'src/components/Logo.tsx',
  'src/components/ui/button.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/lib/supabase.ts',
  'index.html'
];

console.log('📁 Verificando archivos principales:');
files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Existe`);
  } else {
    console.log(`❌ ${file} - NO EXISTE`);
  }
});

// 2. Verificar package.json
console.log('\n📦 Verificando package.json:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Nombre: ${pkg.name}`);
  console.log(`✅ Versión: ${pkg.version}`);
  console.log('✅ Dependencias principales:');
  const mainDeps = ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'lucide-react'];
  mainDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep}: NO ENCONTRADA`);
    }
  });
}

// 3. Verificar .env
console.log('\n🔧 Verificando configuración .env:');
if (fs.existsSync('.env')) {
  console.log('✅ Archivo .env existe');
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
  console.log(`${hasSupabaseUrl ? '✅' : '❌'} VITE_SUPABASE_URL configurada`);
  console.log(`${hasSupabaseKey ? '✅' : '❌'} VITE_SUPABASE_ANON_KEY configurada`);
} else {
  console.log('❌ Archivo .env NO existe');
}

// 4. Verificar node_modules principales
console.log('\n📚 Verificando node_modules críticos:');
const criticalModules = [
  'node_modules/react',
  'node_modules/react-dom',
  'node_modules/react-router-dom',
  'node_modules/@supabase/supabase-js',
  'node_modules/lucide-react',
  'node_modules/vite'
];

criticalModules.forEach(mod => {
  if (fs.existsSync(mod)) {
    console.log(`✅ ${mod.replace('node_modules/', '')} - Instalado`);
  } else {
    console.log(`❌ ${mod.replace('node_modules/', '')} - NO INSTALADO`);
  }
});

// 5. Verificar configuración de Vite
console.log('\n⚡ Verificando configuración de Vite:');
if (fs.existsSync('vite.config.ts')) {
  console.log('✅ vite.config.ts existe');
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
  console.log('📄 Contenido del vite.config.ts:');
  console.log(viteConfig);
} else {
  console.log('❌ vite.config.ts NO existe');
}

console.log('\n🎯 Diagnóstico completado. Revisa los ❌ para identificar problemas.\n');
