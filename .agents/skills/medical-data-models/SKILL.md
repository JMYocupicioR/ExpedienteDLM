---
name: medical-data-models
description: Modelos de datos médicos, tipos TypeScript y esquema de base de datos de ExpedienteDLM
---

# Medical Data Models Skill

## Tipos generados automáticamente

### Ubicación: `src/lib/database.types.ts` (~58KB)

Generado via:
```powershell
# Desde el proyecto remoto
npm run gen:types
# Desde Supabase local
npm run gen:types:local
```

**SIEMPRE regenerar tipos después de aplicar migraciones.**

## Tablas principales y sus relaciones

```
profiles (auth.users)
  ├── 1:N → patients (primary_doctor_id)
  ├── 1:N → clinics (owner_id)
  ├── 1:N → consultations (doctor_id)
  ├── 1:N → prescriptions (doctor_id)
  ├── 1:N → appointments (doctor_id)
  └── M:N → clinic_user_relationships (user_id)

patients
  ├── 1:N → consultations (patient_id)
  ├── 1:N → prescriptions (patient_id)
  ├── 1:N → appointments (patient_id)
  ├── 1:N → patient_tasks (patient_id)
  ├── 1:N → patient_exercise_assignments (patient_id)
  ├── 1:N → conversations (patient_id)
  ├── 1:N → scale_assessments (patient_id)
  ├── 1:N → patient_adherence (patient_id)
  ├── 1:1 → auth.users (patient_user_id)
  └── belongsTo → clinics (clinic_id)

clinics
  ├── 1:N → patients (clinic_id)
  ├── 1:N → appointments (clinic_id)
  ├── 1:N → clinic_user_relationships (clinic_id)
  ├── 1:N → clinic_rooms (clinic_id)
  └── 1:1 → clinic_configurations (clinic_id)
```

## Roles del sistema

### Tabla `profiles` — campo `role`
| Valor | Descripción |
|---|---|
| `super_admin` | Administrador global |
| `doctor` | Médico registrado |
| `patient` | Paciente vinculado |

### Tabla `clinic_user_relationships` — campo `role_in_clinic`
| Valor | Tipo |
|---|---|
| `owner` | Admin |
| `director` | Admin |
| `admin_staff` | Admin |
| `doctor` | Operacional |
| `physiotherapist` | Operacional |
| `nurse` | Operacional |
| `assistant` | Operacional |
| `administrative_assistant` | Invitable |

## Catálogos estáticos

### CIE-10: `src/data/cie10Data.ts` (~1.3MB)
Catálogo completo de clasificación internacional de enfermedades.

### Config médica: `src/lib/medicalConfig.ts` (~26KB)
Configuraciones por especialidad, campos de exploración física, signos vitales, etc.

### Templates de receta: `src/lib/prescriptionTemplates.ts`
Plantillas predefinidas de recetas médicas con layouts.

### Catálogos de registro: `src/lib/patient-registration-catalogs.ts`
Opciones para formularios de registro de pacientes.

## Patrones comunes con la DB

### Query con Supabase client
```typescript
import { supabase } from '@/lib/supabase';

// Select con FK join
const { data, error } = await supabase
  .from('patients')
  .select(`
    id, full_name, email,
    profiles:primary_doctor_id(full_name, specialty),
    clinics:clinic_id(name)
  `)
  .eq('clinic_id', clinicId)
  .order('created_at', { ascending: false });
```

### Tipos seguros con database.types
```typescript
import { Database } from '@/lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];
```

### RPC (funciones de PostgreSQL)
```typescript
const { data, error } = await supabase
  .rpc('nombre_funcion', { p_param: valor });
```

## Campos comunes en todas las tablas

| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID | `DEFAULT gen_random_uuid()` |
| `created_at` | TIMESTAMPTZ | `DEFAULT NOW()` |
| `updated_at` | TIMESTAMPTZ | `DEFAULT NOW()`, trigger automático |
| `doctor_id` | UUID | FK → profiles(id) |
| `clinic_id` | UUID | FK → clinics(id) |
| `patient_id` | UUID | FK → patients(id) ON DELETE CASCADE |
| `status` | TEXT | Con CHECK constraint |

## Validación

### Ubicación: `src/lib/validation.ts`

Funciones de validación para CURP, emails, teléfonos, etc.
Se usa en formularios con React Hook Form.
