# 🚀 Configuración Completa de Supabase para ExpedienteDLM

## 📋 Estado Actual del Proyecto

### **Proyecto Remoto:**
- **ID:** `qcelbrzjrmjxpjxllyhk`
- **URL:** `https://qcelbrzjrmjxpjxllyhk.supabase.co`
- **PostgreSQL:** Versión 15
- **Estado:** ✅ Conectado y sincronizado

### **Funciones Desplegadas:**
- ✅ `migration-cleanup` - Versión 6
- ✅ `swift-action` - Versión 5  
- ✅ `verify-hcaptcha` - Versión 5
- ✅ `before-user-created-hook` - Versión 1 (NUEVA)
- ✅ `custom-access-token-hook` - Versión 1 (NUEVA)

## 🔧 Configuración de Variables de Entorno

### **1. Crear archivo `.env.local` en la raíz del proyecto:**

```bash
# ========================================
# CONFIGURACIÓN DE SUPABASE
# ========================================
VITE_SUPABASE_URL=https://qcelbrzjrmjxpjxllyhk.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_real_aqui

# Clave de servicio para Edge Functions
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_real_aqui

# ========================================
# CONFIGURACIÓN DE HCAPTCHA
# ========================================
VITE_HCAPTCHA_SITE_KEY=tu_clave_del_sitio_real_aqui
HCAPTCHA_SECRET_KEY=tu_clave_secreta_real_aqui

# ========================================
# CONFIGURACIÓN DE OAUTH
# ========================================
GOOGLE_CLIENT_ID=tu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui
FACEBOOK_CLIENT_ID=tu_facebook_client_id_aqui
FACEBOOK_CLIENT_SECRET=tu_facebook_client_secret_aqui

# ========================================
# CONFIGURACIÓN DE SMTP
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password_aqui
SMTP_FROM=tu_email@gmail.com
```

## 🎯 **Pasos de Configuración**

### **Paso 1: Obtener Credenciales de Supabase**
1. Ve a [Dashboard de Supabase](https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/settings/api)
2. Copia `Project URL` y `anon public` key
3. Ve a **API** → **Project API keys** → **service_role** key

### **Paso 2: Configurar hCaptcha**
1. Ve a [Dashboard de hCaptcha](https://dashboard.hcaptcha.com/sites)
2. Crea un nuevo sitio o usa uno existente
3. Copia `Site Key` y `Secret Key`
4. Agrega estos dominios permitidos:
   - `expediente-dlm.com`
   - `localhost:5173`
   - `localhost:3000`

### **Paso 3: Configurar OAuth - Google**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea una nueva aplicación OAuth 2.0
3. Agrega estas URLs de redirección:
   - `https://expediente-dlm.com/auth/callback`
   - `http://localhost:5173/auth/callback`
4. Copia `Client ID` y `Client Secret`

### **Paso 4: Configurar OAuth - Facebook**
1. Ve a [Facebook Developers](https://developers.facebook.com/apps/)
2. Crea una nueva aplicación
3. Agrega estas URLs de redirección:
   - `https://expediente-dlm.com/auth/callback`
   - `http://localhost:5173/auth/callback`
4. Copia `App ID` y `App Secret`

### **Paso 5: Configurar SMTP (Opcional)**
1. Ve a [Google Account Settings](https://myaccount.google.com/security)
2. Habilita "Verificación en dos pasos"
3. Genera una "Contraseña de aplicación"
4. Usa tu email y esta contraseña en la configuración

## 🔐 **Configuración de Netlify**

### **Variables de Entorno en Netlify:**
1. Ve a tu dashboard de Netlify
2. **Site settings** → **Environment variables**
3. Agrega todas las variables del `.env.local`
4. **IMPORTANTE:** Solo las variables que empiezan con `VITE_` son visibles en el frontend

### **Configuración de Build:**
- El archivo `.netlify.toml` ya está configurado
- **SECRETS_SCAN_ENABLED = "true"** para mantener la seguridad
- Los archivos de documentación están excluidos del escaneo

## 🚀 **Despliegue de Funciones**

### **Funciones ya desplegadas:**
```bash
# Verificar estado
supabase functions list

# Desplegar una función específica
supabase functions deploy nombre-funcion

# Ver logs de una función
supabase functions logs nombre-funcion
```

## 🔍 **Verificación de Configuración**

### **1. Verificar conexión a Supabase:**
```bash
supabase status --output json
```

### **2. Verificar funciones:**
```bash
supabase functions list
```

### **3. Verificar configuración local:**
```bash
supabase link --project-ref qcelbrzjrmjxpjxllyhk
```

## ⚠️ **Problemas Comunes y Soluciones**

### **Error: "Auth session missing"**
- ✅ Verificar que `.env.local` existe
- ✅ Verificar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- ✅ Verificar que las credenciales son correctas

### **Error: "hCaptcha not loaded"**
- ✅ Verificar `VITE_HCAPTCHA_SITE_KEY`
- ✅ Verificar que el dominio está permitido en hCaptcha
- ✅ Verificar que el script de hCaptcha se carga

### **Error: "OAuth provider not configured"**
- ✅ Verificar credenciales de OAuth
- ✅ Verificar URLs de redirección
- ✅ Verificar que el proveedor está habilitado en Supabase

## 📚 **Enlaces Útiles**

- [Dashboard de Supabase](https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk)
- [Documentación de Supabase](https://supabase.com/docs)
- [Dashboard de hCaptcha](https://dashboard.hcaptcha.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Facebook Developers](https://developers.facebook.com)

## 🎉 **¡Configuración Completada!**

Una vez que hayas configurado todas las variables de entorno:
1. Tu aplicación debería funcionar sin errores de autenticación
2. hCaptcha debería funcionar correctamente
3. Los proveedores OAuth deberían estar disponibles
4. Las funciones de autenticación deberían ejecutarse automáticamente

---

**¿Necesitas ayuda con algún paso específico?** ¡Estoy aquí para ayudarte!
