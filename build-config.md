# 🚀 Configuración de Build para Netlify

## 📋 Variables de Entorno Requeridas

Para que tu aplicación funcione correctamente en Netlify, debes configurar las siguientes variables de entorno en el dashboard de Netlify:

### 🔐 **Supabase (OBLIGATORIAS)**
```
VITE_SUPABASE_URL=https://qcelbrzjrmjxpjxllyhk.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_real_aqui
```

### 🛡️ **hCaptcha (OBLIGATORIAS)**
```
VITE_HCAPTCHA_SITE_KEY=tu_clave_del_sitio_real_aqui
```

### 🔑 **OAuth - Google (OPCIONAL)**
```
GOOGLE_CLIENT_ID=tu_client_id_real_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_real_aqui
```

### 🔑 **OAuth - Facebook (OPCIONAL)**
```
FACEBOOK_CLIENT_ID=tu_client_id_real_aqui
FACEBOOK_CLIENT_SECRET=tu_client_secret_real_aqui
```

### 📧 **SMTP (OPCIONAL)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password_aqui
SMTP_FROM=tu_email@gmail.com
```

## 🎯 **Cómo Configurar en Netlify**

1. Ve a tu dashboard de Netlify
2. Selecciona tu sitio
3. Ve a **Site settings** → **Environment variables**
4. Agrega cada variable con su valor real
5. Haz clic en **Save**

## ⚠️ **Importante**

- **NUNCA** subas el archivo `.env.local` al repositorio
- **NUNCA** uses valores de ejemplo en producción
- Las variables que empiezan con `VITE_` son visibles en el frontend
- Las variables sin `VITE_` solo son visibles en el backend

## 🔍 **Verificación**

Después de configurar las variables:
1. Haz un nuevo deploy
2. Verifica que no haya errores de build
3. Prueba la funcionalidad de autenticación
4. Verifica que hCaptcha funcione correctamente

## 📚 **Enlaces Útiles**

- [Dashboard de Supabase](https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/settings/api)
- [Dashboard de hCaptcha](https://dashboard.hcaptcha.com/sites)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Facebook Developers](https://developers.facebook.com/apps/)
