# 🔧 SOLUCIÓN ERROR 401: Perfil No Encontrado

## 🚨 **Problema Identificado**

**Error:** `401 Unauthorized` - "Perfil no encontrado"  
**Causa:** Falta la política RLS de INSERT en la tabla `profiles`  
**Usuario Afectado:** `jmyocupicior@gmail.com` (ID: `4f4b239c-ae17-47b7-9e0d-13358360cb23`)

---

## ✅ **Solución Inmediata (5 minutos)**

### **Opción A: Ejecutar Script en Supabase Dashboard (RECOMENDADO)**

#### **Paso 1: Abrir el Editor SQL de Supabase**
1. Ir a: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/editor
2. Iniciar sesión con tu cuenta de Supabase

#### **Paso 2: Ejecutar el Script de Solución**
1. Abrir el archivo: `FIX_PERFIL_USUARIO_INMEDIATO.sql`
2. Copiar **TODO** el contenido del archivo
3. Pegarlo en el editor SQL de Supabase
4. Hacer clic en el botón **"Run"** (▶️)

#### **Paso 3: Verificar el Resultado**
Deberías ver en los resultados:
```
estado: VERIFICACIÓN: Perfil creado
id: 4f4b239c-ae17-47b7-9e0d-13358360cb23
email: jmyocupicior@gmail.com
full_name: jmyocupicior@gmail.com
role: doctor
```

#### **Paso 4: Recargar la Aplicación**
1. Ir a tu aplicación web
2. Presionar **F5** o **Ctrl+R** para recargar
3. ✅ El perfil debería aparecer correctamente

---

### **Opción B: Aplicar Migraciones con Supabase CLI**

#### **Paso 1: Verificar que Supabase CLI está conectado**
```bash
supabase status
```

#### **Paso 2: Aplicar las Migraciones a Producción**
```bash
# Aplicar migraciones pendientes
supabase db push
```

#### **Paso 3: Verificar que se aplicaron correctamente**
```bash
# Ver el estado de las migraciones
supabase migration list
```

---

## 🔍 **¿Qué Hace el Fix?**

### **1. Agrega Política de INSERT para Profiles**
```sql
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());
```
- ✅ Permite que los usuarios creen su propio perfil
- ✅ Mantiene la seguridad (solo pueden crear su propio perfil)

### **2. Crea Trigger Automático**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
- ✅ Crea automáticamente un perfil cuando se registra un usuario
- ✅ Evita errores 401 en el futuro

### **3. Crea Perfiles para Usuarios Existentes**
```sql
INSERT INTO public.profiles (id, email, full_name, role, ...)
SELECT ... FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
```
- ✅ Crea perfiles para todos los usuarios que no lo tienen
- ✅ Incluye tu usuario actual

---

## 📊 **Verificación Post-Solución**

### **1. Verificar en Supabase Dashboard**

Ir a: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/editor

Ejecutar:
```sql
-- Verificar que tu perfil existe
SELECT * FROM profiles WHERE email = 'jmyocupicior@gmail.com';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Debería mostrar:
-- ✅ profiles_select_own
-- ✅ profiles_update_own
-- ✅ profiles_insert_own (NUEVO)
```

### **2. Verificar en la Aplicación Web**

1. Recargar la aplicación (F5)
2. Ir a la página "Mi Perfil"
3. ✅ Debería mostrar tu información
4. ✅ No debería haber errores 401

### **3. Verificar en la Consola del Navegador**

1. Abrir DevTools (F12)
2. Ir a la pestaña "Console"
3. ✅ No debería haber errores de 401
4. ✅ Las consultas a `/rest/v1/profiles` deberían devolver 200

---

## 🎯 **Qué Se Ha Solucionado**

### **Antes del Fix:**
- ❌ Error 401 en todas las consultas
- ❌ "Perfil no encontrado"
- ❌ No se podía crear perfiles
- ❌ Usuarios nuevos no podían usar la aplicación

### **Después del Fix:**
- ✅ Perfiles creados automáticamente
- ✅ Usuario actual tiene perfil
- ✅ No más errores 401
- ✅ Aplicación funcional
- ✅ Nuevos usuarios se crean con perfil automáticamente

---

## 🚀 **Próximos Pasos (Opcional)**

### **1. Configurar tu Perfil Completo**
Una vez que puedas acceder a "Mi Perfil":
1. Editar tu nombre completo
2. Agregar información adicional
3. Seleccionar tu especialidad médica (si aplica)

### **2. Unirte a una Clínica**
1. Ir a "Configuración" → "Clínicas"
2. Buscar una clínica existente o crear una nueva
3. Solicitar acceso o crear tu propia clínica

### **3. Verificar Permisos**
```sql
-- Ver tus permisos en clínicas
SELECT * FROM clinic_user_relationships 
WHERE user_id = '4f4b239c-ae17-47b7-9e0d-13358360cb23';
```

---

## 🆘 **¿Aún No Funciona?**

### **Problema 1: Sigue apareciendo "Perfil no encontrado"**

**Solución:**
1. Cerrar sesión completamente
2. Limpiar caché del navegador (Ctrl+Shift+Del)
3. Iniciar sesión nuevamente
4. Recargar la aplicación (F5)

### **Problema 2: Error 401 persiste**

**Verificar:**
```sql
-- 1. Verificar que el perfil existe
SELECT * FROM profiles WHERE id = '4f4b239c-ae17-47b7-9e0d-13358360cb23';

-- 2. Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 3. Verificar políticas activas
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### **Problema 3: No puedo ejecutar el script SQL**

**Alternativa:**
1. Contactar al administrador de Supabase
2. O ejecutar las migraciones localmente primero:
   ```bash
   supabase db reset
   supabase db push
   ```

---

## 📝 **Archivos Creados en este Fix**

1. **`DIAGNOSTICO_ERROR_401.md`**
   - Análisis completo del problema
   - Explicación técnica detallada

2. **`FIX_PERFIL_USUARIO_INMEDIATO.sql`**
   - Script SQL para ejecutar en Supabase Dashboard
   - Solución inmediata

3. **`supabase/migrations/20251027000000_add_profiles_insert_policy.sql`**
   - Migración para agregar política INSERT

4. **`supabase/migrations/20251027000001_add_auto_profile_trigger.sql`**
   - Migración para trigger automático

5. **`SOLUCION_ERROR_401_PASO_A_PASO.md`** (este archivo)
   - Guía paso a paso para aplicar el fix

---

## ✅ **Confirmación de Éxito**

Una vez aplicado el fix, deberías poder:
- ✅ Ver tu perfil en "Mi Perfil"
- ✅ Editar tu información
- ✅ Navegar por la aplicación sin errores 401
- ✅ Ver la lista de clínicas
- ✅ Crear o unirte a clínicas

**¡Tu aplicación está lista para usar!** 🎉

---

## 📞 **Soporte**

Si sigues teniendo problemas:
1. Verificar los logs de la consola del navegador
2. Verificar los logs de Supabase Dashboard
3. Ejecutar las consultas de verificación SQL
4. Compartir los errores específicos que aparezcan




