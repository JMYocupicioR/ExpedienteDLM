# 🚨 DIAGNÓSTICO: Error 401 - Perfil No Encontrado

## 📋 **Resumen del Problema**

**Error:** `401 Unauthorized` en todas las consultas a Supabase  
**Causa Raíz:** **Falta la política RLS de INSERT en la tabla `profiles`**  
**Usuario ID:** `4f4b239c-ae17-47b7-9e0d-13358360cb23`  
**Email:** `jmyocupicior@gmail.com`

---

## 🔍 **Análisis Detallado del Problema**

### **1. El Usuario Está Autenticado Pero Sin Perfil**

El usuario se autenticó correctamente con Supabase Auth, pero:
- ✅ Existe en `auth.users`
- ❌ **NO existe en la tabla `profiles`**
- ❌ NO tiene relación con ninguna clínica en `clinic_user_relationships`

### **2. Políticas RLS Actuales en `profiles`**

```sql
-- ✅ EXISTE: Política para leer propio perfil
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (id = auth.uid());

-- ✅ EXISTE: Política para actualizar propio perfil
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- ❌ FALTA: Política para CREAR propio perfil
-- No existe política de INSERT para profiles
```

### **3. Flujo Esperado vs Flujo Real**

#### **Flujo Esperado:**
1. Usuario se registra → `auth.users` ✅
2. Sistema crea automáticamente perfil → `profiles` ❌ **BLOQUEADO POR RLS**
3. Usuario puede acceder a su perfil → ❌ **NO EXISTE PERFIL**

#### **Flujo Real:**
1. Usuario se registra → `auth.users` ✅
2. Intenta crear perfil → **ERROR 401** (RLS bloquea INSERT)
3. Intenta leer perfil → **ERROR 401** (perfil no existe)

---

## 🎯 **Soluciones Propuestas**

### **✅ Solución 1: Agregar Política de INSERT para Profiles (RECOMENDADA)**

Crear una migración que permita a los usuarios crear su propio perfil:

```sql
-- Política INSERT: Permitir a los usuarios crear su propio perfil
CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT
WITH CHECK (id = auth.uid());
```

**Ventajas:**
- ✅ Los usuarios pueden crear su propio perfil
- ✅ Mantiene la seguridad RLS
- ✅ Flujo natural de registro

### **✅ Solución 2: Trigger Automático para Crear Perfil**

Crear un trigger que automáticamente cree el perfil cuando se registra un usuario:

```sql
-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'doctor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta al crear un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Ventajas:**
- ✅ Completamente automático
- ✅ No requiere código en el frontend
- ✅ Garantiza que siempre haya un perfil

### **✅ Solución 3: Solución Inmediata para Usuario Actual**

Insertar manualmente el perfil del usuario actual en la base de datos de producción:

```sql
-- Crear perfil manualmente para el usuario actual
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  '4f4b239c-ae17-47b7-9e0d-13358360cb23',
  'jmyocupicior@gmail.com',
  'Usuario', -- Puedes cambiar este nombre
  'doctor',
  NOW(),
  NOW()
);
```

---

## 🛠️ **Solución Completa Recomendada**

### **Paso 1: Crear Migración para Política INSERT**

Crear archivo: `supabase/migrations/20251027000000_add_profiles_insert_policy.sql`

```sql
-- =====================================================
-- Add INSERT Policy for Profiles Table
-- Fecha: 2025-10-27
-- Descripcion: Permite a los usuarios crear su propio perfil
-- =====================================================

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Crear política de INSERT para profiles
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
```

### **Paso 2: Crear Trigger Automático (OPCIONAL)**

Crear archivo: `supabase/migrations/20251027000001_add_auto_profile_trigger.sql`

```sql
-- =====================================================
-- Auto-Create Profile on User Registration
-- Fecha: 2025-10-27
-- Descripcion: Crea automáticamente un perfil cuando se registra un usuario
-- =====================================================

-- Eliminar trigger y función si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'doctor',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta al crear un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear perfiles para usuarios existentes sin perfil
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'doctor',
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
```

### **Paso 3: Aplicar Migraciones en Producción**

```bash
# Opción A: Aplicar a través de Supabase CLI
supabase db push

# Opción B: Aplicar directamente en el Dashboard de Supabase
# 1. Ir a: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/editor
# 2. Ejecutar el SQL de las migraciones
```

---

## 📝 **Notas Importantes**

### **Por qué ocurrió este error:**
1. Las migraciones solo crearon políticas de **SELECT** y **UPDATE**
2. **NUNCA se creó una política de INSERT** para `profiles`
3. El trigger automático tampoco existía
4. Los usuarios nuevos no pueden crear su perfil

### **Tablas afectadas:**
- ✅ `profiles` - **PRINCIPAL** (falta política INSERT)
- ⚠️ `clinic_user_relationships` - Depende de profiles
- ⚠️ `patients` - Depende de profiles
- ⚠️ `medical_specialties` - Requiere autenticación

### **Impacto:**
- 🔴 **CRÍTICO:** Usuarios nuevos no pueden usar la aplicación
- 🔴 **CRÍTICO:** No se pueden crear perfiles
- 🔴 **CRÍTICO:** La interfaz muestra "Perfil no encontrado"

---

## ✅ **Verificación Post-Solución**

Después de aplicar las migraciones, verificar:

```sql
-- 1. Verificar que el perfil existe
SELECT * FROM profiles WHERE id = '4f4b239c-ae17-47b7-9e0d-13358360cb23';

-- 2. Verificar políticas RLS en profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 3. Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 4. Verificar todos los usuarios tienen perfil
SELECT 
  au.id,
  au.email,
  p.id as profile_id,
  CASE WHEN p.id IS NULL THEN '❌ SIN PERFIL' ELSE '✅ CON PERFIL' END as estado
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;
```

---

## 🎯 **Acción Inmediata Recomendada**

**URGENTE:** Aplicar la **Solución 1 + Solución 2** en este orden:
1. ✅ Crear política de INSERT para profiles
2. ✅ Crear trigger automático
3. ✅ Verificar que el usuario actual tiene perfil
4. ✅ Recargar la aplicación

**Resultado Esperado:**
- ✅ Usuario puede ver su perfil
- ✅ Nuevos usuarios se crean automáticamente con perfil
- ✅ No más errores 401
- ✅ Aplicación funcional




