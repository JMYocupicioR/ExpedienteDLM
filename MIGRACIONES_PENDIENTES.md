# 📋 Migraciones Pendientes de Subir - ExpedienteDLM

## 🔍 **Estado Actual de Migraciones**

### ✅ **Migraciones Aplicadas (4/18)**
1. `20250827000000_create_basic_schema.sql` ✅
2. `20250827100000_initial_schema.sql` ✅  
3. `20250827100002_add_unique_curp_constraint.sql` ✅
4. `20250828000000_create_consultations_table.sql` ✅ (parcialmente)

### ⏳ **MIGRACIONES PENDIENTES (12/18)**

#### **1. Tablas Faltantes**
- `20250828000001_create_prescriptions_table.sql`
  - **Función**: Crea tabla de recetas médicas
  - **Dependencias**: `patients`, `profiles`, `clinics`, `consultations`

- `20250828000002_create_medical_records_table.sql`
  - **Función**: Crea tabla de expedientes médicos
  - **Dependencias**: `patients`, `profiles`, `clinics`, `consultations`

#### **2. Funciones RLS y Seguridad**
- `20250910000001_add_missing_rls_functions.sql`
  - **Función**: Crea funciones de seguridad RLS
  - **Dependencias**: `clinic_user_relationships`, `patients`
  - **Funciones**: `is_user_in_clinic()`, `get_user_clinic_id()`, `check_patient_exists_by_social_security()`

- `20250910000002_fix_rls_functions.sql`
  - **Función**: Corrige y recrea funciones RLS
  - **Dependencias**: `clinic_user_relationships`, `patients`

- `20250910000003_hotfix_new_user_rls.sql`
  - **Función**: Ajusta políticas RLS para nuevos usuarios
  - **Dependencias**: `is_user_in_clinic()` (debe ejecutarse después de las funciones)

#### **3. Extensiones y Configuraciones**
- `20250918000002_enable_btree_gist_extension.sql`
  - **Función**: Habilita extensión btree_gist para índices avanzados

- `20250919000002_create_medical_practice_settings.sql`
  - **Función**: Crea configuración de práctica médica
  - **Dependencias**: `profiles`, `clinics`

- `20250919000003_fix_audit_logs_table.sql`
  - **Función**: Corrige tabla de logs de auditoría
  - **Dependencias**: Sistema de auditoría

#### **4. Sistema de Clínicas**
- `20251006030000_create_clinic_configuration_system.sql`
  - **Función**: Sistema de configuración de clínicas
  - **Dependencias**: `clinics`, `profiles`

#### **5. Seguridad y RLS**
- `20251020031236_enable_rls_missing_tables.sql`
  - **Función**: Habilita RLS en tablas faltantes
  - **Dependencias**: Todas las tablas principales

- `20251020032452_fix_rls_security.sql`
  - **Función**: Corrige problemas de seguridad RLS
  - **Dependencias**: Funciones RLS existentes

#### **6. Optimización**
- `20251025160000_add_performance_indexes.sql`
  - **Función**: Añade índices de rendimiento
  - **Dependencias**: Todas las tablas principales

### 🚫 **Migraciones Deshabilitadas (5/18) - Correcto**
1. `20250916000001_add_advanced_consultation_fields.sql.disabled`
2. `20250916000002_add_medical_conversation_history.sql.disabled`
3. `20250917000001_add_prescription_visual_layouts.sql.disabled`
4. `20250918000001_create_enhanced_appointments_system.sql.disabled`
5. `20251006021449_fix_clinic_relationships.sql.disabled`

## 📊 **Resumen por Categoría**

### **Por Prioridad:**
1. **CRÍTICAS** (Tablas faltantes):
   - `create_prescriptions_table.sql`
   - `create_medical_records_table.sql`

2. **IMPORTANTES** (Funciones RLS):
   - `add_missing_rls_functions.sql`
   - `fix_rls_functions.sql`
   - `hotfix_new_user_rls.sql`

3. **CONFIGURACIÓN** (Extensiones y settings):
   - `enable_btree_gist_extension.sql`
   - `create_medical_practice_settings.sql`
   - `fix_audit_logs_table.sql`

4. **SISTEMA** (Clínicas y seguridad):
   - `create_clinic_configuration_system.sql`
   - `enable_rls_missing_tables.sql`
   - `fix_rls_security.sql`

5. **OPTIMIZACIÓN** (Rendimiento):
   - `add_performance_indexes.sql`

## 🎯 **Orden Recomendado de Aplicación**

```bash
# 1. Tablas faltantes
supabase db push --include-all

# 2. Verificar estado
supabase status

# 3. Aplicar migraciones restantes
supabase db push
```

## ⚠️ **Notas Importantes**

- **Estado actual**: Base de datos parcialmente configurada
- **Conflictos**: Algunas tablas ya existen (consultations)
- **Recomendación**: Considerar `supabase db reset` para estado limpio
- **Dependencias**: Orden de migraciones es crítico

## 🚀 **Comandos para Aplicar**

```bash
# Opción 1: Reset completo (recomendado)
supabase db reset

# Opción 2: Aplicar migraciones faltantes
supabase db push

# Opción 3: Verificar estado
supabase status
```
