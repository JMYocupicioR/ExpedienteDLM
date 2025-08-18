# Script para aplicar la migración maestra de seguridad directamente
# Este script evita los problemas de sincronización de migraciones

Write-Host "🚀 Aplicando Migración Maestra de Seguridad" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Verificar que el archivo existe
$migrationFile = "MASTER_SECURITY_REFACTOR_READY_TO_APPLY.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo de migración: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo de migración encontrado: $migrationFile" -ForegroundColor Green
Write-Host "📏 Tamaño del archivo: $((Get-Item $migrationFile).Length) bytes" -ForegroundColor Yellow

# Advertencia importante
Write-Host "`n⚠️  ADVERTENCIA IMPORTANTE:" -ForegroundColor Red
Write-Host "   - Asegúrate de haber hecho un BACKUP COMPLETO de la base de datos" -ForegroundColor Red
Write-Host "   - Esta migración reemplazará TODAS las políticas de seguridad existentes" -ForegroundColor Red
Write-Host "   - Se recomienda probar primero en un entorno de staging" -ForegroundColor Red

Write-Host "`n📋 INSTRUCCIONES PARA APLICAR LA MIGRACIÓN:" -ForegroundColor Cyan
Write-Host "   1. Ve al dashboard de Supabase: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   2. Selecciona tu proyecto: ExpedienteDLM" -ForegroundColor White
Write-Host "   3. Ve a SQL Editor" -ForegroundColor White
Write-Host "   4. Copia y pega el contenido del archivo: $migrationFile" -ForegroundColor White
Write-Host "   5. Ejecuta el script completo" -ForegroundColor White

Write-Host "`n🔍 VERIFICACIÓN POST-MIGRACIÓN:" -ForegroundColor Cyan
Write-Host "   Ejecuta estas consultas en el SQL Editor para verificar:" -ForegroundColor White
Write-Host "   " -ForegroundColor White
Write-Host "   -- Verificar que todas las tablas tienen RLS habilitado" -ForegroundColor Gray
Write-Host "   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('patients', 'clinics', 'profiles', 'consultations', 'prescriptions');" -ForegroundColor Gray
Write-Host "   " -ForegroundColor White
Write-Host "   -- Verificar usuarios sin perfil" -ForegroundColor Gray
Write-Host "   SELECT au.id, au.email FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id WHERE p.id IS NULL;" -ForegroundColor Gray
Write-Host "   " -ForegroundColor White
Write-Host "   -- Verificar que los triggers existen" -ForegroundColor Gray
Write-Host "   SELECT tgname FROM pg_trigger WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');" -ForegroundColor Gray

Write-Host "`n📝 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "   1. Verifica que la aplicación funcione correctamente" -ForegroundColor White
Write-Host "   2. Revisa los logs de Supabase para cualquier error" -ForegroundColor White
Write-Host "   3. Ejecuta pruebas de integración" -ForegroundColor White
Write-Host "   4. Si todo funciona bien, procede a eliminar los archivos obsoletos" -ForegroundColor White
Write-Host "      (ver OBSOLETE_FILES_TO_DELETE.md)" -ForegroundColor White

Write-Host "`n✅ ¡Migración lista para aplicar!" -ForegroundColor Green
Write-Host "   Archivo: $migrationFile" -ForegroundColor Yellow
