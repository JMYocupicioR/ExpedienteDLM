---
name: supabase-migration
description: Cómo crear y gestionar migraciones SQL de Supabase para ExpedienteDLM
---

# Supabase Migration Skill

## Convenciones de este proyecto

### Naming
- Formato: `YYYYMMDDHHMMSS_descripcion_snake_case.sql`
- Ejemplo: `20260305000000_add_patient_notes_table.sql`
- Ubicación: `supabase/migrations/`

### Estructura de una migración

```sql
-- Descripción breve de la migración
-- Contexto: por qué se necesita este cambio

-- 1. Extensions (si aplica)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tablas nuevas
CREATE TABLE IF NOT EXISTS tabla_nueva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK siempre con REFERENCES y ON DELETE
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  clinic_id UUID REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Campos con CHECK constraints
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  -- JSONB para datos flexibles
  metadata JSONB,
  -- Timestamps obligatorios
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_tabla_nueva_patient_status 
  ON tabla_nueva(patient_id, status);

-- 4. Triggers de updated_at
DROP TRIGGER IF EXISTS trg_tabla_nueva_updated_at ON tabla_nueva;
CREATE TRIGGER trg_tabla_nueva_updated_at
  BEFORE UPDATE ON tabla_nueva
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- 5. RLS obligatorio
ALTER TABLE tabla_nueva ENABLE ROW LEVEL SECURITY;

-- 6. Policies (DROP IF EXISTS antes de CREATE)
DROP POLICY IF EXISTS "tabla_nueva_doctor_manage" ON tabla_nueva;
CREATE POLICY "tabla_nueva_doctor_manage" ON tabla_nueva
  FOR ALL USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

DROP POLICY IF EXISTS "tabla_nueva_patient_select" ON tabla_nueva;
CREATE POLICY "tabla_nueva_patient_select" ON tabla_nueva
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
  );
```

### Checklist OBLIGATORIO antes de aplicar

- [ ] Toda tabla nueva tiene `ENABLE ROW LEVEL SECURITY`
- [ ] Policies cubren: doctor (ALL), paciente (SELECT), admin si aplica
- [ ] Foreign keys con `ON DELETE CASCADE` donde corresponda
- [ ] `CREATE TABLE IF NOT EXISTS` y `DROP POLICY IF EXISTS` para idempotencia
- [ ] Índices para queries frecuentes (patient_id, doctor_id, status, date)
- [ ] Trigger `set_updated_at_timestamp()` si la tabla tiene `updated_at`
- [ ] No hardcodear IDs generados en migraciones de datos

### Patrones RLS del proyecto

| Actor | Patrón | Ejemplo |
|---|---|---|
| Doctor propio | `doctor_id = auth.uid()` | FOR ALL |
| Paciente propio | `patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())` | FOR SELECT |
| Paciente del doctor | `patient_id IN (SELECT id FROM patients WHERE primary_doctor_id = auth.uid())` | FOR SELECT |
| Global + propios | `is_global = TRUE OR doctor_id = auth.uid()` | Catálogos |

### Funciones SECURITY DEFINER

Usar `SECURITY DEFINER` solo para operaciones que requieren bypasear RLS:

```sql
CREATE OR REPLACE FUNCTION nombre_funcion(p_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lógica que necesita privilegios elevados
  RETURN FOUND;
END;
$$;
```

### Migraciones deshabilitadas

Agregar `.disabled` al nombre del archivo para migraciones que no deben aplicarse automáticamente:
```
20250916000001_add_advanced_consultation_fields.sql.disabled
```

### Comandos útiles

```powershell
# Aplicar migraciones locales
supabase db push

# Ver diferencias
supabase db diff

# Regenerar tipos TypeScript después de migración
npm run gen:types

# Reset completo local
supabase db reset
```

### Storage buckets

Si la migración crea buckets:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('nombre-bucket', 'nombre-bucket', false)
ON CONFLICT (id) DO NOTHING;
```

### Tablas principales del proyecto

Referencia rápida de FKs comunes:
- `profiles(id)` — usuarios/doctores (auth.users)
- `patients(id)` — pacientes
- `clinics(id)` — clínicas
- `consultations(id)` — consultas
- `prescriptions(id)` — recetas
- `appointments(id)` — citas
- `medical_scales(id)` — escalas médicas
- `exercise_library(id)` — biblioteca de ejercicios
- `automation_rules(id)` — reglas de automatización
