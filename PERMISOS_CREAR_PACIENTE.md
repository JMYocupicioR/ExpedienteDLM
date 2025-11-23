# Permisos para Crear un Nuevo Paciente - ExpedienteDLM

## 🔐 Política RLS Actual

La política de INSERT para la tabla `patients` se encuentra en:
- **Migración**: [20250910000002_fix_rls_functions.sql:137-146](supabase/migrations/20250910000002_fix_rls_functions.sql)
- **Hotfix**: [20250910000003_hotfix_new_user_rls.sql:29-39](supabase/migrations/20250910000003_hotfix_new_user_rls.sql)

### Política Activa: `patients_insert_policy`

```sql
CREATE POLICY "patients_insert_policy" ON public.patients
FOR INSERT
WITH CHECK (
  -- Opción 1: El usuario ya pertenece a la clínica del paciente
  is_user_in_clinic(clinic_id)
  OR
  -- Opción 2: El usuario es el médico primario y está creando un paciente
  -- en la clínica que está seleccionando para sí mismo
  (primary_doctor_id = auth.uid() AND clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
);
```

---

## ✅ Escenarios Permitidos

### **Escenario 1: Usuario Activo en una Clínica** (Flujo Normal)

**Condición**: `is_user_in_clinic(clinic_id)` retorna `true`

**Requisitos**:
1. ✅ Usuario autenticado (`auth.uid()` existe)
2. ✅ Existe registro en `clinic_user_relationships` con:
   - `user_id = auth.uid()`
   - `clinic_id = <clinic_id_del_paciente>`
   - `status = 'approved'`
   - `is_active = true`

**Función RLS**:
```sql
-- Definida en: supabase/migrations/20250910000002_fix_rls_functions.sql:39-53
CREATE FUNCTION public.is_user_in_clinic(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $func$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = target_clinic_id
      AND status = 'approved'
      AND is_active = true
  );
$func$;
```

**Ejemplo de uso**:
```typescript
// Usuario con clinic_user_relationship aprobada
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'uuid-de-la-clinica',
    primary_doctor_id: 'uuid-del-doctor',
    full_name: 'Juan Pérez',
    // ... otros campos
  });
// ✅ PERMITIDO
```

---

### **Escenario 2: Nuevo Doctor creando su Primer Paciente** (Flujo de Onboarding)

**Condición**:
```sql
primary_doctor_id = auth.uid()
AND
clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
```

**Requisitos**:
1. ✅ Usuario autenticado (`auth.uid()` existe)
2. ✅ El usuario está registrando un paciente donde ÉL es el médico primario
3. ✅ El `clinic_id` del paciente coincide con el `clinic_id` en el perfil del usuario
4. ⚠️ El usuario tiene `clinic_id` configurado en su tabla `profiles`

**Propósito**:
Soluciona el problema "chicken and egg" donde un doctor nuevo no puede crear pacientes porque aún no tiene una relación aprobada en `clinic_user_relationships`.

**Ejemplo de uso**:
```typescript
// Doctor nuevo con clinic_id en su perfil pero sin relationship aprobada
const user = await supabase.auth.getUser();
const userId = user.data.user?.id;

const { data: profile } = await supabase
  .from('profiles')
  .select('clinic_id')
  .eq('id', userId)
  .single();

const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: profile.clinic_id,  // Mismo clinic_id del perfil
    primary_doctor_id: userId,     // El usuario es el médico primario
    full_name: 'Juan Pérez',
    // ... otros campos
  });
// ✅ PERMITIDO (flujo de onboarding)
```

---

## ❌ Escenarios Bloqueados

### **Caso 1: Usuario sin Relación con la Clínica**

```typescript
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'uuid-clinica-diferente',  // Clínica donde NO está el usuario
    primary_doctor_id: 'otro-doctor-uuid',
    full_name: 'Juan Pérez',
  });
// ❌ BLOQUEADO: is_user_in_clinic retorna false
// Error: new row violates row-level security policy
```

---

### **Caso 2: Médico creando paciente para otra clínica**

```typescript
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'clinica-B-uuid',      // Clínica diferente a la del perfil
    primary_doctor_id: auth.uid(),     // Aunque sea el médico primario
    full_name: 'Juan Pérez',
  });
// ❌ BLOQUEADO: clinic_id no coincide con el perfil del usuario
// Error: new row violates row-level security policy
```

---

### **Caso 3: Usuario sin clinic_id en profiles y sin relationship**

```typescript
// Usuario recién registrado sin clinic_id ni relationships
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'cualquier-uuid',
    primary_doctor_id: 'otro-doctor-uuid',
    full_name: 'Juan Pérez',
  });
// ❌ BLOQUEADO: No cumple ninguna de las dos condiciones
// Error: new row violates row-level security policy
```

---

## 🔍 Verificación de Permisos

### Verificar si un usuario puede crear pacientes en una clínica

```sql
-- Opción 1: Verificar relationship activa
SELECT
  EXISTS (
    SELECT 1
    FROM public.clinic_user_relationships
    WHERE user_id = auth.uid()
      AND clinic_id = '<clinic_id>'
      AND status = 'approved'
      AND is_active = true
  ) as puede_crear_via_relationship;

-- Opción 2: Verificar si puede usar el flujo de onboarding
SELECT
  (clinic_id = '<clinic_id>') as puede_crear_via_onboarding
FROM public.profiles
WHERE id = auth.uid();

-- Resultado combinado
SELECT
  CASE
    WHEN is_user_in_clinic('<clinic_id>') THEN 'Puede crear (relationship activa)'
    WHEN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND clinic_id = '<clinic_id>'
    ) THEN 'Puede crear (onboarding - como médico primario)'
    ELSE 'NO puede crear pacientes'
  END as estado_permisos;
```

---

## 📊 Diagrama de Flujo de Permisos

```
Usuario quiere crear paciente
         |
         v
¿Está autenticado? ──NO──> ❌ BLOQUEADO
         |
        SÍ
         |
         v
¿Tiene relationship aprobada y activa en la clínica?
         |
        SÍ ──────────────────────────────> ✅ PERMITIDO
         |
        NO
         |
         v
¿El usuario es el médico primario
 Y el clinic_id coincide con su perfil?
         |
        SÍ ──────────────────────────────> ✅ PERMITIDO (Onboarding)
         |
        NO
         |
         v
    ❌ BLOQUEADO
```

---

## 🛠️ Implementación en el Código

### Servicio de Pacientes
Ubicación: [src/features/patients/services/patientService.ts:47-91](src/features/patients/services/patientService.ts)

```typescript
export async function createPatient(
  patientData: PatientInsert,
  clinicId: string
): Promise<Patient> {
  // 1. La función NO verifica permisos explícitamente
  // 2. Confía en las políticas RLS de Supabase
  // 3. Si el usuario no tiene permisos, Supabase lanzará un error

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...patientData,
      clinic_id: clinicId,  // RLS verificará automáticamente
    })
    .select()
    .single();

  if (error) {
    // RLS violation resultará en un error aquí
    throw new Error(`Error al crear el paciente: ${error.message}`);
  }

  return data;
}
```

### ¿Por qué no hay verificación manual de permisos?

**Razón**: Las políticas RLS de Supabase son más seguras que verificaciones manuales porque:
1. ✅ Se aplican a nivel de base de datos (no se pueden bypasear)
2. ✅ Son atómicas (previenen race conditions)
3. ✅ Son consistentes (aplican a todos los métodos de acceso)
4. ✅ Son auditables (definidas en migraciones)

---

## ⚠️ Casos Edge

### Caso 1: Usuario con múltiples clínicas

```typescript
// Usuario pertenece a clínica A y clínica B
const { data: relationships } = await supabase
  .from('clinic_user_relationships')
  .select('clinic_id')
  .eq('user_id', auth.uid())
  .eq('status', 'approved')
  .eq('is_active', true);

// Resultado: [{ clinic_id: 'A' }, { clinic_id: 'B' }]

// Puede crear pacientes en ambas clínicas
await createPatient(patientData, 'A'); // ✅ PERMITIDO
await createPatient(patientData, 'B'); // ✅ PERMITIDO
await createPatient(patientData, 'C'); // ❌ BLOQUEADO
```

---

### Caso 2: Relación pendiente de aprobación

```typescript
// Relationship con status = 'pending'
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'clinica-pendiente-uuid',
    primary_doctor_id: auth.uid(),
    full_name: 'Juan Pérez',
  });
// ❌ BLOQUEADO: status debe ser 'approved'
// Error: new row violates row-level security policy
```

**Razón**: `is_user_in_clinic` requiere `status = 'approved'`

---

### Caso 3: Relación inactiva

```typescript
// Relationship con is_active = false
const { data, error } = await supabase
  .from('patients')
  .insert({
    clinic_id: 'clinica-inactiva-uuid',
    primary_doctor_id: auth.uid(),
    full_name: 'Juan Pérez',
  });
// ❌ BLOQUEADO: is_active debe ser true
// Error: new row violates row-level security policy
```

---

## 🔧 Solución de Problemas

### Error: "new row violates row-level security policy"

**Diagnóstico**:
```sql
-- 1. Verificar autenticación
SELECT auth.uid(); -- Debe retornar UUID, no NULL

-- 2. Verificar relationships
SELECT * FROM clinic_user_relationships
WHERE user_id = auth.uid()
  AND clinic_id = '<clinic_id_deseada>';

-- 3. Verificar perfil
SELECT clinic_id FROM profiles
WHERE id = auth.uid();

-- 4. Probar función RLS
SELECT is_user_in_clinic('<clinic_id_deseada>');
```

**Soluciones comunes**:
1. ✅ Aprobar la relación en `clinic_user_relationships` (cambiar status a 'approved')
2. ✅ Activar la relación (cambiar is_active a true)
3. ✅ Configurar clinic_id en el perfil del usuario
4. ✅ Crear una nueva relación si no existe

---

## 📝 Resumen

### Permisos Necesarios (CUALQUIERA de estos):

| # | Condición | Tabla | Campos Requeridos |
|---|-----------|-------|-------------------|
| 1 | **Relationship Activa** | `clinic_user_relationships` | `user_id = auth.uid()`<br>`clinic_id = <target_clinic>`<br>`status = 'approved'`<br>`is_active = true` |
| 2 | **Onboarding de Nuevo Doctor** | `profiles` | `id = auth.uid()`<br>`clinic_id = <target_clinic>`<br>**Y** paciente tiene `primary_doctor_id = auth.uid()` |

### Campos Requeridos en el INSERT:

```typescript
{
  clinic_id: string,        // UUID de la clínica (REQUERIDO)
  primary_doctor_id: string, // UUID del médico (REQUERIDO)
  full_name: string,         // Nombre completo (REQUERIDO)
  // ... otros campos opcionales
}
```

### Validaciones RLS Automáticas:
- ✅ Usuario autenticado
- ✅ Usuario pertenece a la clínica (relationship) O es médico primario con clinic_id correcto
- ✅ Clínica existe
- ✅ Médico primario existe

---

**Última actualización**: 2025-11-22
**Migraciones aplicables**: 20250910000002, 20250910000003
