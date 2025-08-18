# Instrucciones para Aplicar Migraciones - ExpedienteDLM

## 🎯 Estado Actual
- ✅ **Servidor de desarrollo**: Ejecutándose en http://localhost:5173
- ✅ **Conexión a Supabase**: Funcionando correctamente
- ⚠️ **Base de datos**: Necesita migraciones aplicadas

## 📋 Pasos para Aplicar Migraciones

### 1. Acceder al SQL Editor de Supabase
- **URL**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql
- **Navegador**: Ya abierto automáticamente

### 2. Aplicar Migraciones en Orden

#### Migración 1: Esquema Inicial Completo
**Archivo**: `00000000000000_initial_schema_complete.sql` (1062 líneas)

1. Abre el archivo: `supabase/migrations/00000000000000_initial_schema_complete.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta la consulta

#### Migración 2: Mejoras del Sistema
**Archivo**: `20250729191009_fragrant_feather.sql` (402 líneas)

1. Abre el archivo: `supabase/migrations/20250729191009_fragrant_feather.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta la consulta

#### Migración 3: Ajustes Finales
**Archivo**: `20250729191309_tight_waterfall.sql` (33 líneas)

1. Abre el archivo: `supabase/migrations/20250729191309_tight_waterfall.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta la consulta

### 3. Verificar la Aplicación

Después de aplicar todas las migraciones, ejecuta:

```bash
node simple-migration.js
```

Deberías ver:
```
✅ Tabla profiles: Existe y accesible
✅ Tabla patients: Existe y accesible
✅ Tabla consultations: Existe y accesible
✅ Tabla prescriptions: Existe y accesible
✅ Tabla physical_exams: Existe y accesible
```

## 🗄️ Estructura de la Base de Datos

### Tablas Principales:
- **`profiles`** - Perfiles de usuarios médicos
- **`patients`** - Información de pacientes
- **`consultations`** - Consultas médicas
- **`prescriptions`** - Recetas médicas
- **`physical_exams`** - Exámenes físicos

### Funcionalidades Incluidas:
- ✅ Sistema de autenticación completo
- ✅ RLS (Row Level Security) configurado
- ✅ Validaciones de datos
- ✅ Triggers automáticos
- ✅ Funciones auxiliares
- ✅ Índices optimizados

## 🔧 Comandos Útiles

### Verificar estado actual:
```bash
node simple-migration.js
```

### Probar conexión:
```bash
node setup-supabase.js
```

### Iniciar servidor de desarrollo:
```bash
npm run dev
```

## 📞 Enlaces Importantes

- **Dashboard de Supabase**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
- **SQL Editor**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql
- **Table Editor**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor
- **Aplicación**: http://localhost:5173

## 🚨 Solución de Problemas

### Error: "relation already exists"
- Las tablas ya existen, puedes saltarte esa migración
- O eliminar las tablas existentes primero

### Error: "permission denied"
- Verifica que estés usando las credenciales correctas
- Asegúrate de estar en el proyecto correcto

### Error: "syntax error"
- Verifica que hayas copiado todo el contenido del archivo
- Asegúrate de no haber modificado el SQL

## 🎉 Estado Final Esperado

Una vez completadas las migraciones:
1. ✅ Todas las tablas creadas y accesibles
2. ✅ Sistema de autenticación funcionando
3. ✅ Aplicación completamente funcional
4. ✅ Base de datos lista para uso en producción 