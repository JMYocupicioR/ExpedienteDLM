# Configuración de Supabase para ExpedienteDLM

## 📋 Pasos para conectar a Supabase

### 1. Crear proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Anota el nombre del proyecto y la región

### 2. Obtener credenciales

1. En el dashboard de tu proyecto, ve a **Settings** → **API**
2. Copia la **Project URL** (formato: `https://tu-proyecto.supabase.co`)
3. Copia la **anon public** key

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Ejecutar migraciones

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Inicializar Supabase en el proyecto
supabase init

# Aplicar migraciones
supabase db push
```

### 5. Probar conexión

```bash
# Ejecutar el script de prueba
node test-supabase-connection.js
```

## 🔧 Comandos útiles

### Verificar estado de Supabase

```bash
supabase status
```

### Ver logs

```bash
supabase logs
```

### Resetear base de datos

```bash
supabase db reset
```

## 📊 Estructura de la base de datos

El proyecto incluye las siguientes tablas principales:

- `profiles` - Perfiles de usuarios
- `patients` - Información de pacientes
- `consultations` - Consultas médicas
- `prescriptions` - Recetas médicas
- `physical_exams` - Exámenes físicos

## 🚨 Solución de problemas

### Error: "Variables de entorno no configuradas"

- Verifica que el archivo `.env` existe en la raíz del proyecto
- Asegúrate de que las variables tengan los nombres correctos
- Reinicia el servidor de desarrollo después de crear el archivo

### Error: "URL de Supabase inválida"

- Verifica que la URL tenga el formato correcto
- Asegúrate de que incluya `https://` y `.supabase.co`

### Error: "Error de conexión"

- Verifica que las credenciales sean correctas
- Asegúrate de que el proyecto esté activo en Supabase
- Verifica la conectividad de red

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de Supabase en el dashboard
2. Verifica la documentación oficial:
   [https://supabase.com/docs](https://supabase.com/docs)
3. Consulta los issues del proyecto en GitHub
