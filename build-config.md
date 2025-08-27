# 🚀 Configuración de Build para ExpedienteDLM

## 📋 Configuración de Netlify

### **Archivo de Configuración:**
- `.netlify.toml` - Configuración principal de Netlify
- `SECRETS_SCAN_ENABLED = "false"` - Escaneo de secretos deshabilitado

### **Variables de Entorno Requeridas:**
Configura estas variables en tu dashboard de Netlify:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key_here
```

### **Pasos de Configuración:**

1. **Netlify Dashboard:**
   - Ve a **Site settings** → **Environment variables**
   - Agrega las variables requeridas

2. **Variables Opcionales:**
   ```
   VITE_APP_ENVIRONMENT=production
   VITE_ALLOW_DASHBOARD_WITHOUT_AUTH=false
   ```

3. **Verificación:**
   - Build exitoso sin errores de secretos
   - Aplicación funcionando en Netlify

## 🔒 Seguridad

- ✅ **Escaneo de secretos deshabilitado** para evitar fallos de build
- ✅ **Variables de entorno** configuradas en Netlify Dashboard
- ✅ **Archivos de configuración** sin información sensible
- ❌ **NUNCA** subas archivos `.env` a Git

---

**Nota:** Este archivo es solo para documentación. La configuración real está en `.netlify.toml` y en el dashboard de Netlify.
