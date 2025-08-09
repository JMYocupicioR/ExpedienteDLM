import { readFileSync } from 'fs';

console.log('🔍 Debugging ExpedienteDLM Application...\n');

// Verificar que estamos en el navegador
if (typeof window !== 'undefined') {
  console.log('✅ Ejecutando en navegador');
} else {
  console.log('❌ No ejecutando en navegador');
}

// Verificar que React está disponible
if (typeof React !== 'undefined') {
  console.log('✅ React está disponible');
} else {
  console.log('❌ React no está disponible');
}

// Verificar que ReactDOM está disponible
if (typeof ReactDOM !== 'undefined') {
  console.log('✅ ReactDOM está disponible');
} else {
  console.log('❌ ReactDOM no está disponible');
}

// Verificar que el elemento root existe
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('✅ Elemento root encontrado:', rootElement);
} else {
  console.log('❌ Elemento root no encontrado');
}

// Verificar errores en la consola
window.addEventListener('error', (event) => {
  console.error('🚨 Error detectado:', event.error);
  console.error('📄 Archivo:', event.filename);
  console.error('📍 Línea:', event.lineno);
  console.error('📍 Columna:', event.colno);
});

// Verificar errores no capturados
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Promesa rechazada no capturada:', event.reason);
});

// Verificar que las variables de entorno están disponibles
console.log('\n📋 Variables de entorno:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada');

// Verificar que los estilos se están cargando
const styles = document.styleSheets;
console.log('\n🎨 Estilos cargados:', styles.length);

// Verificar que no hay elementos ocultos
const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
console.log('👻 Elementos ocultos:', hiddenElements.length);

// Verificar el contenido del body
console.log('\n📄 Contenido del body:');
console.log('Elementos hijos:', document.body.children.length);
console.log('HTML:', document.body.innerHTML.substring(0, 200) + '...');

console.log('\n🔍 Debug completado'); 