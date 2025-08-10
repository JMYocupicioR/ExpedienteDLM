# Completar Configuración - ExpedienteDLM

## 🎯 **Estado Actual**
- ✅ Servidor funcionando en http://localhost:5173
- ✅ Conexión a Supabase establecida
- ✅ 4 de 5 tablas creadas
- ⚠️ Falta aplicar migración final

## 🔧 **Pasos para Completar (Manual)**

### 1. **Abrir SQL Editor**
- El SQL Editor ya está abierto en tu navegador
- URL: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/sql

### 2. **Aplicar Migración Final**
Copia y pega este SQL en el editor:

```sql
/*
  # Fix infinite recursion in profiles RLS policy
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Recreate the policy without recursive role checking
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Also fix any other policies that might have similar recursion issues
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = id);
```

### 3. **Ejecutar la Consulta**
- Haz clic en "Run" o presiona Ctrl+Enter
- Deberías ver "Success" en verde

### 4. **Verificar Completado**
Ejecuta este comando en la terminal:
```bash
node simple-migration.js
```

## 🎉 **¡Listo!**

Una vez completado, tu aplicación estará 100% funcional con:
- ✅ Todas las tablas creadas
- ✅ Sistema de autenticación
- ✅ RLS configurado correctamente
- ✅ Aplicación ejecutándose

## 📞 **Enlaces Útiles**
- **Aplicación**: http://localhost:5173
- **Dashboard**: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk
- **SQL Editor**: https://supabase.com/dashboard/project/qcelbrzjrmjxpjxllyhk/sql 