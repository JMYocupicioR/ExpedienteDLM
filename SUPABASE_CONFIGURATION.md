# 🚀 Configuración Completa de Supabase y hCaptcha para ExpedienteDLM

## 📋 Resumen de Cambios Realizados

### ✅ Archivos Configurados

1. **`supabase/config.toml`** - Configuración principal de Supabase
2. **`env.example`** - Variables de entorno necesarias
3. **`src/lib/hcaptcha.ts`** - Configuración del frontend para hCaptcha
4. **`supabase/functions/auth/before-user-created-hook.ts`** - Hook de creación de usuarios
5. **`supabase/functions/auth/custom-access-token-hook.ts`** - Hook de tokens personalizados

## 🔧 Pasos para Completar la Configuración

### **Paso 1: Crear archivo de variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
SUPABASE_PROJECT_ID=tu_project_id_aqui

# hCaptcha Configuration
HCAPTCHA_SECRET_KEY=tu_clave_secreta_hcaptcha
VITE_HCAPTCHA_SITE_KEY=tu_clave_del_sitio_hcaptcha

# OAuth Providers
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FACEBOOK_CLIENT_ID=tu_facebook_client_id
FACEBOOK_CLIENT_SECRET=tu_facebook_client_secret

# SMTP Configuration
SMTP_PASSWORD=tu_password_smtp
```

### **Paso 2: Obtener credenciales de Supabase**

1. Ve a [https://app.supabase.com/](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (para las funciones)

### **Paso 3: Configurar hCaptcha**

1. Ve a [https://dashboard.hcaptcha.com/](https://dashboard.hcaptcha.com/)
2. En tu sitio, agrega estos dominios:
   - `expediente-dlm.com`
   - `expediente-dlm.com/auth`
   - `expediente-dlm.com/login`
   - `expediente-dlm.com/register`
   - `localhost:5173`
   - `localhost:3000`
   - `127.0.0.1:5173`

3. Copia las claves:
   - **Site Key** → `VITE_HCAPTCHA_SITE_KEY`
   - **Secret Key** → `HCAPTCHA_SECRET_KEY`

### **Paso 4: Configurar OAuth Providers**

#### **Google OAuth:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita Google+ API
4. Crea credenciales OAuth 2.0
5. Agrega URIs de redirección:
   - `https://expediente-dlm.com/auth/callback`
   - `http://localhost:5173/auth/callback`

#### **Facebook OAuth:**
1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una aplicación
3. Configura OAuth
4. Agrega URIs de redirección:
   - `https://expediente-dlm.com/auth/callback`
   - `http://localhost:5173/auth/callback`

### **Paso 5: Desplegar funciones de Supabase**

```bash
# Desde la raíz del proyecto
supabase functions deploy before-user-created-hook
supabase functions deploy custom-access-token-hook
```

### **Paso 6: Verificar configuración**

1. Reinicia tu servidor de desarrollo
2. Verifica que no hay errores en la consola
3. Prueba el login con hCaptcha

## 🔍 Verificación de Configuración

### **Verificar Supabase:**
```bash
# Verificar conexión
supabase status
```

### **Verificar hCaptcha:**
- El widget debe aparecer en la página de login
- No debe mostrar errores de "clave incorrecta"
- Debe funcionar en todos los dominios configurados

### **Verificar OAuth:**
- Los botones de Google y Facebook deben estar visibles
- Al hacer clic, deben redirigir correctamente
- El callback debe funcionar sin errores

## 🚨 Solución de Problemas Comunes

### **Error: "Auth session missing"**
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configurados
- Asegúrate de que el archivo `.env.local` existe y está en la raíz

### **Error: "hCaptcha clave incorrecta"**
- Verifica que `VITE_HCAPTCHA_SITE_KEY` esté configurado correctamente
- Asegúrate de que el dominio esté en la lista de hCaptcha
- Verifica que `HCAPTCHA_SECRET_KEY` esté configurado en Supabase

### **Error: "OAuth redirect URI mismatch"**
- Verifica que las URIs de redirección coincidan exactamente
- Asegúrate de que estén configuradas tanto en Supabase como en los proveedores OAuth

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de hCaptcha](https://docs.hcaptcha.com/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)

## ✅ Estado de Configuración

- [ ] Variables de entorno configuradas
- [ ] Credenciales de Supabase obtenidas
- [ ] hCaptcha configurado y funcionando
- [ ] OAuth de Google configurado
- [ ] OAuth de Facebook configurado
- [ ] Funciones de Supabase desplegadas
- [ ] Login funcionando correctamente
- [ ] hCaptcha funcionando en todos los dominios

---

**⚠️ IMPORTANTE:** Nunca subas el archivo `.env.local` a Git. Contiene información sensible.
