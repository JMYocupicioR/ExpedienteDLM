# Script para aplicar la migración de Medical Templates
# Ejecuta este script para aplicar automáticamente la migración a Supabase

Write-Host "🚀 Aplicador de Migración - Sistema de Medical Templates" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Verificar que existe el archivo de migración
$migrationFile = "supabase\migrations\20260212002000_create_medical_templates_system.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo de migración" -ForegroundColor Red
    Write-Host "   Buscado en: $migrationFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo de migración encontrado" -ForegroundColor Green
Write-Host ""

# Mostrar opciones
Write-Host "Selecciona cómo deseas aplicar la migración:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Abrir SQL Editor de Supabase en el navegador (Recomendado)" -ForegroundColor White
Write-Host "  2. Copiar SQL al portapapeles" -ForegroundColor White
Write-Host "  3. Mostrar instrucciones paso a paso" -ForegroundColor White
Write-Host "  4. Intentar aplicar con Supabase CLI" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Elige una opción (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📋 Abriendo SQL Editor de Supabase..." -ForegroundColor Cyan
        
        # Intentar leer el proyecto ref del .env
        $projectRef = $null
        if (Test-Path ".env") {
            $envContent = Get-Content ".env" -Raw
            if ($envContent -match 'VITE_SUPABASE_URL=https://([^.]+)\.supabase\.co') {
                $projectRef = $matches[1]
            }
        }
        
        if ($projectRef) {
            $sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
            Write-Host "✅ Proyecto detectado: $projectRef" -ForegroundColor Green
            Start-Process $sqlEditorUrl
        } else {
            Write-Host "⚠️  No se pudo detectar el proyecto automáticamente" -ForegroundColor Yellow
            Start-Process "https://supabase.com/dashboard"
        }
        
        Write-Host ""
        Write-Host "📝 Instrucciones:" -ForegroundColor Yellow
        Write-Host "  1. Se abrió el SQL Editor en tu navegador" -ForegroundColor White
        Write-Host "  2. Copia el contenido de:" -ForegroundColor White
        Write-Host "     $migrationFile" -ForegroundColor Cyan
        Write-Host "  3. Pégalo en el SQL Editor" -ForegroundColor White
        Write-Host "  4. Click en 'Run' (▶️)" -ForegroundColor White
        Write-Host "  5. Verifica que diga 'Success'" -ForegroundColor White
        Write-Host ""
        
        $copyChoice = Read-Host "¿Copiar SQL al portapapeles ahora? (s/n)"
        if ($copyChoice -eq "s" -or $copyChoice -eq "S") {
            Get-Content $migrationFile -Raw | Set-Clipboard
            Write-Host "✅ SQL copiado al portapapeles" -ForegroundColor Green
            Write-Host "   Presiona Ctrl+V en el SQL Editor para pegar" -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "📋 Copiando SQL al portapapeles..." -ForegroundColor Cyan
        Get-Content $migrationFile -Raw | Set-Clipboard
        Write-Host "✅ SQL copiado exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pasos siguientes:" -ForegroundColor Yellow
        Write-Host "  1. Ve a https://supabase.com/dashboard" -ForegroundColor White
        Write-Host "  2. Selecciona tu proyecto" -ForegroundColor White
        Write-Host "  3. Abre SQL Editor" -ForegroundColor White
        Write-Host "  4. Presiona Ctrl+V para pegar" -ForegroundColor White
        Write-Host "  5. Click en 'Run' (▶️)" -ForegroundColor White
    }
    
    "3" {
        Write-Host ""
        Write-Host "📖 INSTRUCCIONES PASO A PASO" -ForegroundColor Cyan
        Write-Host "=" * 60 -ForegroundColor Gray
        Write-Host ""
        Write-Host "PASO 1: Acceder a Supabase Dashboard" -ForegroundColor Yellow
        Write-Host "  • Abre: https://supabase.com/dashboard" -ForegroundColor White
        Write-Host "  • Inicia sesión si es necesario" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 2: Seleccionar tu proyecto" -ForegroundColor Yellow
        Write-Host "  • Click en el nombre de tu proyecto" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 3: Abrir SQL Editor" -ForegroundColor Yellow
        Write-Host "  • En el menú lateral, click en 'SQL Editor'" -ForegroundColor White
        Write-Host "  • Click en 'New query' o '+'" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 4: Copiar el SQL" -ForegroundColor Yellow
        Write-Host "  • Abre el archivo:" -ForegroundColor White
        Write-Host "    $migrationFile" -ForegroundColor Cyan
        Write-Host "  • Selecciona TODO el contenido (Ctrl+A)" -ForegroundColor White
        Write-Host "  • Copia (Ctrl+C)" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 5: Pegar y Ejecutar" -ForegroundColor Yellow
        Write-Host "  • Pega en el SQL Editor (Ctrl+V)" -ForegroundColor White
        Write-Host "  • Click en 'Run' o presiona Ctrl+Enter" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 6: Verificar" -ForegroundColor Yellow
        Write-Host "  • Deberías ver 'Success. No rows returned'" -ForegroundColor White
        Write-Host "  • O un mensaje de confirmación" -ForegroundColor White
        Write-Host ""
        Write-Host "PASO 7: Verificar tablas creadas" -ForegroundColor Yellow
        Write-Host "  • Ejecuta el script de verificación:" -ForegroundColor White
        Write-Host "    scripts\verify_templates_tables.sql" -ForegroundColor Cyan
        Write-Host ""
        
        $openFile = Read-Host "¿Abrir archivo de migración en el bloc de notas? (s/n)"
        if ($openFile -eq "s" -or $openFile -eq "S") {
            notepad $migrationFile
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "🔧 Intentando aplicar con Supabase CLI..." -ForegroundColor Cyan
        Write-Host ""
        
        # Verificar si está linkedado
        if (Test-Path ".supabase\config.toml") {
            Write-Host "✅ Proyecto linkedado detectado" -ForegroundColor Green
            Write-Host "Ejecutando: npx supabase db push" -ForegroundColor Gray
            Write-Host ""
            
            npx supabase db push
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Migración aplicada exitosamente!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "❌ Error al aplicar migración" -ForegroundColor Red
                Write-Host "   Intenta la opción 1 (SQL Editor manual)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Proyecto no linkedado" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Para linkear el proyecto:" -ForegroundColor White
            Write-Host "  1. Obtén tu Project Ref desde el Dashboard de Supabase" -ForegroundColor White
            Write-Host "  2. Ejecuta: npx supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Cyan
            Write-Host "  3. Vuelve a ejecutar este script" -ForegroundColor White
            Write-Host ""
            Write-Host "O usa la opción 1 (SQL Editor manual)" -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "💡 Después de aplicar la migración:" -ForegroundColor Cyan
Write-Host "  1. Reinicia tu servidor de desarrollo (npm run dev)" -ForegroundColor White
Write-Host "  2. Limpia el caché del navegador (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  3. Recarga la aplicación (F5)" -ForegroundColor White
Write-Host ""
Write-Host "📄 Más información en: SOLUCIÓN_LOOP_INFINITO.md" -ForegroundColor Gray
Write-Host ""

Read-Host "Presiona Enter para salir"
