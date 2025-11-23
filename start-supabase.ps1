# Script para iniciar Supabase con migraciones corregidas
Write-Host "Iniciando Supabase..." -ForegroundColor Green

# Verificar Docker
Write-Host "Verificando Docker..." -ForegroundColor Yellow
docker --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker no está funcionando" -ForegroundColor Red
    exit 1
}

# Verificar Supabase CLI
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
supabase --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Supabase CLI no está instalado" -ForegroundColor Red
    exit 1
}

# Iniciar Supabase
Write-Host "Iniciando Supabase local..." -ForegroundColor Green
supabase start

# Verificar estado
Write-Host "Verificando estado..." -ForegroundColor Yellow
supabase status

Write-Host "Proceso completado" -ForegroundColor Green
