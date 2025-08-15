# Instrucciones de Migración: Sistema Anti-Duplicidad CURP

## Resumen

Este conjunto de migraciones implementa un sistema robusto para prevenir la creación de pacientes duplicados basado en la CURP (Clave Única de Registro de Población), optimiza el flujo de trabajo clínico y fortalece la seguridad multi-tenant.

## Migraciones a Aplicar

### 1. **20250814000000_patient_unique_constraints.sql**
- ✅ Añade columna `curp` si no existe
- ✅ Crea constraint UNIQUE en `(clinic_id, curp)`
- ✅ Crea función helper `check_patient_exists_by_curp`
- ✅ Añade índice para performance

### 2. **20250814001000_populate_curp_for_existing_patients.sql**
- ✅ Pobla columna `curp` en pacientes existentes
- ✅ Añade comentarios descriptivos
- ✅ Crea función para generar CURPs temporales

### 3. **20250814002000_cleanup_existing_policies.sql** ⭐ **NUEVO**
   - ✅ Limpia todas las políticas RLS existentes
   - ✅ Previene conflictos durante la migración
   - ✅ Prepara el terreno para nuevas políticas

### 4. **20250814003000_emergency_policy_cleanup.sql** 🚨 **EMERGENCIA**
   - ✅ Limpieza específica de políticas INSERT duplicadas
   - ✅ Maneja conflictos de políticas existentes
   - ✅ Garantiza estado limpio antes de crear nuevas

### 5. **20250815000000_strengthen_patient_insert_policy.sql**
   - ✅ Fortalece política RLS de INSERT
   - ✅ Añade auditoría automática de creación
   - ✅ Verifica clínicas activas

## Pasos de Aplicación

### Paso 1: Aplicar Migraciones de Base de Datos

```bash
# Navegar al directorio del proyecto
cd ExpedienteDLM-9

# Opción A: Usar el script automatizado (RECOMENDADO)
node apply-curp-migrations.js

# Opción B: Aplicar manualmente en orden
npx supabase db push

# Opción C: Aplicar migraciones específicas
npx supabase db push --include-all
```

### Paso 2: Desplegar Edge Function

```bash
# Desplegar la función de verificación de CURP
npx supabase functions deploy check-patient-exists

# Verificar el deployment
npx supabase functions list
```

### Paso 3: Verificar la Aplicación

```bash
# Ejecutar script de verificación
node verify-migrations.js

# O verificar manualmente en Supabase Dashboard
```

## Verificación Manual

### 1. Verificar Columna CURP
```sql
-- En Supabase SQL Editor
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name = 'curp';
```

### 2. Verificar Constraint UNIQUE
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'patients' 
AND constraint_type = 'UNIQUE';
```

### 3. Verificar Función Helper
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'check_patient_exists_by_curp';
```

### 4. Verificar Índice
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%curp%';
```

## Solución de Problemas

### Error: "policy already exists" o "column 'polname' does not exist"
**Causa**: Conflictos con políticas RLS existentes o errores en migraciones de limpieza.

**Solución de Emergencia**:
```bash
# Opción 1: Script de emergencia (RECOMENDADO)
node emergency-policy-cleanup.js

# Opción 2: Limpieza manual en Supabase Dashboard
DROP POLICY IF EXISTS "patients_insert_only_active_approved_clinics" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_by_clinic" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_clinic" ON public.patients;
```

**Después de la limpieza de emergencia**:
```bash
# Continuar con las migraciones normales
node apply-curp-migrations.js
```

### Error: "column 'curp' does not exist"
**Causa**: La migración no se aplicó correctamente o la columna no se creó.

**Solución**:
```sql
-- Crear la columna manualmente
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS curp text;

-- Aplicar la migración nuevamente
-- Revisar logs de migración en Supabase Dashboard
```

### Error: "duplicate key value violates unique constraint"
**Causa**: Existen pacientes con CURP duplicada.

**Solución**:
```sql
-- Verificar duplicados
SELECT curp, COUNT(*) 
FROM patients 
GROUP BY curp 
HAVING COUNT(*) > 1;

-- Actualizar CURPs duplicadas
UPDATE patients 
SET curp = 'DUPLICADO_' || id::text 
WHERE curp IN (
  SELECT curp 
  FROM patients 
  GROUP BY curp 
  HAVING COUNT(*) > 1
);
```

### Error: "function check_patient_exists_by_curp does not exist"
**Causa**: La función no se creó correctamente.

**Solución**:
```sql
-- Recrear la función manualmente
-- Copiar contenido de 20250814000000_patient_unique_constraints.sql
-- Ejecutar en Supabase SQL Editor
```

## Testing

### 1. Crear Paciente con CURP Existente
```typescript
// En el frontend
const patientData = {
  full_name: "Juan Pérez",
  curp: "CURP_EXISTENTE",
  // ... otros campos
};

// Debería mostrar alerta de paciente existente
```

### 2. Verificar Validación en Tiempo Real
```typescript
// Al salir del campo CURP (onBlur)
// Debería llamar a check-patient-exists
// Mostrar resultado en UI
```

### 3. Verificar Constraint de Base de Datos
```sql
-- Intentar insertar paciente con CURP duplicada
INSERT INTO patients (full_name, curp, clinic_id) 
VALUES ('Otro Paciente', 'CURP_EXISTENTE', 'clinic-uuid');

-- Debería fallar con error de constraint
```

## Rollback (Si es Necesario)

### 1. Revertir Constraint UNIQUE
```sql
ALTER TABLE public.patients 
DROP CONSTRAINT IF EXISTS patients_clinic_curp_unique;
```

### 2. Revertir Columna CURP
```sql
ALTER TABLE public.patients 
DROP COLUMN IF EXISTS curp;
```

### 3. Revertir Función
```sql
DROP FUNCTION IF EXISTS check_patient_exists_by_curp;
```

### 4. Revertir Políticas RLS
```sql
DROP POLICY IF EXISTS "patients_insert_only_active_approved_clinics" ON public.patients;
```

## Monitoreo Post-Migración

### 1. Verificar Performance
```sql
-- Verificar uso del índice
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%curp%';
```

### 2. Verificar Auditoría
```sql
-- Verificar logs de creación de pacientes
SELECT * FROM activity_logs 
WHERE entity_type = 'patient' 
ORDER BY timestamp DESC 
LIMIT 10;
```

### 3. Verificar Integridad
```sql
-- Verificar que no hay pacientes sin CURP
SELECT COUNT(*) 
FROM patients 
WHERE curp IS NULL OR curp = '';
```

## Soporte

Si encuentras problemas durante la migración:

1. **Revisar logs** en Supabase Dashboard > Logs
2. **Verificar estado** con `node verify-migrations.js`
3. **Consultar documentación** en `docs/CRITICAL_WORKFLOWS_AND_BUSINESS_LOGIC.md`
4. **Revisar migraciones** en `supabase/migrations/`

---

*Última actualización: Agosto 2025*
