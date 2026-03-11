---
name: security-and-rls
description: Seguridad, RLS, encryption y auditoría para ExpedienteDLM (app médica HIPAA/NOM-024)
---

# Security & RLS Skill

## Contexto crítico

ExpedienteDLM es una app **médica** que maneja PHI (Personal Health Information). Cumplimiento requerido:
- **NOM-024** (México) — Inalterabilidad de registros médicos
- **HIPAA** — Protección de datos de salud
- **Ley Federal de Protección de Datos Personales**

## Row Level Security (RLS)

### Regla de oro
> **TODA tabla nueva DEBE tener RLS habilitado.** Sin excepciones.

### Patrones establecidos

#### 1. Doctor gestiona sus propios recursos
```sql
CREATE POLICY "tabla_doctor_manage" ON tabla
  FOR ALL USING (doctor_id = (select auth.uid()))
  WITH CHECK (doctor_id = (select auth.uid()));
```

#### 2. Paciente ve solo lo suyo
```sql
CREATE POLICY "tabla_patient_select" ON tabla
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE patient_user_id = (select auth.uid()))
  );
```

#### 3. Paciente puede insertar/actualizar lo suyo
```sql
CREATE POLICY "tabla_patient_manage" ON tabla
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE patient_user_id = (select auth.uid()))
  )
  WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE patient_user_id = (select auth.uid()))
  );
```

#### 4. Doctor ve pacientes asignados
```sql
CREATE POLICY "tabla_doctor_select" ON tabla
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = (select auth.uid()))
  );
```

#### 5. Recursos globales + propios (catálogos)
```sql
CREATE POLICY "tabla_read_global_or_owner" ON tabla
  FOR SELECT USING (is_global = TRUE OR doctor_id = (select auth.uid()));
```

### Checklist de seguridad para nuevas features

- [ ] `ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;`
- [ ] Policies para cada operación (SELECT, INSERT, UPDATE, DELETE o FOR ALL)
- [ ] Sin policy `USING (true)` en producción
- [ ] SECURITY DEFINER solo cuando hay bypass justificado de RLS
- [ ] Datos sensibles en `PHI_FIELDS` si contienen info de paciente

## Encryption (PHI)

### Ubicación: `src/lib/encryption.ts`

### Campos protegidos (PHI_FIELDS)
```typescript
const PHI_FIELDS = [
  'social_security_number',
  'email', 'phone', 'address',
  'emergency_contact', 'insurance_info', 'notes'
];
```

### Funciones disponibles

| Función | Uso |
|---|---|
| `encryptPHI(plaintext)` | Encripta un campo individual (AES-GCM) |
| `decryptPHI(encrypted)` | Desencripta un campo |
| `encryptPatientPHI(patient)` | Encripta todos los PHI_FIELDS de un objeto paciente |
| `decryptPatientPHI(patient)` | Desencripta todos los PHI_FIELDS |
| `isEncrypted(value)` | Detecta si un string está encriptado |
| `redactPHI(data)` | Reemplaza PHI_FIELDS con `[REDACTED]` para logs |

### Reglas
- **NUNCA** loguear datos de pacientes sin `redactPHI()`
- Variable de entorno: `VITE_PHI_ENCRYPTION_KEY`
- Si agregas un campo sensible nuevo, agregarlo a `PHI_FIELDS`

## Auditoría (NOM-024)

### Ubicación: `src/lib/services/audit-service.ts`

La tabla `audit_logs` registra INSERT/UPDATE/DELETE automáticamente via triggers.

### Funciones del AuditService

| Método | Uso |
|---|---|
| `getAuditHistoryForRecord(table, recordId)` | Historial de un registro |
| `getPatientAuditHistory(patientId)` | Historial completo del paciente |
| `getClinicAuditStats(clinicId, days)` | Estadísticas de auditoría |
| `getAuditHistoryWithFilters(filters)` | Búsqueda con filtros avanzados |
| `verifyAuditIntegrity(table, recordId)` | Verificar integridad del audit trail |

### Principio de inalterabilidad
- Los registros de auditoría son **inmutables** (no UPDATE, no DELETE)
- La función `verifyAuditIntegrity` detecta gaps en el historial

## hCaptcha

### Ubicación: `src/lib/hcaptcha.ts`

- Variable de entorno: `VITE_HCAPTCHA_SITE_KEY`
- Edge function de verificación: `supabase/functions/verify-hcaptcha/`
- Componente: `@hcaptcha/react-hcaptcha`

## Auth Hooks de Supabase

### `before-user-created-hook`
- Se ejecuta antes de crear un usuario en auth
- Ubicación: `supabase/functions/before-user-created-hook/index.ts`

### `custom-access-token-hook`
- Personaliza el JWT access token
- Ubicación: `supabase/functions/custom-access-token-hook/index.ts`
- Configuración en `supabase/config.toml` sección `[auth.hook.*]`

## Roles del sistema

### Ubicación: `src/lib/roles.ts`

| Constante | Roles | Uso |
|---|---|---|
| `CLINIC_ADMIN_ROLES` | owner, director, admin_staff | Privilegios administrativos |
| `CLINIC_OPERATIONAL_ROLES` | doctor, physiotherapist, nurse, assistant, admin_staff | Operaciones clínicas |
| `APPOINTMENT_ELIGIBLE_ROLES` | owner, director, doctor, physiotherapist, nurse, assistant, admin_staff | Pueden tener citas asignadas |

### Helpers
- `isClinicAdminRole(role)` — ¿Tiene privilegios admin?
- `toDisplayRole(roleInClinic)` — Mapea role_in_clinic a display role
- `isAdminDisplayRole(role)` — ¿Es admin en el UI?

### El profile.role en la tabla `profiles`
- `super_admin` — Administrador global del sistema
- `doctor` — Médico registrado
- `patient` — Paciente vinculado
- Nunca cambiar el rol de un `super_admin` desde edge functions
