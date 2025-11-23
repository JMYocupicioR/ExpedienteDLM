# Análisis de Errores en Migraciones de Supabase

## Estado Actual
- ✅ Docker Desktop funcionando
- ✅ Supabase CLI autenticado
- ✅ Proyecto ExpedienteDLM vinculado
- ❌ Migraciones con errores de dependencias

## Errores Identificados

### 1. **Migraciones Deshabilitadas (Correcto)**
Las siguientes migraciones fueron deshabilitadas correctamente porque dependen de tablas que no existen:

- `20250916000001_add_advanced_consultation_fields.sql.disabled`
  - **Error**: Intenta modificar tabla `consultations` que no existe
  - **Dependencias**: `consultations`, `profiles`, `patients`

- `20250916000002_add_medical_conversation_history.sql.disabled`
  - **Error**: Referencia tabla `consultations` que no existe
  - **Dependencias**: `consultations`, `patients`, `profiles`

- `20250917000001_add_prescription_visual_layouts.sql.disabled`
  - **Error**: Referencia tabla `profiles` que no existe
  - **Dependencias**: `profiles`

### 2. **Migraciones Habilitadas con Problemas Potenciales**

#### A. `20250827100002_add_unique_curp_constraint.sql`
- **Estado**: ✅ Seguro
- **Verificación**: Solo se ejecuta si la tabla `patients` existe
- **Dependencias**: `patients` (creada en esquema básico)

#### B. `20250910000001_add_missing_rls_functions.sql`
- **Estado**: ⚠️ Problemas potenciales
- **Problemas identificados**:
  - Referencia tablas que podrían no existir: `medical_records`, `appointments`, `prescriptions`
  - Usa `social_security_number` en lugar de `curp` (inconsistencia)
- **Dependencias**: `clinic_user_relationships`, `patients`, `medical_records`, `appointments`, `prescriptions`

#### C. `20250910000002_fix_rls_functions.sql`
- **Estado**: ⚠️ Problemas potenciales
- **Problemas identificados**:
  - Duplica funcionalidad de la migración anterior
  - Referencia `medical_records` que no existe
- **Dependencias**: `clinic_user_relationships`, `patients`, `medical_records`

#### D. `20250918000001_create_enhanced_appointments_system.sql`
- **Estado**: ❌ Error crítico
- **Problemas identificados**:
  - Referencia `consultations` y `prescriptions` que no existen
  - Línea 46: `consultation_id UUID REFERENCES public.consultations(id)`
  - Línea 47: `prescription_id UUID REFERENCES public.prescriptions(id)`
- **Dependencias**: `profiles`, `patients`, `clinics`, `consultations`, `prescriptions`

#### E. `20251006021449_fix_clinic_relationships.sql`
- **Estado**: ❌ Error crítico
- **Problemas identificados**:
  - Intenta insertar en `clinics` y `clinic_user_relationships` desde `profiles`
  - Asume que `profiles` ya tiene datos
- **Dependencias**: `profiles`, `clinics`, `clinic_user_relationships`

### 3. **Migraciones Seguras**
- `20250827000000_create_basic_schema.sql` ✅
- `20250827100000_initial_schema.sql` ✅ (solo `select 1;`)
- `20250827100001_hotfix_new_user_rls.sql` ✅
- `20250918000002_enable_btree_gist_extension.sql` ✅
- `20250919000002_create_medical_practice_settings.sql` ✅
- `20250919000003_fix_audit_logs_table.sql` ✅
- `20251006030000_create_clinic_configuration_system.sql` ✅
- `20251020031236_enable_rls_missing_tables.sql` ✅
- `20251020032452_fix_rls_security.sql` ✅
- `20251025160000_add_performance_indexes.sql` ✅

## Soluciones Recomendadas

### Opción 1: Migración Gradual (Recomendada)
1. **Mantener solo migraciones seguras**
2. **Crear migraciones faltantes**:
   - Tabla `consultations`
   - Tabla `prescriptions`
   - Tabla `medical_records`
3. **Rehabilitar migraciones** una por una

### Opción 2: Limpieza Completa
1. **Deshabilitar todas las migraciones problemáticas**
2. **Crear esquema completo** desde cero
3. **Migrar datos** si es necesario

### Opción 3: Corrección Selectiva
1. **Corregir migraciones específicas**
2. **Añadir verificaciones de existencia**
3. **Manejar dependencias**

## Próximos Pasos Inmediatos

1. **Deshabilitar migraciones problemáticas**:
   ```bash
   Move-Item "supabase\migrations\20250918000001_create_enhanced_appointments_system.sql" "supabase\migrations\20250918000001_create_enhanced_appointments_system.sql.disabled"
   Move-Item "supabase\migrations\20251006021449_fix_clinic_relationships.sql" "supabase\migrations\20251006021449_fix_clinic_relationships.sql.disabled"
   ```

2. **Crear migraciones faltantes**:
   - Tabla `consultations`
   - Tabla `prescriptions`
   - Tabla `medical_records`

3. **Probar inicio de Supabase**:
   ```bash
   supabase start
   ```

4. **Rehabilitar migraciones** gradualmente

## Comandos de Verificación

```bash
# Verificar estado
supabase status

# Ver logs de migración
supabase db reset --debug

# Aplicar migraciones específicas
supabase db push
```
