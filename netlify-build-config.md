# 🚀 Configuración de Netlify para ExpedienteDLM

## 📋 Variables de Entorno en Netlify

Para que tu aplicación funcione correctamente en Netlify, necesitas configurar las siguientes variables de entorno en tu dashboard de Netlify:

### **Configuración en Netlify Dashboard:**

1. Ve a tu proyecto en [Netlify](https://app.netlify.com/)
2. Ve a **Site settings** → **Environment variables**
3. Agrega las siguientes variables:

#### **Variables Requeridas:**
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
VITE_HCAPTCHA_SITE_KEY=tu_clave_del_sitio_hcaptcha
```

#### **Variables Opcionales:**
```
VITE_APP_ENVIRONMENT=production
VITE_ALLOW_DASHBOARD_WITHOUT_AUTH=false
```

### **Configuración de Build:**

El archivo `netlify.toml` ya está configurado para:
- ✅ Omitir archivos de documentación del escaneo de secretos
- ✅ Configurar el build y deploy correctamente
- ✅ Establecer headers de seguridad
- ✅ Configurar redirecciones para SPA

### **Verificación:**

1. **Variables configuradas** en Netlify Dashboard
2. **Build exitoso** sin errores de secretos
3. **Aplicación funcionando** en el dominio de Netlify

## 🔒 Seguridad

- ❌ **NUNCA** subas archivos `.env` a Git
- ✅ **SIEMPRE** usa variables de entorno de Netlify
- ✅ **VERIFICA** que no hay secretos en el código fuente

---

**Nota:** Este archivo es solo para documentación. Las variables reales se configuran en el dashboard de Netlify.
