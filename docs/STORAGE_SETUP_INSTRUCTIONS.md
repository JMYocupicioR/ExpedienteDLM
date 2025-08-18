# Instrucciones para Configurar Storage en Supabase

## Problema Actual
Estás recibiendo el error: `infinite recursion detected in policy for relation "clinic_user_relationships"` al intentar subir tu foto de perfil.

## Solución Paso a Paso

### Paso 1: Corregir la Recursión Infinita
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql
2. Abre el SQL Editor
3. Ejecuta el siguiente SQL:

```sql
-- FIX: Recursión infinita en clinic_user_relationships
-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS cur_insert_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_update_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_delete_admin ON public.clinic_user_relationships;
DROP POLICY IF EXISTS cur_select_self_or_admin ON public.clinic_user_relationships;

-- Recrear política SELECT sin recursión
CREATE POLICY cur_select_self_or_admin
  ON public.clinic_user_relationships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR 
    clinic_id IN (
      WITH user_clinics AS (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- INSERT: permitir auto-registro o si ya es admin
CREATE POLICY cur_insert_self_or_admin
  ON public.clinic_user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    clinic_id IN (
      WITH user_clinics AS (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- UPDATE: solo admin puede actualizar
CREATE POLICY cur_update_admin
  ON public.clinic_user_relationships
  FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  )
  WITH CHECK (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );

-- DELETE: solo admin puede eliminar
CREATE POLICY cur_delete_admin
  ON public.clinic_user_relationships
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      WITH user_clinics AS (
        SELECT clinic_id 
        FROM public.clinic_user_relationships
        WHERE user_id = auth.uid()
          AND is_active = true
          AND role_in_clinic = 'admin_staff'
      )
      SELECT clinic_id FROM user_clinics
    )
  );
```

### Paso 2: Configurar Storage Completo
En el mismo SQL Editor, ejecuta el contenido completo del archivo:
`supabase/migrations/20250810006000_complete_storage_setup.sql`

Este archivo:
- Crea los 3 buckets necesarios (profile-photos, clinic-assets, patient-documents)
- Configura todas las políticas RLS para cada bucket
- Verifica que todo esté correctamente configurado

### Paso 3: Verificar que Todo Funcione
1. Recarga tu aplicación (F5)
2. Ve a Configuración → Perfil y Clínica
3. Intenta subir tu foto de perfil nuevamente

## Estructura de Archivos en Storage

### 1. **profile-photos** (Público)
- Ruta: `/{user_id}/foto.jpg`
- Permisos: Solo el propietario puede subir/modificar/borrar su foto

### 2. **clinic-assets** (Público)
- Ruta: `/{clinic_id}/logo.png`
- Permisos: Solo administradores de la clínica pueden subir/modificar/borrar

### 3. **patient-documents** (Privado)
- Ruta: `/{clinic_id}/{patient_id}/{documento}.pdf`
- Permisos: Solo usuarios de la clínica pueden acceder

## Verificación Manual

Puedes verificar que los buckets existan en:
1. Dashboard → Storage: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/storage/buckets
2. Deberías ver los 3 buckets listados

## Si Sigues Teniendo Problemas

1. Verifica que estés autenticado correctamente
2. Revisa la consola del navegador (F12) para ver errores específicos
3. Asegúrate de que tu perfil tenga los campos necesarios (clinic_id si eres admin)
4. Si el error persiste, ejecuta los SQL en orden:
   - Primero el fix de recursión
   - Luego el setup completo de storage

## Notas Importantes

- Las fotos de perfil se guardan automáticamente con el ID del usuario
- Los logos de clínica requieren ser administrador de la clínica
- Los documentos de pacientes solo son accesibles por personal de la misma clínica
