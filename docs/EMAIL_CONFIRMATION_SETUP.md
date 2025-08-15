# 📧 Sistema de Confirmación de Email - DeepLux Med

## ✅ Estado: Configurado y Funcionando

El sistema de confirmación de email está completamente configurado para **desarrollo local** y listo para **producción**.

## 🔧 Configuración Actual

### Desarrollo Local
- ✅ Confirmación de email habilitada
- ✅ Servidor de testing (Inbucket) configurado en puerto 54324
- ✅ Plantillas de email personalizadas
- ✅ Manejo de errores en la aplicación

### Para Producción
- ⚠️ Requiere configurar proveedor SMTP real
- ✅ Configuración SMTP preparada en `config.toml`
- ✅ Variables de entorno configuradas

## 🚀 Cómo Funciona

### 1. Flujo de Registro
```
Usuario completa formulario
    ↓
Sistema valida email disponible
    ↓
Redirección a cuestionario
    ↓
Creación de usuario con supabase.auth.signUp
    ↓
Email de confirmación enviado automáticamente
    ↓
Usuario debe confirmar antes de poder hacer login
```

### 2. Confirmación de Email
- Se envía email con enlace único
- Enlace expira en 24 horas
- Usuario hace clic → email confirmado
- Ahora puede hacer login normalmente

## 🧪 Probar en Desarrollo

### 1. Iniciar Supabase
```bash
npx supabase start
```

### 2. Ejecutar Scripts de Prueba
```bash
# Verificar configuración
node setup-email-confirmation.js

# Probar registro completo
node test-email-registration.js
```

### 3. Ver Emails de Testing
1. Ve a: http://localhost:54324
2. Registra un usuario en la app
3. Verás el email de confirmación en Inbucket
4. Haz clic en el enlace para confirmar

## 📱 Uso en la Aplicación

### Registro de Usuario
1. Usuario llena formulario de registro
2. Sistema valida email no esté en uso
3. Redirección a cuestionario de registro
4. Al completar cuestionario, se crea usuario
5. Email de confirmación enviado automáticamente

### Manejo de Errores
- Email ya registrado → Mensaje claro + redirección a login
- Email no confirmado → Instrucciones para revisar bandeja
- Error de SMTP → Mensaje de error con instrucciones

## 🚀 Configurar para Producción

### Opción 1: SendGrid (Recomendado)
```bash
# 1. Crear cuenta en SendGrid
# 2. Obtener API Key
# 3. Configurar variables de entorno
export SENDGRID_API_KEY="tu_api_key_aqui"

# 4. Habilitar SMTP en config.toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"
admin_email = "admin@tudominio.com"
sender_name = "DeepLux Med"
```

### Opción 2: Mailgun
```toml
[auth.email.smtp]
enabled = true
host = "smtp.mailgun.org"
port = 587
user = "postmaster@tudominio.com"
pass = "env(MAILGUN_SMTP_PASSWORD)"
admin_email = "admin@tudominio.com"
sender_name = "DeepLux Med"
```

### Opción 3: Gmail/Google Workspace
```toml
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "tu_email@gmail.com"
pass = "env(GMAIL_APP_PASSWORD)"
admin_email = "admin@tudominio.com"
sender_name = "DeepLux Med"
```

## 📧 Plantillas de Email

### Ubicación
- `supabase/templates/confirm.html` - Confirmación de registro
- `supabase/templates/recovery.html` - Recuperación de contraseña

### Personalización
Las plantillas incluyen:
- ✨ Diseño responsive
- 🎨 Branding de DeepLux Med
- 🔒 Información de seguridad
- 📱 Compatible con clientes de email

### Variables Disponibles
- `{{ .ConfirmationURL }}` - Enlace de confirmación
- `{{ .SiteURL }}` - URL de la aplicación
- `{{ .Email }}` - Email del usuario

## 🔒 Seguridad

### Medidas Implementadas
- ✅ Enlaces con tokens únicos y seguros
- ✅ Expiración automática (24h para confirmación, 1h para recuperación)
- ✅ Validación del lado del servidor
- ✅ Rate limiting configurado
- ✅ Verificación de email duplicado

### Rate Limiting
- 2 emails por hora por IP
- 30 intentos de login por 5 minutos
- 30 verificaciones de token por 5 minutos

## 🐛 Solución de Problemas

### Email No Llega
1. **Desarrollo**: Revisar http://localhost:54324
2. **Producción**: 
   - Verificar configuración SMTP
   - Revisar logs de Supabase
   - Confirmar variables de entorno

### Error "Email not confirmed"
- ✅ Es el comportamiento esperado
- Usuario debe confirmar email primero
- Verificar que enlace no haya expirado

### SMTP Errors
```bash
# Verificar configuración
npx supabase status

# Revisar logs
npx supabase logs
```

## 📊 Monitoreo

### Métricas Importantes
- Tasa de confirmación de emails
- Tiempo promedio para confirmación
- Emails bounced/rechazados
- Errores SMTP

### Logs Útiles
```sql
-- Usuarios pendientes de confirmación
SELECT email, created_at 
FROM auth.users 
WHERE email_confirmed_at IS NULL;

-- Confirmaciones recientes
SELECT email, email_confirmed_at, created_at
FROM auth.users 
WHERE email_confirmed_at > NOW() - INTERVAL '24 hours';
```

## 🎯 Próximas Mejoras

- [ ] Dashboard de métricas de email
- [ ] Reenvío de confirmación automático
- [ ] Plantillas personalizables desde UI
- [ ] Notificaciones push como respaldo
- [ ] A/B testing de plantillas

## 📚 Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Rate Limiting](https://supabase.com/docs/guides/auth/rate-limits)
