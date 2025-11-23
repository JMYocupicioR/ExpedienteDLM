# Reporte de Verificación RLS - ExpedienteDLM

## 📊 Estado General

### ✅ Migraciones RLS Aplicadas

1. **[20250827000000_create_basic_schema.sql](supabase/migrations/20250827000000_create_basic_schema.sql)** - Schema básico con RLS
2. **[20250910000002_fix_rls_functions.sql](supabase/migrations/20250910000002_fix_rls_functions.sql)** - Funciones RLS corregidas
3. **[20250910000003_hotfix_new_user_rls.sql](supabase/migrations/20250910000003_hotfix_new_user_rls.sql)** - Hotfix para nuevos usuarios
4. **[20251020031236_enable_rls_missing_tables.sql](supabase/migrations/20251020031236_enable_rls_missing_tables.sql)** - Habilitar RLS en tablas faltantes
5. **[20251020032452_fix_rls_security.sql](supabase/migrations/20251020032452_fix_rls_security.sql)** - Fix de seguridad RLS
6. **[20251027000000_add_profiles_insert_policy.sql](supabase/migrations/20251027000000_add_profiles_insert_policy.sql)** - Política INSERT para profiles

---

## 🔐 Funciones RLS Definidas

### 1. `is_user_in_clinic(target_clinic_id UUID)`
- **Propósito**: Verifica si el usuario actual pertenece a una clínica específica
- **Tipo**: SECURITY DEFINER, STABLE
- **Lógica**:
  ```sql
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
  );
  ```

### 2. `get_user_clinic_id()`
- **Propósito**: Obtiene el ID de la clínica principal del usuario actual
- **Tipo**: SECURITY DEFINER, STABLE
- **Lógica**:
  ```sql
  SELECT clinic_id
  FROM public.clinic_user_relationships
  WHERE user_id = auth.uid()
    AND status = 'approved'
    AND is_active = true
  LIMIT 1;
  ```

### 3. `check_patient_exists_by_social_security(p_clinic_id UUID, p_social_security_number TEXT)`
- **Propósito**: Verifica si existe un paciente con el CURP en una clínica específica
- **Tipo**: SECURITY DEFINER, STABLE
- **Retorna**: JSON con `{exists: boolean, patient_id?: UUID}`

---

## 📋 Políticas RLS por Tabla

### 🏥 **profiles**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `profiles_select_own` | SELECT | Solo ver su propio perfil (`id = auth.uid()`) |
| `profiles_update_own` | UPDATE | Solo actualizar su propio perfil |
| `profiles_insert_own` | INSERT | Crear perfil al registrarse (`id = auth.uid()`) |

**Estado**: ✅ **Completo** (3 políticas)

---

### 🏢 **clinics**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `clinics_select_authenticated` | SELECT | Todos los usuarios autenticados pueden ver clínicas |

**Estado**: ⚠️ **Incompleto** - Falta políticas de INSERT/UPDATE/DELETE
**Análisis**: Solo lectura pública, lo cual puede ser correcto dependiendo de tu modelo de negocio.

---

### 🤝 **clinic_user_relationships**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `clinic_relationships_select_own` | SELECT | Ver solo sus propias relaciones (`user_id = auth.uid()`) |

**Estado**: ⚠️ **Incompleto** - Falta políticas de INSERT/UPDATE/DELETE
**Riesgo**: ¿Cómo se crean las relaciones? ¿Administradores? ¿Funciones serverless?

---

### 👥 **patients**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `patients_select_own_clinic` | SELECT | Ver pacientes de clínicas donde el usuario está activo |
| `patients_insert_policy` | INSERT | Crear pacientes si:<br>1. Usuario pertenece a la clínica, O<br>2. Usuario es médico primario creando paciente en su clínica |
| `patients_update_own_clinic` | UPDATE | Actualizar pacientes solo de su clínica |
| `patients_delete_own_clinic` | DELETE | Eliminar pacientes solo de su clínica |

**Estado**: ✅ **Completo** (4 políticas - CRUD completo)
**Nota**: La política INSERT tiene lógica especial para nuevos usuarios ("chicken and egg fix")

---

### 🩺 **consultations**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `consultations_select_own_clinic` | SELECT | Ver consultas de clínicas donde el usuario está activo |

**Estado**: ⚠️ **Incompleto** - Falta INSERT/UPDATE/DELETE
**Riesgo Crítico**: ⚠️ No hay políticas para crear/modificar consultas

---

### 💊 **prescriptions**
**Estado**: ⚠️ **Sin políticas visibles en migraciones activas**
**Riesgo Crítico**: ⚠️ Tabla crítica sin protección RLS

---

### 📄 **medical_records**
| Política | Operación | Descripción |
|----------|-----------|-------------|
| `medical_records_select_own_clinic` | SELECT | Ver registros de pacientes de su clínica |
| `medical_records_insert_own_clinic` | INSERT | Crear registros para pacientes de su clínica |
| `medical_records_update_own_clinic` | UPDATE | Actualizar registros de su clínica |
| `medical_records_delete_own_clinic` | DELETE | Eliminar registros de su clínica |

**Estado**: ✅ **Completo** (4 políticas) - Definido en [20250910000002_fix_rls_functions.sql:174-232](supabase/migrations/20250910000002_fix_rls_functions.sql)

---

### ⚙️ **clinic_configurations**
**Estado**: ⚠️ **Sin políticas visibles**
**Análisis**: Creada en [20251006030000_create_clinic_configuration_system.sql:12](supabase/migrations/20251006030000_create_clinic_configuration_system.sql)
**Riesgo**: Configuraciones de clínica accesibles sin restricciones

---

### 👤 **user_clinic_preferences**
**Estado**: ⚠️ **Sin políticas visibles**
**Análisis**: Creada en [20251006030000_create_clinic_configuration_system.sql:93](supabase/migrations/20251006030000_create_clinic_configuration_system.sql)
**Riesgo**: Preferencias de usuario sin protección

---

### 📊 **activity_logs / audit_logs**
**Estado**: ✅ RLS habilitado por [20251020031236_enable_rls_missing_tables.sql:9](supabase/migrations/20251020031236_enable_rls_missing_tables.sql)
**Estado Políticas**: ⚠️ Sin políticas específicas
**Análisis**: Posiblemente accedido solo por funciones SECURITY DEFINER

---

## 🚨 Problemas Identificados

### Críticos (🔴)
1. **prescriptions** - Sin políticas RLS definidas
2. **consultations** - Solo SELECT, falta INSERT/UPDATE/DELETE
3. **clinic_configurations** - Tabla sin políticas, datos sensibles
4. **user_clinic_preferences** - Sin políticas de protección

### Advertencias (🟡)
1. **clinics** - Solo lectura pública, ¿es intencional?
2. **clinic_user_relationships** - Falta flujo de creación/actualización
3. **activity_logs** - RLS habilitado pero sin políticas específicas
4. **role_permissions** - RLS habilitado sin políticas visibles

---

## ✅ Políticas Funcionando Bien

1. ✅ **profiles** - CRUD completo para usuarios sobre su propio perfil
2. ✅ **patients** - CRUD completo con lógica especial para nuevos usuarios
3. ✅ **medical_records** - CRUD completo basado en relación con pacientes

---

## 🔧 Recomendaciones

### Prioridad Alta
1. **Agregar políticas completas a `consultations`**
   ```sql
   -- INSERT policy
   CREATE POLICY "consultations_insert_own_clinic" ON consultations
   FOR INSERT WITH CHECK (is_user_in_clinic(clinic_id));

   -- UPDATE policy
   CREATE POLICY "consultations_update_own_clinic" ON consultations
   FOR UPDATE USING (is_user_in_clinic(clinic_id));

   -- DELETE policy (considerar si debe permitirse)
   CREATE POLICY "consultations_delete_own_clinic" ON consultations
   FOR DELETE USING (is_user_in_clinic(clinic_id));
   ```

2. **Agregar políticas a `prescriptions`**
   - Similar a consultations, basado en clinic_id

3. **Proteger `clinic_configurations`**
   ```sql
   -- Solo admin puede modificar, todos de la clínica pueden ver
   CREATE POLICY "clinic_config_select" ON clinic_configurations
   FOR SELECT USING (is_user_in_clinic(clinic_id));

   CREATE POLICY "clinic_config_admin_modify" ON clinic_configurations
   FOR ALL USING (
     EXISTS (
       SELECT 1 FROM clinic_user_relationships
       WHERE clinic_id = clinic_configurations.clinic_id
       AND user_id = auth.uid()
       AND role_in_clinic = 'admin'
     )
   );
   ```

4. **Proteger `user_clinic_preferences`**
   ```sql
   -- Solo el usuario puede ver/modificar sus preferencias
   CREATE POLICY "user_prefs_own" ON user_clinic_preferences
   FOR ALL USING (user_id = auth.uid());
   ```

### Prioridad Media
1. Definir políticas para `clinic_user_relationships` (proceso de invitación/aprobación)
2. Revisar si `clinics` debe permitir creación por usuarios o solo por admin
3. Agregar políticas específicas a `activity_logs` si se requiere acceso directo

### Prioridad Baja
1. Documentar todas las políticas con comentarios SQL
2. Crear tests de RLS automatizados
3. Agregar constraint checks para validaciones adicionales

---

## 📝 Cómo Verificar

### Opción 1: Si Supabase está corriendo
```bash
# Iniciar Docker Desktop primero
supabase start
psql postgresql://postgres:postgres@localhost:54322/postgres -f VERIFICACION_RLS.sql
```

### Opción 2: Ejecutar script de verificación manualmente
Usa el archivo [VERIFICACION_RLS.sql](VERIFICACION_RLS.sql) en tu cliente SQL preferido

---

## 📌 Notas Adicionales

### Migración "Chicken and Egg" Fix
La migración [20250910000003_hotfix_new_user_rls.sql](supabase/migrations/20250910000003_hotfix_new_user_rls.sql) soluciona un problema donde nuevos usuarios no podían crear pacientes porque no tenían clínica asignada todavía. La política `patients_insert_policy` tiene dos ramas:
1. Usuario ya está en la clínica (flujo normal)
2. Usuario es médico primario creando su primer paciente (flujo de onboarding)

### Extensions Schema
La migración [20251020032452_fix_rls_security.sql:10-38](supabase/migrations/20251020032452_fix_rls_security.sql) mueve extensiones (`pg_trgm`, `btree_gist`) del schema `public` al schema `extensions` para mejor organización.

---

**Fecha de Reporte**: 2025-11-22
**Versión ExpedienteDLM**: 11
**Total Migraciones Analizadas**: 17 archivos activos
