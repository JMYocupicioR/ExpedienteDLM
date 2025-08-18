# Archivos Obsoletos para Eliminar

Basado en el análisis del repositorio y la implementación de los nuevos scripts de migración consolidados, los siguientes archivos ahora son obsoletos y pueden ser eliminados de forma segura después de aplicar las nuevas migraciones:

## Archivos SQL de Políticas RLS (Ahora consolidados en `20250817120000_consolidate_master_rls_policies.sql`)

### Scripts de Políticas y Permisos:
- `CHECK_AND_FIX_POLICIES.sql` - Parches de políticas ahora consolidados
- `RLS_FIX_FINAL.sql` - Intento de corrección de RLS ahora obsoleto
- `ENHANCED_RLS_POLICIES.sql` - Políticas mejoradas ahora integradas
- `FINAL_RLS_MIGRATION.sql` - Migración final de RLS reemplazada
- `LIMPIAR_POLITICAS_COMPLETAMENTE.sql` - Limpieza de políticas ahora automatizada
- `LIMPIEZA_COMPLETA_RLS.sql` - Script de limpieza RLS obsoleto
- `SISTEMA_PERMISOS_CLINICAS.sql` - Permisos de clínicas ahora en el script maestro
- `FIX_RECURSION_FINAL.sql` - Corrección de recursión ahora integrada
- `FIX_RECURSION_SAFE.sql` - Versión segura de corrección obsoleta

### Scripts de Migración Multi-clínica:
- `APLICAR_MIGRACION_MULTICLINICA.sql` - Migración ahora consolidada
- `MIGRACION_DEFINITIVA_MULTICLINICA.sql` - Versión definitiva obsoleta
- `MIGRACION_FINAL_MULTICLINICA.sql` - Migración final reemplazada
- `MIGRACION_FINAL_SOLUCION.sql` - Solución final ahora integrada
- `MIGRACION_MULTICLINICA_CORREGIDA.sql` - Versión corregida obsoleta

## Archivos de Sincronización de Perfiles (Ahora automatizados con trigger en `20250817130000_automate_profile_creation_trigger.sql`)

### Scripts SQL:
- `SYNC_AUTH_PROFILES_MIGRATION.sql` - Sincronización manual ahora automatizada
- `ENHANCED_AUTH_MIGRATION.sql` - Migración de auth mejorada obsoleta
- `FIXED_SYNC_MIGRATION.sql` - Sincronización corregida ahora con trigger
- `QUICK_SYNC_MIGRATION.sql` - Sincronización rápida obsoleta
- `create-profile-function.sql` - Función de creación ahora en el trigger
- `CORREGIR_ROL_ADMIN.sql` - Corrección de roles ahora automatizada
- `CORREGIR_ROL_PERFIL.sql` - Corrección de perfiles obsoleta
- `LIMPIAR_USUARIOS_HUERFANOS.sql` - Limpieza ahora automatizada
- `create-admin-profile.sql` - Creación manual de admin obsoleta

### Scripts JS/CJS para aplicar migraciones:
- `apply-auth-sync-migration.js` - Aplicación manual obsoleta
- `apply-auth-sync-migration.cjs` - Versión CommonJS obsoleta
- `apply-profile-function.cjs` - Aplicación de función obsoleta
- `apply-enhanced-auth-migration.js` - Migración mejorada obsoleta
- `cleanup-orphan-users.cjs` - Limpieza manual ahora automatizada
- `debug-profiles-issue.cjs` - Debug de perfiles ya no necesario

## Otros Scripts de Aplicación Manual (Usar Supabase CLI en su lugar)

### Scripts de Migración:
- `apply-all-migrations.js` - Usar `supabase db push` en su lugar
- `apply-migrations.js` - Script de aplicación obsoleto
- `apply-migrations-pg.js` - Versión PostgreSQL obsoleta
- `simple-migration.js` - Migración simple obsoleta
- `apply-multi-clinic-migration.js` - Migración multi-clínica obsoleta
- `apply-clinical-rules-migration.js` - Aplicación de reglas clínicas
- `apply-activity-logs.js` - Logs de actividad
- `apply-curp-migrations.js` - Migraciones CURP
- `apply-enhanced-appointment-system.js` - Sistema de citas
- `apply-prescription-fixes.js` - Correcciones de prescripciones
- `apply-staff-approval-migration.js` - Aprobación de staff
- `apply-templates-migration.js` - Migración de plantillas

### Scripts de Verificación y Debug:
- `final-verification.js` - Verificación final obsoleta
- `final-verification.cjs` - Versión CommonJS obsoleta
- `verify-migrations.js` - Usar `supabase migration list` en su lugar
- `check-migration-status.js` - Estado de migración obsoleto
- `emergency-policy-cleanup.js` - Limpieza de emergencia obsoleta

## Scripts SQL de Datos de Ejemplo y Configuración Manual

- `CREAR_CLINICAS_EJEMPLO.sql` - Datos de ejemplo, usar seeds en su lugar
- `asociar-admin-con-clinica.sql` - Asociación manual obsoleta
- `EXPANDIR_TABLA_CLINICAS.sql` - Expansión de tabla ya aplicada
- `ADD_MORE_MEDICAL_SPECIALTIES.sql` - Especialidades médicas
- `populate-medical-specialties.sql` - Población de especialidades
- `SINCRONIZAR_CLINICAS_USUARIO.sql` - Sincronización manual obsoleta

## Scripts de Verificación y Diagnóstico

- `VERIFICAR_ESTADO_ACTUAL.sql` - Verificación de estado obsoleta
- `VERIFICAR_ESTADO_ACTUAL_SIMPLE.sql` - Versión simple obsoleta
- `verificar-estado-actual.sql` - Minúsculas, duplicado
- `VERIFICAR_ROL_USUARIO.sql` - Verificación de rol obsoleta
- `verificar-y-crear-clinicas.sql` - Verificación y creación obsoleta
- `DIAGNOSTICAR_EMAIL_DUPLICADO.sql` - Diagnóstico de emails obsoleto
- `LIMPIAR_EMAIL_ESPECIFICO.sql` - Limpieza específica obsoleta

## Scripts de Configuración Manual (Ahora en migraciones)

- `setup-supabase-storage.sql` - Configuración de storage
- `CREATE_PHYSICAL_EXAMS_TABLE.sql` - Creación de tabla
- `MEDICAL_TEMPLATES_MIGRATION.sql` - Migración de plantillas
- `PROFILE_PHOTOS_CLEAN_FIX.sql` - Corrección de fotos de perfil
- `SIMPLE_PROFILE_PHOTOS_FIX.sql` - Corrección simple de fotos

## Archivos de Testing Obsoletos

- `test-auth-users.js` - Testing manual de usuarios
- `test-auth.js` - Testing de autenticación
- `test-email-flow.js` - Flujo de email
- `test-email-registration.js` - Registro por email
- `test-email-verification.js` - Verificación de email
- `test-enhanced-auth-system.js` - Sistema auth mejorado
- `test-patient-creation.js` - Creación de pacientes
- `test-env-vars.html` - Variables de entorno
- `test-page.html` - Página de prueba
- `test-simple.html` - Prueba simple

## Scripts de Utilidad Obsoletos

- `check-admin-status.js` - Estado de admin
- `check-all-users.js` - Verificación de usuarios
- `check-specialties.js` - Verificación de especialidades
- `check-storage-setup.js` - Configuración de storage
- `debug-app.js` - Debug de aplicación
- `debug-email-verification.js` - Debug de email
- `debug-frontend.js` - Debug de frontend
- `diagnose-admin-dashboard.js` - Diagnóstico de dashboard
- `insert-test-email.js` - Inserción de email de prueba
- `backup_before_migrations_.sql` - Backup manual (usar Supabase dashboard)

## Archivos de Configuración que NO deben eliminarse

**MANTENER ESTOS ARCHIVOS:**
- Todos los archivos en `supabase/migrations/` (nuevas migraciones)
- Archivos de configuración del proyecto (`package.json`, `tsconfig.json`, etc.)
- Archivos de configuración de herramientas (`eslint.config.js`, `vite.config.ts`, etc.)
- Scripts de setup útiles (`setup-env-variables.js`, `setup-email-confirmation.js`, etc.)
- Documentación importante (archivos `.md` en carpetas de documentación)
- Archivos de conexión activos (`link-supabase.js`, `check-supabase-status.js`)

## Recomendaciones

1. **Antes de eliminar:** Asegúrate de haber aplicado exitosamente las nuevas migraciones consolidadas.
2. **Backup:** Realiza un backup completo del proyecto antes de eliminar archivos.
3. **Verificación:** Prueba que el sistema funcione correctamente sin estos archivos.
4. **Documentación:** Actualiza el README.md para reflejar el nuevo proceso de migración.

## Comando para eliminar (PowerShell)

```powershell
# ADVERTENCIA: Este comando eliminará permanentemente los archivos
# Asegúrate de tener un backup antes de ejecutarlo

$filesToDelete = @(
    "CHECK_AND_FIX_POLICIES.sql",
    "RLS_FIX_FINAL.sql",
    "ENHANCED_RLS_POLICIES.sql",
    "FINAL_RLS_MIGRATION.sql",
    "LIMPIAR_POLITICAS_COMPLETAMENTE.sql",
    "LIMPIEZA_COMPLETA_RLS.sql",
    "SISTEMA_PERMISOS_CLINICAS.sql",
    "FIX_RECURSION_FINAL.sql",
    "FIX_RECURSION_SAFE.sql",
    "APLICAR_MIGRACION_MULTICLINICA.sql",
    "MIGRACION_DEFINITIVA_MULTICLINICA.sql",
    "MIGRACION_FINAL_MULTICLINICA.sql",
    "MIGRACION_FINAL_SOLUCION.sql",
    "MIGRACION_MULTICLINICA_CORREGIDA.sql",
    "SYNC_AUTH_PROFILES_MIGRATION.sql",
    "ENHANCED_AUTH_MIGRATION.sql",
    "FIXED_SYNC_MIGRATION.sql",
    "QUICK_SYNC_MIGRATION.sql",
    "create-profile-function.sql",
    "CORREGIR_ROL_ADMIN.sql",
    "CORREGIR_ROL_PERFIL.sql",
    "LIMPIAR_USUARIOS_HUERFANOS.sql",
    "create-admin-profile.sql",
    "apply-auth-sync-migration.js",
    "apply-auth-sync-migration.cjs",
    "apply-profile-function.cjs",
    "apply-enhanced-auth-migration.js",
    "cleanup-orphan-users.cjs",
    "debug-profiles-issue.cjs",
    "apply-all-migrations.js",
    "apply-migrations.js",
    "apply-migrations-pg.js",
    "simple-migration.js",
    "apply-multi-clinic-migration.js",
    "apply-clinical-rules-migration.js",
    "apply-activity-logs.js",
    "apply-curp-migrations.js",
    "apply-enhanced-appointment-system.js",
    "apply-prescription-fixes.js",
    "apply-staff-approval-migration.js",
    "apply-templates-migration.js",
    "final-verification.js",
    "final-verification.cjs",
    "verify-migrations.js",
    "check-migration-status.js",
    "emergency-policy-cleanup.js",
    "CREAR_CLINICAS_EJEMPLO.sql",
    "asociar-admin-con-clinica.sql",
    "EXPANDIR_TABLA_CLINICAS.sql",
    "ADD_MORE_MEDICAL_SPECIALTIES.sql",
    "populate-medical-specialties.sql",
    "SINCRONIZAR_CLINICAS_USUARIO.sql",
    "VERIFICAR_ESTADO_ACTUAL.sql",
    "VERIFICAR_ESTADO_ACTUAL_SIMPLE.sql",
    "verificar-estado-actual.sql",
    "VERIFICAR_ROL_USUARIO.sql",
    "verificar-y-crear-clinicas.sql",
    "DIAGNOSTICAR_EMAIL_DUPLICADO.sql",
    "LIMPIAR_EMAIL_ESPECIFICO.sql",
    "setup-supabase-storage.sql",
    "CREATE_PHYSICAL_EXAMS_TABLE.sql",
    "MEDICAL_TEMPLATES_MIGRATION.sql",
    "PROFILE_PHOTOS_CLEAN_FIX.sql",
    "SIMPLE_PROFILE_PHOTOS_FIX.sql",
    "test-auth-users.js",
    "test-auth.js",
    "test-email-flow.js",
    "test-email-registration.js",
    "test-email-verification.js",
    "test-enhanced-auth-system.js",
    "test-patient-creation.js",
    "test-env-vars.html",
    "test-page.html",
    "test-simple.html",
    "check-admin-status.js",
    "check-all-users.js",
    "check-specialties.js",
    "check-storage-setup.js",
    "debug-app.js",
    "debug-email-verification.js",
    "debug-frontend.js",
    "diagnose-admin-dashboard.js",
    "insert-test-email.js",
    "backup_before_migrations_.sql"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Eliminado: $file" -ForegroundColor Green
    } else {
        Write-Host "No encontrado: $file" -ForegroundColor Yellow
    }
}
```
