# 🔧 Solución de Errores de Supabase

## Problema Principal

La aplicación no puede conectarse a Supabase porque:
1. Las variables de entorno no están configuradas
2. Las migraciones de base de datos no se han aplicado

## Solución Paso a Paso

### 1️⃣ Configurar Variables de Entorno

```bash
# Ejecutar el script de configuración
node setup-env-variables.js
```

Luego:
1. Copia `.env.example` a `.env`
2. Ve a tu proyecto en [Supabase](https://app.supabase.com)
3. En **Settings > API**, copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public Key** → `VITE_SUPABASE_ANON_KEY`
4. Guarda el archivo `.env`

### 2️⃣ Aplicar Migraciones de Base de Datos

```bash
# Verificar migraciones pendientes
node apply-all-migrations.js
```

Luego aplica manualmente cada migración en Supabase:

1. Ve a **SQL Editor** en tu proyecto de Supabase
2. Crea una nueva consulta (New Query)
3. Aplica cada migración en este orden:

```
1. 20250810000000_patients_rls_by_clinic.sql
2. 20250810002000_clinics_and_relationships_rls.sql
3. 20250810003000_patient_registration_tokens.sql
4. 20250810004000_add_med_rehabilitation_specialty.sql
5. 20250810005000_fix_clinic_relationships_recursion.sql
6. 20250810006000_complete_storage_setup.sql
7. 20250810007000_fix_patients_recursion.sql
```

### 3️⃣ Verificar Storage Buckets

En Supabase, ve a **Storage** y verifica que existan estos buckets:
- `profile-photos`
- `prescription-icons`
- `clinic-assets`

Si no existen, la migración `20250810006000_complete_storage_setup.sql` debería crearlos.

### 4️⃣ Reiniciar la Aplicación

```bash
# Detener el servidor (Ctrl+C)
# Reiniciar
npm run dev
```

## Verificación

Después de completar estos pasos:
1. No deberías ver errores de "Variables de Supabase no configuradas"
2. Los errores 500/404/400 deberían desaparecer
3. El Dashboard debería cargar correctamente

## Errores Comunes

### Error 500 en clinic_user_relationships
- Indica que la tabla tiene problemas de RLS o recursión
- Asegúrate de aplicar todas las migraciones de fix_recursion

### Error 404 en appointments/activity_logs
- Estas tablas no existen aún
- Necesitas aplicar las migraciones correspondientes

### Error 400 en Storage
- Los buckets no están creados
- Aplica la migración de storage setup

## Soporte

Si continúas teniendo problemas:
1. Verifica que todas las migraciones se aplicaron sin errores
2. Revisa los logs en Supabase Dashboard
3. Asegúrate de que las variables de entorno están correctamente configuradas
