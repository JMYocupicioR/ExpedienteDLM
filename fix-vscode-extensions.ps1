# Script de PowerShell para resolver problemas con extensiones de VS Code/Cursor en Windows
# Ejecutar como: .\fix-vscode-extensions.ps1

param(
    [switch]$FixMarkdown,
    [switch]$UpdateAll,
    [switch]$CleanCache,
    [switch]$CheckOnly
)

# Colores para la consola
function Write-ColorOutput($message, $color = "White") {
    Write-Host $message -ForegroundColor $color
}

function Write-Section($title) {
    Write-Host "`n$('=' * 60)" -ForegroundColor Blue
    Write-Host $title -ForegroundColor Blue
    Write-Host "$('=' * 60)" -ForegroundColor Blue
}

# Detectar si es Cursor o VS Code
function Get-Editor {
    if (Test-Path "$env:USERPROFILE\.cursor") {
        return "cursor"
    } else {
        return "code"
    }
}

# Obtener ruta de extensiones
function Get-ExtensionsPath {
    $editor = Get-Editor
    if ($editor -eq "cursor") {
        return "$env:USERPROFILE\.cursor\extensions"
    } else {
        return "$env:USERPROFILE\.vscode\extensions"
    }
}

# Lista de extensiones problemáticas
$problematicExtensions = @(
    @{
        Id = "github.copilot-chat"
        Name = "GitHub Copilot Chat"
        Issue = "Using incompatible API proposals"
        Solution = "Update to latest version or disable temporarily"
    },
    @{
        Id = "shd101wyy.markdown-preview-enhanced"
        Name = "Markdown Preview Enhanced"
        Issue = "Invalid package.nls.json file"
        Solution = "Reinstall the extension"
    },
    @{
        Id = "ms-toolsai.datawrangler"
        Name = "Data Wrangler"
        Issue = "Using non-existent API proposal"
        Solution = "Update to latest version"
    },
    @{
        Id = "ms-python.python"
        Name = "Python"
        Issue = "Using non-existent API proposal"
        Solution = "Update to latest version"
    }
)

# Función principal de diagnóstico
function Run-Diagnostics {
    Write-Section "VS Code/Cursor Extension Diagnostics"

    $editor = Get-Editor
    Write-ColorOutput "Detected editor: $editor" "Green"

    $extensionsPath = Get-ExtensionsPath
    Write-ColorOutput "Extensions path: $extensionsPath" "Green"

    if (!(Test-Path $extensionsPath)) {
        Write-ColorOutput "Extensions directory not found!" "Red"
        return
    }

    Write-Section "Checking Installed Extensions"

    try {
        $installedExtensions = & $editor --list-extensions --show-versions 2>$null

        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Could not retrieve extension list. Make sure $editor is in PATH" "Yellow"
            return
        }

        Write-Section "Problematic Extensions Found"

        foreach ($ext in $problematicExtensions) {
            $installed = $installedExtensions | Where-Object { $_ -like "$($ext.Id)*" }

            if ($installed) {
                Write-ColorOutput "`n✗ $($ext.Name) ($($ext.Id))" "Red"
                Write-ColorOutput "  Version: $installed" "Yellow"
                Write-ColorOutput "  Issue: $($ext.Issue)" "Yellow"
                Write-ColorOutput "  Solution: $($ext.Solution)" "Green"
            }
        }

    } catch {
        Write-ColorOutput "Error checking extensions: $_" "Red"
    }

    Write-Section "Recommendations"

    Write-ColorOutput "1. Update all extensions:" "Magenta"
    Write-ColorOutput "   .\fix-vscode-extensions.ps1 -UpdateAll" "Green"

    Write-ColorOutput "`n2. Fix Markdown Preview Enhanced:" "Magenta"
    Write-ColorOutput "   .\fix-vscode-extensions.ps1 -FixMarkdown" "Green"

    Write-ColorOutput "`n3. Clean extension cache (use with caution):" "Magenta"
    Write-ColorOutput "   .\fix-vscode-extensions.ps1 -CleanCache" "Green"

    Write-ColorOutput "`n4. For Git provider issues:" "Magenta"
    Write-ColorOutput "   - Ensure Git is installed: https://git-scm.com/download/win" "Green"
    Write-ColorOutput "   - Restart Cursor/VS Code after installation" "Green"
}

# Arreglar Markdown Preview Enhanced
function Fix-MarkdownExtension {
    Write-Section "Fixing Markdown Preview Enhanced"

    $editor = Get-Editor
    $extensionsPath = Get-ExtensionsPath

    # Buscar la extensión
    $markdownExt = Get-ChildItem -Path $extensionsPath -Directory |
                   Where-Object { $_.Name -like "*markdown-preview-enhanced*" } |
                   Select-Object -First 1

    if ($markdownExt) {
        $nlsPath = Join-Path $markdownExt.FullName "package.nls.json"

        if (Test-Path $nlsPath) {
            Write-ColorOutput "Found package.nls.json at: $nlsPath" "Yellow"

            # Crear contenido válido
            $validContent = @{
                displayName = "Markdown Preview Enhanced"
                description = "Markdown Preview Enhanced ported to vscode"
            } | ConvertTo-Json -Depth 2

            try {
                Set-Content -Path $nlsPath -Value $validContent -Encoding UTF8
                Write-ColorOutput "Fixed package.nls.json file" "Green"
            } catch {
                Write-ColorOutput "Error fixing file: $_" "Red"
            }
        }
    } else {
        Write-ColorOutput "Markdown Preview Enhanced not found. Reinstalling..." "Yellow"

        & $editor --uninstall-extension shd101wyy.markdown-preview-enhanced 2>$null
        Start-Sleep -Seconds 2
        & $editor --install-extension shd101wyy.markdown-preview-enhanced

        Write-ColorOutput "Extension reinstalled" "Green"
    }
}

# Actualizar todas las extensiones
function Update-AllExtensions {
    Write-Section "Updating All Extensions"

    $editor = Get-Editor
    Write-ColorOutput "Updating extensions for $editor..." "Yellow"

    & $editor --update-extensions

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "All extensions updated successfully" "Green"
    } else {
        Write-ColorOutput "Error updating extensions" "Red"
    }
}

# Limpiar caché de extensiones
function Clean-ExtensionCache {
    Write-Section "Cleaning Extension Cache"

    $response = Read-Host "This will remove all extensions. Are you sure? (y/n)"

    if ($response -eq 'y') {
        $extensionsPath = Get-ExtensionsPath

        if (Test-Path $extensionsPath) {
            Write-ColorOutput "Removing extensions from: $extensionsPath" "Yellow"
            Remove-Item -Path "$extensionsPath\*" -Recurse -Force
            Write-ColorOutput "Extension cache cleaned" "Green"
            Write-ColorOutput "Restart $editor and reinstall your extensions" "Yellow"
        }
    } else {
        Write-ColorOutput "Operation cancelled" "Yellow"
    }
}

# Verificar Git
function Check-GitInstallation {
    Write-Section "Git Configuration Check"

    try {
        $gitVersion = git --version 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Git installed: $gitVersion" "Green"

            $userName = git config --global user.name 2>$null
            $userEmail = git config --global user.email 2>$null

            if ($userName -and $userEmail) {
                Write-ColorOutput "Git user configuration: OK" "Green"
                Write-ColorOutput "  Name: $userName" "Green"
                Write-ColorOutput "  Email: $userEmail" "Green"
            } else {
                Write-ColorOutput "Git user configuration: Missing" "Yellow"
                Write-ColorOutput "Configure with:" "Yellow"
                Write-ColorOutput '  git config --global user.name "Your Name"' "Green"
                Write-ColorOutput '  git config --global user.email "your@email.com"' "Green"
            }
        } else {
            throw "Git not found"
        }
    } catch {
        Write-ColorOutput "Git is not installed or not in PATH" "Red"
        Write-ColorOutput "Download Git from: https://git-scm.com/download/win" "Yellow"
        Write-ColorOutput "After installation, restart PowerShell and VS Code/Cursor" "Yellow"
    }
}

# Script principal
Write-ColorOutput @"
VS Code/Cursor Extension Fix Tool
=================================
This tool helps diagnose and fix common extension issues.
"@ "Cyan"

if ($CheckOnly) {
    Run-Diagnostics
    Check-GitInstallation
} elseif ($FixMarkdown) {
    Fix-MarkdownExtension
} elseif ($UpdateAll) {
    Update-AllExtensions
} elseif ($CleanCache) {
    Clean-ExtensionCache
} else {
    Run-Diagnostics
    Check-GitInstallation

    Write-Host "`n"
    Write-ColorOutput "Additional options:" "Magenta"
    Write-ColorOutput "  .\fix-vscode-extensions.ps1 -CheckOnly    # Run diagnostics only" "Green"
    Write-ColorOutput "  .\fix-vscode-extensions.ps1 -FixMarkdown  # Fix markdown extension" "Green"
    Write-ColorOutput "  .\fix-vscode-extensions.ps1 -UpdateAll    # Update all extensions" "Green"
    Write-ColorOutput "  .\fix-vscode-extensions.ps1 -CleanCache   # Clean extension cache" "Green"
}
