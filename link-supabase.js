import { execSync } from 'child_process';

// Configuración de Supabase
const PROJECT_REF = 'qcelbrzjrmjxpjxllyhk';
const DB_PASSWORD = 'Yp7@Q3DbJd9YwTr';

console.log('🔗 Vinculando proyecto con Supabase...\n');

try {
  // Crear archivo de configuración temporal
  const configContent = `[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
port = 54327
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
refresh_token_rotation_enabled = true
security_update_password_require_reauthentication = true

[realtime]
enabled = true
port = 54328

[edge_runtime]
enabled = true
port = 54329
`;

  // Escribir configuración
  const fs = await import('fs');
  fs.writeFileSync('supabase/config.toml', configContent);
  
  console.log('✅ Configuración creada');
  
  // Intentar vincular usando variables de entorno
  const env = {
    ...process.env,
    SUPABASE_DB_PASSWORD: DB_PASSWORD
  };
  
  console.log('🔄 Intentando vincular proyecto...');
  
  const result = execSync(`npx supabase link --project-ref ${PROJECT_REF}`, {
    env,
    input: DB_PASSWORD + '\n',
    encoding: 'utf8'
  });
  
  console.log('✅ Proyecto vinculado exitosamente');
  console.log(result);
  
} catch (error) {
  console.log('❌ Error vinculando proyecto:', error.message);
  console.log('\n💡 Método alternativo:');
  console.log('1. Ve al dashboard de Supabase:');
  console.log('   https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk');
  console.log('2. Ve a Settings → Database');
  console.log('3. Copia la cadena de conexión');
  console.log('4. Aplica las migraciones manualmente en el SQL Editor');
} 