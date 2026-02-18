# ANÁLISIS COMPLETO DEL SISTEMA DE PLANTILLAS MÉDICAS
**Fecha:** 12 de Febrero de 2026  
**Sistema:** ExpedienteDLM-11 / KSV  

---

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tablas de Base de Datos](#tablas-de-base-de-datos)
4. [Flujo de Datos](#flujo-de-datos)
5. [Errores y Problemas Identificados](#errores-y-problemas-identificados)
6. [Sistema de Preferencias del Usuario](#sistema-de-preferencias-del-usuario)
7. [Recomendaciones](#recomendaciones)

---

## 1. RESUMEN EJECUTIVO

### Estado General
El sistema cuenta con **TRES subsistemas de plantillas paralelos** que actualmente NO están completamente integrados:

1. **Sistema de Plantillas Médicas (`medical_templates`)** - NUEVO (Feb 2026)
2. **Sistema de Plantillas de Examen Físico (`physical_exam_templates`)** - ANTIGUO
3. **Sistema de Plantillas de Prescripciones (`prescription_templates`)** - ANTIGUO

### Problemas Críticos Identificados
- ⚠️ **Duplicación de funcionalidad** entre sistemas
- ⚠️ **Falta de validación de integridad de datos JSONB**
- ⚠️ **Inconsistencias en políticas RLS**
- ⚠️ **Falta de migración de datos antiguos**
- ⚠️ **Sin versionado de plantillas predefinidas**

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Sistema Nuevo (Unificado) - `medical_templates`

**Migración:** `20260212002000_create_medical_templates_system.sql`

Este sistema busca unificar TODAS las plantillas médicas en una sola tabla con tres tipos:

```sql
type TEXT CHECK (type IN ('interrogatorio', 'exploracion', 'prescripcion'))
```

#### Características:
- ✅ Categorización mediante `template_categories`
- ✅ Sistema de favoritos (`template_favorites`)
- ✅ Tracking de uso (`template_usage`)
- ✅ Soporte para contenido estructurado en JSONB
- ✅ Etiquetado con `tags TEXT[]`
- ✅ Control de visibilidad (`is_public`, `is_predefined`)
- ✅ Soft delete mediante `is_active`

#### Estructura de Contenido (JSONB):

```typescript
interface TemplateContent {
  sections: TemplateSection[];
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  order?: number;
  
  // Para interrogatorio y exploración física
  fields?: TemplateField[];
  
  // Para prescripciones de fisioterapia
  exercises?: Exercise[];
  
  // Para prescripciones nutricionales
  categories?: DietCategory[];
  
  // Contenido de texto libre
  content?: string;
}
```

### 2.2 Sistema Antiguo - `physical_exam_templates`

**Ubicación:** Backup en `backup_before_independent_doctors_20251122_172447.sql`

```sql
CREATE TABLE physical_exam_templates (
  id UUID PRIMARY KEY,
  doctor_id UUID,
  name TEXT NOT NULL,
  definition JSONB NOT NULL,
  template_type TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  parent_template_id UUID  -- ⚠️ Versionado NO implementado
)
```

#### Estructura de `definition` (JSONB):
```typescript
interface TemplateDefinition {
  version: string;
  sections: Section[];
  metadata?: {
    lastModified: string;
    author: string;
    description: string;
  }
}

interface Section {
  id: string;
  title: string;
  description?: string;
  order?: number;
  questions?: Question[];  // ⚠️ Se llaman "questions" pero son "fields"
}
```

### 2.3 Sistema Antiguo - `prescription_templates`

```sql
CREATE TABLE prescription_templates (
  id UUID PRIMARY KEY,
  doctor_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  medications JSONB NOT NULL,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  style_definition JSONB,  -- ⚠️ Campo NO documentado
  deleted_at TIMESTAMPTZ    -- ⚠️ Soft delete incompleto
)
```

#### Problema: Sin esquema definido para `medications`:
```typescript
// ❌ NO HAY VALIDACIÓN
medications: any[]

// ✅ DEBERÍA SER:
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
```

---

## 3. TABLAS DE BASE DE DATOS

### 3.1 Tabla: `medical_templates` ✅ RECOMENDADA

| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|-----------|
| `id` | UUID | PK | Auto-generado |
| `user_id` | UUID | FK → auth.users | CASCADE |
| `clinic_id` | UUID | FK → clinics | CASCADE |
| `category_id` | UUID | FK → template_categories | SET NULL |
| `name` | TEXT | Nombre de plantilla | NOT NULL |
| `description` | TEXT | Descripción opcional | - |
| `type` | TEXT | tipo de plantilla | CHECK IN ('interrogatorio', 'exploracion', 'prescripcion') |
| `specialty` | TEXT | Especialidad médica | - |
| `content` | JSONB | Contenido estructurado | DEFAULT '{"sections": []}' |
| `tags` | TEXT[] | Etiquetas | DEFAULT '{}' |
| `is_public` | BOOLEAN | Visible para todos | DEFAULT false |
| `is_predefined` | BOOLEAN | Plantilla del sistema | DEFAULT false |
| `is_active` | BOOLEAN | Soft delete | DEFAULT true |
| `usage_count` | INTEGER | Contador de uso | DEFAULT 0 |
| `created_by` | UUID | FK → auth.users | SET NULL |
| `updated_by` | UUID | FK → auth.users | SET NULL |

**Índices:**
- ✅ `idx_medical_templates_user_id`
- ✅ `idx_medical_templates_clinic_id`
- ✅ `idx_medical_templates_category_id`
- ✅ `idx_medical_templates_type`
- ✅ `idx_medical_templates_is_public`
- ✅ `idx_medical_templates_usage_count DESC`

**Políticas RLS:**
```sql
-- ✅ CORRECTA: Ver plantillas propias, públicas, predefinidas o de la clínica
CREATE POLICY "medical_templates_select" ON medical_templates
  FOR SELECT USING (
    is_active = true AND (
      user_id = auth.uid() OR 
      is_public = true OR 
      is_predefined = true OR
      clinic_id IN (SELECT clinic_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ✅ CORRECTA: Solo el propietario puede actualizar
CREATE POLICY "medical_templates_update" ON medical_templates
  FOR UPDATE USING (user_id = auth.uid());
```

### 3.2 Tabla: `template_categories` ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | Nombre único por tipo |
| `description` | TEXT | Descripción |
| `icon` | TEXT | Icono de UI |
| `type` | TEXT | CHECK IN ('interrogatorio', 'exploracion', 'prescripcion', 'general') |
| `is_predefined` | BOOLEAN | Categoría del sistema |

**Constraint:**
```sql
UNIQUE(name, type)  -- ✅ Previene duplicados
```

**Categorías Predefinidas:**
```sql
INSERT INTO template_categories (name, type, is_predefined) VALUES
  ('Medicina Interna', 'interrogatorio', true),
  ('Cardiología', 'interrogatorio', true),
  ('Traumatología', 'exploracion', true),
  ('Fisioterapia', 'prescripcion', true),
  ('Nutrición', 'prescripcion', true);
```

### 3.3 Tabla: `template_favorites` ✅

Permite a los usuarios marcar plantillas favoritas:

```sql
CREATE TABLE template_favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES medical_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, template_id)  -- ✅ Previene duplicados
);
```

### 3.4 Tabla: `template_usage` ✅

Tracking de uso para analytics:

```sql
CREATE TABLE template_usage (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES medical_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT now(),
  context JSONB  -- ⚠️ Sin esquema definido
);
```

**Trigger Automático:**
```sql
-- ✅ Incrementa usage_count automáticamente
CREATE TRIGGER trigger_increment_template_usage_count
  AFTER INSERT ON template_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage_count();
```

### 3.5 Tabla: `physical_exam_templates` ⚠️ OBSOLETA

**Problemas:**
1. ❌ No tiene `clinic_id` → imposible filtrar por clínica
2. ❌ No tiene sistema de favoritos
3. ❌ No tiene tracking de uso
4. ❌ Versionado (`version`, `parent_template_id`) NO implementado
5. ❌ RLS incompleto (solo filtra por `doctor_id`)

### 3.6 Tabla: `physical_exam_drafts` ✅ ÚTIL

Almacena borradores de examen físico en progreso:

```sql
CREATE TABLE physical_exam_drafts (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  template_id UUID,
  draft_data JSONB NOT NULL,  -- ⚠️ Sin validación
  last_modified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Problema:** Falta RLS y índices.

### 3.7 Tabla: `prescription_templates` ⚠️ OBSOLETA

**Problemas:**
1. ❌ Campo `category` es TEXT libre (debería ser FK)
2. ❌ Campo `diagnosis` obligatorio (debería ser opcional)
3. ❌ Campo `style_definition` NO documentado
4. ❌ Soft delete con `deleted_at` pero sin filtros automáticos
5. ❌ No tiene `clinic_id`

### 3.8 Tabla: `prescriptions` ✅ TABLA DE DATOS (NO PLANTILLAS)

Esta tabla almacena **recetas emitidas**, NO plantillas:

```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  prescription_date TIMESTAMPTZ DEFAULT now(),
  medications JSONB DEFAULT '[]',  -- ⚠️ Sin validación
  instructions TEXT,
  notes TEXT,
  diagnosis TEXT,  -- ✅ Agregado después
  expires_at TIMESTAMPTZ,  -- ✅ Agregado después
  visual_layout JSONB,  -- ✅ Agregado después (para imprimir)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:**
```sql
-- ⚠️ PROBLEMA: Solo filtra por clinic_id, NO por doctor_id
CREATE POLICY "prescriptions_select_own_clinic" ON prescriptions
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_user_relationships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

**Problema de seguridad:** Un doctor puede ver recetas de TODOS los doctores de su clínica, incluso si no las emitió él.

---

## 4. FLUJO DE DATOS

### 4.1 Creación de Plantilla de Interrogatorio

**Frontend:** `TemplateEditor.tsx` (líneas 43-756)

```typescript
// 1. Usuario crea plantilla mediante editor visual
const handleSave = async () => {
  // Sanitiza contenido antes de guardar
  const sanitizedData = {
    ...templateData,
    name: templateData.name.trim(),
    content: sanitizeTemplateContent(templateData.content)
  };

  // 2. Llama al hook
  await createTemplate(sanitizedData);
}
```

**Hook:** `useTemplates.ts` (líneas 211-253)

```typescript
const createTemplate = useCallback(async (templateData: TemplateFormData) => {
  // 1. Validación de usuario autenticado
  if (!user) throw new Error('Usuario no autenticado');

  // 2. Sanitización de contenido JSONB
  const sanitizedData = {
    ...templateData,
    content: sanitizeTemplateContent(templateData.content)
  };

  // 3. Inserción en BD
  const newTemplate = {
    user_id: user.id,
    clinic_id: profile?.clinic_id,
    created_by: user.id,
    ...sanitizedData
  };

  const { data, error } = await supabase
    .from('medical_templates')
    .insert([newTemplate])
    .select('*')
    .single();

  if (error) throw error;
  
  // 4. Actualizar cache local
  setTemplates(prev => [data, ...prev]);
  
  return data;
}, [user, profile]);
```

**Función de Sanitización:** (líneas 19-73)

```typescript
function sanitizeTemplateContent(content: TemplateContent): TemplateContent {
  if (!content?.sections) return content;

  const sanitizedSections = content.sections.map(section => {
    const sanitized = { ...section };

    // Sanitizar ejercicios (para fisioterapia)
    if (section.exercises?.length > 0) {
      sanitized.exercises = section.exercises
        .map(ex => ({
          name: (ex.name || '').trim(),
          description: (ex.description || '').trim(),
          repetitions: (ex.repetitions || '').trim(),
          frequency: (ex.frequency || '').trim(),
          duration: (ex.duration || '').trim() || undefined,
          intensity: (ex.intensity || '').trim() || undefined,
          precautions: (ex.precautions || [])
            .map(p => (p || '').trim())
            .filter(p => p.length > 0)
        }))
        .filter(ex => ex.name.length > 0);  // ✅ Eliminar ejercicios vacíos
    }

    // Sanitizar categorías de dieta
    if (section.categories?.length > 0) {
      sanitized.categories = section.categories
        .filter(c => c?.category?.trim())
        .map(c => ({
          category: c.category.trim(),
          servings: c.servings?.trim(),
          examples: c.examples?.trim(),
          notes: c.notes?.trim() || undefined
        }));
    }

    return sanitized;
  });

  return { ...content, sections: sanitizedSections };
}
```

**⚠️ PROBLEMA:** Esta sanitización es en el frontend. Si alguien hace un INSERT directo en la BD, puede insertar datos inconsistentes.

### 4.2 Uso de Plantilla en Consulta

**Flujo:**

1. Usuario abre consulta → `ConsultationForm.tsx`
2. Selecciona plantilla de interrogatorio → `InterrogatorioTabsPanel.tsx`
3. Ejecuta plantilla paso a paso → `TemplateRunnerModal.tsx`
4. Genera texto formateado de respuestas
5. Inserta texto en campo `current_condition`
6. Guarda consulta:

```typescript
const consultationData = {
  patient_id: patientId,
  doctor_id: doctorId,
  current_condition: data.current_condition,
  interrogatorio_structured: interrogatorioStructured,  // ✅ Guarda datos estructurados
  vital_signs: data.vital_signs,
  physical_examination: data.physical_examination,
  diagnosis: data.diagnosis,
  treatment: data.treatment
};

await supabase.from('consultations').insert(consultationData);
```

**Problema:** El campo `interrogatorio_structured` es JSONB sin validación. Puede contener cualquier estructura.

### 4.3 Registro de Uso de Plantilla

**Hook:** `useTemplates.ts` (líneas 422-445)

```typescript
const recordTemplateUsage = useCallback(async (
  templateId: string, 
  context: { patientId?: string; consultationId?: string } = {}
) => {
  if (!user) return;

  const usage = {
    template_id: templateId,
    user_id: user.id,
    patient_id: context.patientId,
    consultation_id: context.consultationId,
    context  // ⚠️ Campo abierto sin validación
  };

  await supabase.from('template_usage').insert([usage]);
}, [user]);
```

**Trigger en BD:**

```sql
-- ✅ Incrementa contador automáticamente
CREATE FUNCTION increment_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE medical_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.4 Exploración Física con Plantillas

**Flujo Antiguo (usando `physical_exam_templates`):**

1. Usuario selecciona plantilla → `ExploracionTabsPanel.tsx`
2. Se convierte formato antiguo a nuevo → `convertTemplateDefinition()`:

```typescript
const convertTemplateDefinition = (template: PhysicalExamTemplate) => {
  const definition = template.definition as TemplateDefinition;

  return {
    sections: definition.sections.map(section => ({
      id: section.id,
      title: section.title,
      description: section.description || '',
      order: section.order || 0,
      fields: section.questions?.map(question => ({  // ⚠️ "questions" → "fields"
        id: question.id,
        label: question.label,
        type: question.type,
        required: question.required || false,
        placeholder: question.placeholder || '',
        options: question.options || []
      })) || []
    }))
  };
};
```

3. Renderiza formulario dinámico → `DynamicPhysicalExamForm.tsx`
4. Usuario completa examen físico
5. Guarda datos en consulta:

```typescript
setValue('physical_examination', {
  template_id: selectedTemplate?.id,
  template_name: selectedTemplate?.name,
  exam_date: data.examDate,
  exam_time: data.examTime,
  vital_signs: data.vitalSigns,
  sections: data.sections,
  general_observations: data.generalObservations
});
```

**Problema:** Mezcla de dos sistemas (antiguo y nuevo).

### 4.5 Prescripciones y Recetas

**Dos Flujos Paralelos:**

#### A) Sistema de Plantillas de Prescripción (Nuevo)

1. Usuario crea plantilla de prescripción con ejercicios/dieta
2. Guarda en `medical_templates` con `type = 'prescripcion'`
3. Al usar plantilla, genera texto en campo `treatment`

#### B) Emisión de Receta Directa (Antiguo)

1. Usuario completa consulta
2. Activa "Módulo de Receta Rápida" → `ConsultationForm.tsx` (líneas 1964-2066)
3. Ingresa medicamentos manualmente
4. Al guardar consulta, crea registro en `prescriptions`:

```typescript
const createAndLinkPrescription = async (consultationId: string) => {
  const filledMeds = rxMedications.filter(m => 
    m.name && m.dosage && m.frequency && m.duration
  );

  // Validación de medicamentos
  const medsValidation = validateMedicationsField(filledMeds);
  if (!medsValidation.isValid) {
    throw new Error(medsValidation.errors.join('; '));
  }

  // Calcular fecha de expiración
  const expires = calculatePrescriptionExpiry(
    filledMeds.map(m => m.name)
  ).toISOString();

  // Insertar receta
  const { data: inserted } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      consultation_id: consultationId,
      medications: filledMeds,
      diagnosis: prescriptionDiagnosis,
      notes: prescriptionNotes,
      status: 'active',
      expires_at: expires,
      visual_layout: visualLayoutToSave  // ⚠️ Sin validación
    })
    .select('id')
    .single();

  // Vincular a consulta
  await supabase
    .from('consultation_prescriptions')
    .insert({ 
      consultation_id: consultationId, 
      prescription_id: inserted.id 
    });
};
```

**⚠️ PROBLEMA:** 
- No valida `visual_layout` JSONB
- No valida estructura de `medications` JSONB
- La tabla `consultation_prescriptions` NO existe en las migraciones analizadas

---

## 5. ERRORES Y PROBLEMAS IDENTIFICADOS

### 5.1 🔴 CRÍTICOS (Seguridad y Pérdida de Datos)

#### **Error 1: Falta de Validación JSONB**

**Ubicación:** TODAS las tablas con campos JSONB

**Problema:**
```sql
-- ❌ Cualquier JSON es válido, incluso {}
content JSONB DEFAULT '{"sections": []}'
medications JSONB DEFAULT '[]'
visual_layout JSONB
```

**Impacto:**
- Datos inconsistentes en BD
- Errores en tiempo de ejecución al leer
- Imposible confiar en la estructura

**Solución Propuesta:**

```sql
-- ✅ Agregar función de validación
CREATE FUNCTION validate_template_content(content JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Debe tener campo "sections" como array
  IF NOT (content ? 'sections' AND jsonb_typeof(content->'sections') = 'array') THEN
    RETURN FALSE;
  END IF;
  
  -- Cada sección debe tener "id" y "title"
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(content->'sections') AS section
    WHERE NOT (section ? 'id' AND section ? 'title')
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ✅ Agregar constraint
ALTER TABLE medical_templates
ADD CONSTRAINT medical_templates_content_valid
CHECK (validate_template_content(content));
```

#### **Error 2: RLS Inseguro en Prescripciones**

**Ubicación:** `20250828000001_create_prescriptions_table.sql` (líneas 32-38)

**Problema:**
```sql
-- ❌ Un doctor puede ver recetas de TODOS los doctores de su clínica
CREATE POLICY "prescriptions_select_own_clinic" ON prescriptions
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_user_relationships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

**Impacto:** Violación de privacidad médica

**Solución:**
```sql
-- ✅ Solo puede ver recetas que emitió o del paciente que atiende
CREATE POLICY "prescriptions_select_secure" ON prescriptions
  FOR SELECT USING (
    doctor_id = auth.uid()
    OR patient_id IN (
      SELECT id FROM patients 
      WHERE doctor_id = auth.uid() OR clinic_id IN (
        SELECT clinic_id FROM clinic_user_relationships
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
```

#### **Error 3: Tabla `consultation_prescriptions` Inexistente**

**Ubicación:** `ConsultationForm.tsx` (línea 712)

**Problema:**
```typescript
// ❌ Intenta insertar en tabla que NO EXISTE
await supabase
  .from('consultation_prescriptions')
  .insert({ consultation_id, prescription_id });
```

**Impacto:** Error en runtime al emitir receta

**Solución:**
```sql
-- ✅ Crear tabla faltante
CREATE TABLE consultation_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consultation_id, prescription_id)
);

-- Índices
CREATE INDEX idx_consultation_prescriptions_consultation 
  ON consultation_prescriptions(consultation_id);
CREATE INDEX idx_consultation_prescriptions_prescription 
  ON consultation_prescriptions(prescription_id);

-- RLS
ALTER TABLE consultation_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultation_prescriptions_select" 
  ON consultation_prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_prescriptions.consultation_id
        AND c.doctor_id = auth.uid()
    )
  );
```

#### **Error 4: Falta RLS en `physical_exam_drafts`**

**Ubicación:** Backup (línea 3046)

**Problema:**
```sql
CREATE TABLE physical_exam_drafts (...);
-- ❌ NO tiene ENABLE ROW LEVEL SECURITY
```

**Impacto:** Cualquier usuario autenticado puede leer borradores de otros

**Solución:**
```sql
ALTER TABLE physical_exam_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "physical_exam_drafts_own" ON physical_exam_drafts
  FOR ALL USING (doctor_id = auth.uid());
```

### 5.2 🟡 ADVERTENCIAS (Funcionamiento Incorrecto)

#### **Advertencia 1: Sistemas Duplicados**

**Problema:** Coexisten 3 sistemas de plantillas:

| Sistema | Tabla | Estado |
|---------|-------|--------|
| Nuevo Unificado | `medical_templates` | ✅ Activo, recomendado |
| Antiguo Examen Físico | `physical_exam_templates` | ⚠️ En uso, obsoleto |
| Antiguo Prescripciones | `prescription_templates` | ⚠️ En uso, obsoleto |

**Impacto:**
- Confusión en desarrollo
- Datos fragmentados
- Mantenimiento duplicado

**Solución:**
```sql
-- Migración de datos
INSERT INTO medical_templates (
  user_id, name, type, content, created_at
)
SELECT 
  doctor_id,
  name,
  'exploracion',
  definition,
  created_at
FROM physical_exam_templates
WHERE is_active = true;

-- Marcar tablas antiguas como deprecated
COMMENT ON TABLE physical_exam_templates IS 
  'DEPRECATED: Use medical_templates instead. This table will be removed in v2.0';
```

#### **Advertencia 2: Falta Índice en `physical_exam_drafts`**

**Problema:**
```sql
-- ❌ Sin índices para consultas frecuentes
SELECT * FROM physical_exam_drafts
WHERE patient_id = ? AND doctor_id = ?
ORDER BY last_modified DESC;
```

**Solución:**
```sql
CREATE INDEX idx_physical_exam_drafts_patient_doctor 
  ON physical_exam_drafts(patient_id, doctor_id);
CREATE INDEX idx_physical_exam_drafts_last_modified 
  ON physical_exam_drafts(last_modified DESC);
```

#### **Advertencia 3: Conversión de Formatos Manual**

**Ubicación:** `ConsultationForm.tsx` (líneas 442-470)

**Problema:**
```typescript
// ❌ Conversión manual propensa a errores
const convertTemplateDefinition = (template) => {
  return {
    sections: definition.sections.map(section => ({
      fields: section.questions?.map(question => ({ ... }))
    }))
  };
};
```

**Impacto:** Si cambia estructura de `physical_exam_templates`, se rompe

**Solución:** Migrar completamente a `medical_templates`

#### **Advertencia 4: Soft Delete Inconsistente**

**Problema:**

| Tabla | Soft Delete |
|-------|-------------|
| `medical_templates` | ✅ `is_active = false` |
| `physical_exam_templates` | ✅ `is_active = false` |
| `prescription_templates` | ⚠️ `deleted_at IS NOT NULL` |

**Impacto:** Consultas deben recordar filtrar diferente según tabla

**Solución:** Estandarizar a `is_active`:
```sql
ALTER TABLE prescription_templates 
ADD COLUMN is_active BOOLEAN DEFAULT true;

UPDATE prescription_templates 
SET is_active = false 
WHERE deleted_at IS NOT NULL;

-- Agregar a políticas RLS
... AND is_active = true
```

### 5.3 🔵 MEJORAS (Optimización)

#### **Mejora 1: Cache de Plantillas Populares**

**Problema:** Las plantillas predefinidas se consultan en cada carga

**Solución:**
```sql
CREATE MATERIALIZED VIEW popular_templates AS
SELECT 
  id, name, type, specialty, description, tags, usage_count
FROM medical_templates
WHERE is_predefined = true OR is_public = true
  AND is_active = true
ORDER BY usage_count DESC
LIMIT 50;

CREATE UNIQUE INDEX ON popular_templates(id);

-- Refrescar cada hora
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'refresh-popular-templates',
  '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY popular_templates'
);
```

#### **Mejora 2: Full-Text Search en Plantillas**

**Problema:** Búsqueda actual usa ILIKE (lento):
```typescript
query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
```

**Solución:**
```sql
-- Agregar columna de búsqueda
ALTER TABLE medical_templates
ADD COLUMN search_vector tsvector;

-- Índice GIN
CREATE INDEX idx_medical_templates_search 
  ON medical_templates USING GIN(search_vector);

-- Trigger de actualización
CREATE FUNCTION update_template_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('spanish', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.specialty, '')), 'C') ||
    setweight(to_tsvector('spanish', array_to_string(NEW.tags, ' ')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_search_vector
  BEFORE INSERT OR UPDATE ON medical_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_search_vector();

-- Uso en query
SELECT * FROM medical_templates
WHERE search_vector @@ plainto_tsquery('spanish', 'cardiología diabetes');
```

#### **Mejora 3: Versionado Real de Plantillas**

**Problema:** Campo `version` existe pero NO se usa:

```sql
-- ❌ Version y parent_template_id NO implementados
version INTEGER DEFAULT 1,
parent_template_id UUID
```

**Solución:**
```sql
-- Trigger de versionado automático
CREATE FUNCTION version_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es actualización de plantilla predefinida
  IF OLD.is_predefined = true THEN
    -- Crear nueva versión en lugar de actualizar
    INSERT INTO medical_templates (
      user_id, clinic_id, category_id, name, description,
      type, specialty, content, tags, is_public, is_predefined,
      parent_template_id, version
    ) VALUES (
      NEW.user_id, NEW.clinic_id, NEW.category_id, NEW.name, NEW.description,
      NEW.type, NEW.specialty, NEW.content, NEW.tags, NEW.is_public, NEW.is_predefined,
      OLD.id,  -- Referencia a versión anterior
      OLD.version + 1
    );
    
    -- Prevenir actualización del original
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. SISTEMA DE PREFERENCIAS DEL USUARIO

### 6.1 Tabla: `user_clinic_preferences`

**Migración:** `20251006030000_create_clinic_configuration_system.sql` (líneas 93-140)

```sql
CREATE TABLE user_clinic_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Preferencias de Consulta
  preferred_consultation_duration INTEGER DEFAULT 30,
  my_schedule JSONB DEFAULT '{}'::jsonb,
  
  -- Preferencias de Expediente
  default_note_template TEXT,
  favorite_diagnoses TEXT[] DEFAULT ARRAY[]::TEXT[],
  frequent_medications JSONB DEFAULT '[]'::jsonb,  -- ⚠️ Sin validación
  
  -- Preferencias de UI
  sidebar_collapsed BOOLEAN DEFAULT false,
  dashboard_widgets JSONB DEFAULT '["upcoming_appointments", "recent_patients", "pending_tasks"]'::jsonb,
  quick_actions JSONB DEFAULT '["new_consultation", "search_patient", "new_prescription"]'::jsonb,
  
  -- Notificaciones
  notification_preferences JSONB DEFAULT '{
    "email_appointments": true,
    "email_emergencies": true,
    "desktop_notifications": true,
    "sound_alerts": false
  }'::jsonb,
  
  -- Atajos de Teclado
  keyboard_shortcuts JSONB DEFAULT '{}'::jsonb,
  
  -- Plantillas Personalizadas
  custom_templates JSONB DEFAULT '[]'::jsonb,  -- ⚠️ Duplica medical_templates
  
  -- Exportación
  export_preferences JSONB DEFAULT '{
    "format": "pdf",
    "include_signature": true,
    "include_logo": true
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, clinic_id)
);
```

**Características:**
- ✅ Preferencias por usuario Y por clínica (clave compuesta)
- ✅ Valores por defecto razonables
- ✅ RLS seguro (`user_id = auth.uid()`)
- ⚠️ Campos JSONB sin validación
- ⚠️ Campo `custom_templates` duplica funcionalidad de `medical_templates`

### 6.2 Tabla: `clinic_configurations`

**Propósito:** Configuraciones globales de la clínica (administradores)

```sql
CREATE TABLE clinic_configurations (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Configuración General
  timezone TEXT DEFAULT 'America/Mexico_City',
  language TEXT DEFAULT 'es',
  
  -- Consultas
  default_consultation_duration INTEGER DEFAULT 30,
  enable_teleconsultation BOOLEAN DEFAULT false,
  max_patients_per_day INTEGER DEFAULT 20,
  
  -- Horarios
  business_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "open": "09:00", "close": "18:00"},
    ...
  }',
  
  -- Expediente
  enable_soap_format BOOLEAN DEFAULT true,
  enable_cie10_integration BOOLEAN DEFAULT true,
  require_diagnosis BOOLEAN DEFAULT true,
  require_physical_exam BOOLEAN DEFAULT false,
  
  -- Recetas
  prescription_template_id UUID,  -- ⚠️ FK no definida
  enable_electronic_prescription BOOLEAN DEFAULT false,
  
  -- UI/UX
  theme_color TEXT DEFAULT '#3B82F6',
  logo_url TEXT,
  custom_branding JSONB DEFAULT '{}'
);
```

**RLS:**
```sql
-- ✅ Solo admins pueden modificar
CREATE POLICY "clinic_admins_can_manage_config" ON clinic_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clinic_user_relationships
      WHERE clinic_id = clinic_configurations.clinic_id
        AND user_id = auth.uid()
        AND role_in_clinic = 'admin_staff'
        AND is_active = true
    )
  );

-- ✅ Usuarios pueden leer (read-only)
CREATE POLICY "users_can_read_their_clinic_config" ON clinic_configurations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clinic_user_relationships
      WHERE clinic_id = clinic_configurations.clinic_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );
```

### 6.3 Tabla: `consultation_configurations`

**Propósito:** Preferencias específicas de consulta por usuario

**Migración:** `20260206000000_create_consultation_configurations.sql`

```sql
CREATE TABLE consultation_configurations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Modo de Inicio
  general_config JSONB DEFAULT '{
    "start_mode": "classic",
    "hide_physical_exam": false,
    "unify_hpi": false,
    "consultation_start_mode": "free_text"  -- ✅ Usado en código
  }',
  
  -- HPI (Historia del Padecimiento Actual)
  hpi_config JSONB DEFAULT '{
    "enable_voice": false,
    "enable_autocomplete": true,
    "show_chronology": true
  }',
  
  -- Alertas
  alerts_config JSONB DEFAULT '{
    "alert_missing_prescription": true,
    "alert_missing_diagnosis": true,
    "alert_allergies": true,
    "alert_vital_signs": false
  }',
  
  -- Prescripciones
  prescription_config JSONB DEFAULT '{
    "add_brand_name": false,
    "natural_language_instructions": true,
    "include_diagnosis": false,
    "include_next_appointment": true,
    "default_digital_signature": true
  }',
  
  -- Automatización
  automation_config JSONB DEFAULT '{
    "auto_send_prescription": false,
    "generate_summary": false
  }',
  
  UNIQUE(user_id, clinic_id)
);
```

**Uso en Código:**

`ConsultationForm.tsx` (líneas 145-154):
```typescript
useEffect(() => {
  if (config?.general_config) {
    setShowPhysicalExam(!config.general_config.hide_physical_exam);
  }
  if (config?.hpi_config) {
    setShowSmartAnalyzer(config.hpi_config.enable_autocomplete);
  }
}, [config]);
```

**Problemas:**
1. ❌ Campos JSONB sin esquema validado
2. ❌ Duplica funcionalidad de `user_clinic_preferences`
3. ❌ No tiene trigger de actualización de `updated_at`

### 6.4 Sistema de Cache: `active_clinic_configs_cache`

**Propósito:** Cache de configuración combinada (clínica + usuario)

```sql
CREATE TABLE active_clinic_configs_cache (
  user_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  computed_config JSONB NOT NULL,  -- Config combinada
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, clinic_id)
);
```

**Función de Generación:**

```sql
CREATE FUNCTION get_effective_config(p_user_id UUID, p_clinic_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_clinic_config JSONB;
  v_user_preferences JSONB;
BEGIN
  -- 1. Obtener config de clínica
  SELECT to_jsonb(cc.*) INTO v_clinic_config
  FROM clinic_configurations cc
  WHERE cc.clinic_id = p_clinic_id;
  
  -- 2. Obtener preferencias de usuario
  SELECT to_jsonb(ucp.*) INTO v_user_preferences
  FROM user_clinic_preferences ucp
  WHERE ucp.user_id = p_user_id
    AND ucp.clinic_id = p_clinic_id;
  
  -- 3. Combinar (user preferences sobrescriben clinic config)
  v_combined_config := v_clinic_config || v_user_preferences;
  
  -- 4. Actualizar cache
  INSERT INTO active_clinic_configs_cache (user_id, clinic_id, computed_config)
  VALUES (p_user_id, p_clinic_id, v_combined_config)
  ON CONFLICT (user_id, clinic_id)
  DO UPDATE SET computed_config = v_combined_config, last_updated = NOW();
  
  RETURN v_combined_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Invalidación Automática:**

```sql
CREATE FUNCTION invalidate_config_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM active_clinic_configs_cache
  WHERE clinic_id = COALESCE(NEW.clinic_id, OLD.clinic_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers en ambas tablas
CREATE TRIGGER trigger_invalidate_clinic_config_cache
  AFTER INSERT OR UPDATE OR DELETE ON clinic_configurations
  FOR EACH ROW EXECUTE FUNCTION invalidate_config_cache();

CREATE TRIGGER trigger_invalidate_user_preferences_cache
  AFTER INSERT OR UPDATE OR DELETE ON user_clinic_preferences
  FOR EACH ROW EXECUTE FUNCTION invalidate_config_cache();
```

**Problema:** La función `get_effective_config()` NO se usa en el código frontend.

### 6.5 Almacenamiento de Plantillas Favoritas

**Tabla:** `template_favorites`

```sql
CREATE TABLE template_favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES medical_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, template_id)
);
```

**Hook:** `useTemplates.ts` (líneas 387-419)

```typescript
const toggleFavorite = useCallback(async (templateId: string) => {
  if (!user) throw new Error('Usuario no autenticado');

  const existingFavorite = favorites.find(f => f.template_id === templateId);

  if (existingFavorite) {
    // Quitar de favoritos
    const { error } = await supabase
      .from('template_favorites')
      .delete()
      .eq('id', existingFavorite.id);

    if (error) throw error;
    setFavorites(prev => prev.filter(f => f.id !== existingFavorite.id));
    return false;
  } else {
    // Agregar a favoritos
    const { data, error } = await supabase
      .from('template_favorites')
      .insert([{ user_id: user.id, template_id: templateId }])
      .select('*')
      .single();

    if (error) throw error;
    setFavorites(prev => [...prev, data]);
    return true;
  }
}, [user, favorites]);
```

**✅ Implementación correcta**

---

## 7. RECOMENDACIONES

### 7.1 Prioridad ALTA (Corregir Inmediatamente)

#### 1. **Crear tabla `consultation_prescriptions`**
```sql
-- MIGRACIÓN: 20260213000000_create_consultation_prescriptions.sql
CREATE TABLE consultation_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consultation_id, prescription_id)
);

CREATE INDEX idx_consultation_prescriptions_consultation 
  ON consultation_prescriptions(consultation_id);
```

#### 2. **Agregar validaciones JSONB**
```sql
-- MIGRACIÓN: 20260213000001_add_jsonb_validation.sql

-- Validación de contenido de plantillas
CREATE FUNCTION validate_template_content(content JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    content ? 'sections' AND
    jsonb_typeof(content->'sections') = 'array' AND
    (
      SELECT COUNT(*) = 0
      FROM jsonb_array_elements(content->'sections') AS section
      WHERE NOT (section ? 'id' AND section ? 'title')
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE medical_templates
ADD CONSTRAINT medical_templates_content_valid
CHECK (validate_template_content(content));

-- Validación de medicamentos en prescripciones
CREATE FUNCTION validate_medications(meds JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    jsonb_typeof(meds) = 'array' AND
    (
      SELECT COUNT(*) = 0
      FROM jsonb_array_elements(meds) AS med
      WHERE NOT (
        med ? 'name' AND 
        med ? 'dosage' AND 
        med ? 'frequency' AND 
        med ? 'duration' AND
        (med->>'name') <> ''
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE prescriptions
ADD CONSTRAINT prescriptions_medications_valid
CHECK (validate_medications(medications));
```

#### 3. **Corregir RLS de prescripciones**
```sql
-- MIGRACIÓN: 20260213000002_fix_prescriptions_rls.sql

DROP POLICY "prescriptions_select_own_clinic" ON prescriptions;

CREATE POLICY "prescriptions_select_secure" ON prescriptions
  FOR SELECT USING (
    doctor_id = auth.uid()
    OR patient_id IN (
      SELECT patient_id FROM consultations 
      WHERE doctor_id = auth.uid()
    )
  );
```

#### 4. **Agregar RLS a `physical_exam_drafts`**
```sql
-- MIGRACIÓN: 20260213000003_add_physical_exam_drafts_rls.sql

ALTER TABLE physical_exam_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "physical_exam_drafts_own" ON physical_exam_drafts
  FOR ALL USING (doctor_id = auth.uid());

-- Índices
CREATE INDEX idx_physical_exam_drafts_patient_doctor 
  ON physical_exam_drafts(patient_id, doctor_id);
CREATE INDEX idx_physical_exam_drafts_last_modified 
  ON physical_exam_drafts(last_modified DESC);
```

### 7.2 Prioridad MEDIA (Planificar)

#### 5. **Migrar plantillas antiguas a sistema unificado**
```sql
-- MIGRACIÓN: 20260220000000_migrate_old_templates.sql

-- Migrar physical_exam_templates
INSERT INTO medical_templates (
  user_id, name, type, content, created_at, usage_count
)
SELECT 
  doctor_id,
  name,
  'exploracion',
  jsonb_build_object(
    'sections', definition->'sections'
  ),
  created_at,
  0  -- Resetear contador de uso
FROM physical_exam_templates
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Migrar prescription_templates
INSERT INTO medical_templates (
  user_id, name, type, specialty, content, created_at
)
SELECT 
  doctor_id,
  name,
  'prescripcion',
  category,  -- usar category como specialty
  jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'medications',
        'title', 'Medicamentos',
        'content', diagnosis,
        'medications', medications
      )
    )
  ),
  created_at
FROM prescription_templates
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Marcar tablas antiguas como deprecadas
COMMENT ON TABLE physical_exam_templates IS 
  'DEPRECATED: Migrated to medical_templates. Will be removed in v2.0';
COMMENT ON TABLE prescription_templates IS 
  'DEPRECATED: Migrated to medical_templates. Will be removed in v2.0';
```

#### 6. **Estandarizar soft delete**
```sql
-- Agregar is_active a todas las tablas
ALTER TABLE prescription_templates 
ADD COLUMN is_active BOOLEAN DEFAULT true;

UPDATE prescription_templates 
SET is_active = false 
WHERE deleted_at IS NOT NULL;

-- Actualizar políticas RLS para usar is_active
```

#### 7. **Consolidar sistemas de preferencias**
```sql
-- Evaluar fusión de:
-- - user_clinic_preferences
-- - consultation_configurations
-- Posiblemente en una sola tabla con JSONB por módulo
```

### 7.3 Prioridad BAJA (Optimización)

#### 8. **Implementar Full-Text Search**
```sql
ALTER TABLE medical_templates ADD COLUMN search_vector tsvector;
CREATE INDEX idx_medical_templates_search USING GIN(search_vector);
-- (Ver sección 5.3)
```

#### 9. **Crear Materialized View de plantillas populares**
```sql
CREATE MATERIALIZED VIEW popular_templates AS ...
-- (Ver sección 5.3)
```

#### 10. **Implementar versionado real**
```sql
CREATE FUNCTION version_template() RETURNS TRIGGER AS ...
-- (Ver sección 5.3)
```

---

## 📊 RESUMEN DE ESTADO ACTUAL

### ✅ Fortalezas

1. **Sistema nuevo bien diseñado** (`medical_templates`)
   - Categorización flexible
   - Favoritos y tracking de uso
   - RLS seguro para operaciones básicas
   - Estructura JSONB extensible

2. **Separación de responsabilidades**
   - Plantillas vs. datos de pacientes
   - Configuraciones de clínica vs. preferencias de usuario

3. **Auto-guardado en frontend**
   - `localStorage` como backup
   - Auto-save cada 3 segundos
   - Validación antes de guardar

### ⚠️ Debilidades

1. **Sistemas duplicados**
   - 3 tablas de plantillas coexistiendo
   - 2 sistemas de preferencias superpuestos

2. **Falta de validación de datos**
   - Campos JSONB sin constraints
   - Posibilidad de datos inconsistentes

3. **Problemas de seguridad**
   - RLS permite acceso excesivo en prescripciones
   - Tabla sin RLS (`physical_exam_drafts`)
   - Tabla inexistente referenciada en código

4. **Migración incompleta**
   - Datos en tablas antiguas
   - Código mezclando sistemas antiguo/nuevo

### 🎯 Métricas de Calidad

| Aspecto | Estado | Puntaje |
|---------|--------|---------|
| Diseño de esquema | ✅ Bueno | 8/10 |
| Seguridad (RLS) | ⚠️ Regular | 6/10 |
| Validación de datos | ❌ Deficiente | 3/10 |
| Migración de legacy | ⚠️ Pendiente | 4/10 |
| Documentación | ✅ Buena | 7/10 |
| Performance | ✅ Aceptable | 7/10 |
| **TOTAL** | | **5.8/10** |

---

## 📝 CONCLUSIÓN

El sistema de plantillas médicas tiene una **base sólida** con el nuevo diseño unificado en `medical_templates`, pero **requiere correcciones críticas** en:

1. **Seguridad:** RLS y validaciones de datos
2. **Integridad:** Tablas faltantes y constraints
3. **Consolidación:** Migración completa desde sistemas antiguos

**Recomendación:** Priorizar correcciones de seguridad (Prioridad ALTA) antes de agregar nuevas funcionalidades.

---

**Elaborado por:** Análisis automatizado  
**Revisión:** Pendiente  
**Próxima Actualización:** Después de aplicar correcciones ALTA prioridad
