# Guía para Resolver Problemas con Extensiones de VS Code/Cursor

## Resumen de Problemas Identificados

### 1. API Proposals Obsoletas

Varias extensiones están intentando usar APIs que ya no existen:

- `debugFocus`
- `chatVariableResolver`
- `terminalShellType`
- `chatReadonlyPromptReference`
- `lmTools`
- `chatParticipant`
- `languageModels`

### 2. Extensiones con Errores

- **GitHub Copilot Chat**: Usando API proposals incompatibles
- **Markdown Preview Enhanced**: Archivo `package.nls.json` corrupto
- **Data Wrangler, Python, etc.**: Usando APIs obsoletas

### 3. Problemas de Git

- Error: "No full commit provider registered"
- Afecta funciones de Git en Cursor

### 4. Content Security Policy

- Estilos inline siendo bloqueados (generalmente inofensivo)

## Soluciones Rápidas

### Opción 1: Usar el Script de PowerShell (Recomendado para Windows)

```powershell
# Abrir PowerShell como Administrador y navegar a tu proyecto
cd "C:\Users\JmYoc\OneDrive\Documentos\DeepLuxMed\Expediente DLM\ExpedienteDLM-9"

# Ejecutar diagnóstico
.\fix-vscode-extensions.ps1

# Actualizar todas las extensiones
.\fix-vscode-extensions.ps1 -UpdateAll

# Arreglar Markdown Preview Enhanced específicamente
.\fix-vscode-extensions.ps1 -FixMarkdown
```

### Opción 2: Soluciones Manuales

#### 1. Actualizar Todas las Extensiones

```bash
# Para Cursor
cursor --update-extensions

# Para VS Code
code --update-extensions
```

#### 2. Reinstalar Extensiones Problemáticas

```bash
# Markdown Preview Enhanced
cursor --uninstall-extension shd101wyy.markdown-preview-enhanced
cursor --install-extension shd101wyy.markdown-preview-enhanced

# GitHub Copilot Chat
cursor --uninstall-extension github.copilot-chat
cursor --install-extension github.copilot-chat
```

#### 3. Verificar Instalación de Git

```bash
# Verificar si Git está instalado
git --version

# Si no está instalado, descargar desde:
# https://git-scm.com/download/win

# Configurar Git (si es necesario)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

## Soluciones Específicas por Problema

### Para el Error de Markdown Preview Enhanced

El error indica que el archivo `package.nls.json` está corrupto. Opciones:

1. **Reinstalar la extensión** (recomendado):

   ```bash
   cursor --uninstall-extension shd101wyy.markdown-preview-enhanced
   cursor --install-extension shd101wyy.markdown-preview-enhanced
   ```

2. **Reparar manualmente**:
   - Navegar a:
     `C:\Users\JmYoc\.cursor\extensions\shd101wyy.markdown-preview-enhanced-*`
   - Editar `package.nls.json` y reemplazar con:
   ```json
   {
     "displayName": "Markdown Preview Enhanced",
     "description": "Markdown Preview Enhanced ported to vscode"
   }
   ```

### Para Errores de Git Provider

1. **Verificar que Git esté instalado**:
   - Descargar desde: https://git-scm.com/download/win
   - Asegurarse de que Git esté en el PATH

2. **Reiniciar Cursor después de instalar Git**

3. **Si persiste, verificar la configuración del repositorio**:
   ```bash
   cd "C:\Users\JmYoc\OneDrive\Documentos\DeepLuxMed\Expediente DLM\ExpedienteDLM-9"
   git status
   git remote -v
   ```

### Para Warnings de API Proposals

Estos warnings indican que las extensiones necesitan actualizarse. Las
soluciones son:

1. **Actualizar las extensiones afectadas**
2. **Esperar a que los desarrolladores actualicen sus extensiones**
3. **Deshabilitar temporalmente las extensiones problemáticas** si causan
   problemas

### Para Content Security Policy

Estos errores son generalmente inofensivos y ocurren cuando:

- Las extensiones intentan aplicar estilos inline
- Se cargan webviews con contenido dinámico

**No requieren acción** a menos que afecten la funcionalidad.

## Pasos de Limpieza Completa (Último Recurso)

Si los problemas persisten:

1. **Cerrar Cursor/VS Code completamente**

2. **Limpiar caché de extensiones**:

   ```powershell
   # Hacer backup primero
   Copy-Item -Path "$env:USERPROFILE\.cursor\extensions" -Destination "$env:USERPROFILE\.cursor\extensions_backup" -Recurse

   # Limpiar
   Remove-Item -Path "$env:USERPROFILE\.cursor\extensions\*" -Recurse -Force
   ```

3. **Reiniciar Cursor y reinstalar extensiones esenciales**

## Extensiones Recomendadas Alternativas

Si las extensiones problemáticas continúan causando problemas, considera estas
alternativas:

- **Para Markdown**:
  - Markdown All in One
  - Markdown PDF

- **Para Git**:
  - GitLens
  - Git Graph

## Verificación Final

Después de aplicar las soluciones:

1. Reiniciar Cursor/VS Code
2. Verificar que no aparezcan errores en la consola (Ctrl+Shift+I)
3. Probar las funcionalidades principales:
   - Git status
   - Preview de Markdown
   - IntelliSense

## Notas Importantes

- Los warnings de API proposals son comunes cuando las extensiones no se han
  actualizado para las últimas versiones de VS Code
- Cursor puede tener diferencias con VS Code estándar que causan algunos de
  estos problemas
- Mantener las extensiones actualizadas es la mejor prevención
- Algunos errores son inofensivos y no afectan la funcionalidad
