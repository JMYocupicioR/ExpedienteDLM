# Plan Maestro: Blindaje del Backend y Consolidación de la Base de Datos

## Resumen Ejecutivo

Este documento describe la refactorización crítica del sistema de seguridad del backend, consolidando docenas de scripts SQL dispersos en dos migraciones maestras que resuelven los problemas más graves del sistema.

## Problemas Resueltos

### 1. Caos en las Políticas de Seguridad (RLS)
- **Antes:** Más de 30 scripts SQL dispersos intentando parchear las políticas
- **Ahora:** Un único script maestro que define todas las políticas de forma coherente

### 2. Sincronización Manual de Perfiles
- **Antes:** Scripts manuales propensos a fallos para sincronizar auth.users con profiles
- **Ahora:** Triggers automáticos que garantizan la sincronización instantánea

## Archivos Creados

### 1. `supabase/migrations/20250817120000_consolidate_master_rls_policies.sql`
Consolida TODAS las políticas de seguridad del sistema en un único lugar:
- Limpia todas las políticas existentes
- Define funciones auxiliares reutilizables
- Implementa políticas coherentes para todas las tablas
- Garantiza que cada tabla tenga RLS habilitado

### 2. `supabase/migrations/20250817130000_automate_profile_creation_trigger.sql`
Automatiza la creación y sincronización de perfiles:
- Crea triggers para nuevos usuarios
- Sincroniza cambios en usuarios existentes
- Migra usuarios existentes sin perfil
- Implementa políticas RLS para la tabla profiles

## Instrucciones de Aplicación

### Paso 1: Backup Completo (CRÍTICO)

```bash
# Opción 1: Desde el dashboard de Supabase
# Ve a Settings > Database > Backups y crea un backup manual

# Opción 2: Usando pg_dump (requiere conexión directa)
pg_dump postgresql://[usuario]:[contraseña]@[host]:5432/postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Paso 2: Aplicar las Migraciones

#### Método Recomendado: Supabase CLI

```bash
# Asegúrate de estar conectado a tu proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar las migraciones
supabase db push

# Verificar el estado
supabase migration list
```

#### Método Alternativo: Script Automatizado

```bash
# Instalar dependencias si es necesario
npm install

# Ejecutar el script de aplicación
node apply-master-security-refactor.js
```

#### Método Manual: Dashboard de Supabase

1. Ve a SQL Editor en tu dashboard de Supabase
2. Abre `supabase/migrations/20250817120000_consolidate_master_rls_policies.sql`
3. Copia y ejecuta el contenido completo
4. Repite con `supabase/migrations/20250817130000_automate_profile_creation_trigger.sql`

### Paso 3: Verificación

Ejecuta estas consultas en el SQL Editor para verificar:

```sql
-- Verificar que todas las tablas tienen RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('patients', 'clinics', 'profiles', 'consultations', 'prescriptions');

-- Verificar usuarios sin perfil
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Verificar que los triggers existen
SELECT tgname 
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');
```

### Paso 4: Pruebas de Integración

1. **Crear un nuevo usuario**: Verifica que se crea automáticamente su perfil
2. **Acceso a datos**: Verifica que los usuarios solo ven datos de su clínica
3. **Permisos de admin**: Verifica que los admins pueden gestionar su clínica

### Paso 5: Limpieza (Opcional pero Recomendado)

Una vez verificado que todo funciona correctamente:

```bash
# Revisar la lista de archivos obsoletos
cat OBSOLETE_FILES_TO_DELETE.md

# Eliminar archivos obsoletos (PowerShell)
# ADVERTENCIA: Asegúrate de tener un backup antes
./cleanup-obsolete-files.ps1
```

## Rollback en Caso de Problemas

Si algo sale mal:

1. **Restaurar desde backup**:
   ```sql
   -- En el dashboard de Supabase, usa la opción de restaurar backup
   -- O con pg_restore si usaste pg_dump
   ```

2. **Revertir migraciones específicas**:
   ```bash
   supabase migration repair --status reverted 20250817120000
   supabase migration repair --status reverted 20250817130000
   ```

## Beneficios Obtenidos

1. **Seguridad Mejorada**: Políticas coherentes y auditables
2. **Mantenibilidad**: Todo el código de seguridad en 2 archivos
3. **Confiabilidad**: Sincronización automática sin intervención manual
4. **Performance**: Funciones optimizadas y sin recursión
5. **Escalabilidad**: Fácil agregar nuevas políticas siguiendo el patrón

## Mejores Prácticas para el Futuro

1. **Nunca modificar políticas directamente**: Siempre usar migraciones
2. **Documentar cambios**: Cada migración debe explicar qué hace y por qué
3. **Probar en staging**: Siempre probar migraciones en un entorno de prueba
4. **Mantener backups**: Hacer backups antes de cualquier cambio estructural

## Conclusión

Esta refactorización elimina años de deuda técnica y establece una base sólida para el crecimiento futuro del sistema. El backend ahora es más seguro, más fácil de mantener y menos propenso a errores humanos.
