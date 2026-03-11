---
name: prescription-system
description: Sistema unificado de recetas médicas de ExpedienteDLM (editor visual, templates, historial, layouts)
---

# Prescription System Skill

## Arquitectura del módulo

```
Componentes principales:
├── VisualPrescriptionEditor.tsx (124KB) — Editor visual WYSIWYG de recetas
├── AdvancedPrescriptionSystem.tsx — Sistema avanzado de prescripción
├── PrescriptionEmitModal.tsx — Modal de emisión/impresión
├── PrescriptionHistoryViewer.tsx — Visor de historial
├── PatientPrescriptionHistory.tsx — Historial del paciente
├── HorizontalPrescriptionTemplates.tsx — Templates de receta
├── PrescriptionLayoutValidator.tsx — Validación de layouts
├── VisualPrescriptionRenderer.tsx — Renderizado de receta
├── QuickLayoutSelector.tsx — Selector rápido de layout

Hooks:
├── useUnifiedPrescriptionSystem.ts (23KB) — Hook principal unificado
├── usePrescriptionLayouts.ts — Gestión de layouts

Services/Utils:
├── prescriptionTemplates.ts — Templates predefinidos
├── prescriptionPrint.ts — Utilidad de impresión

Features:
└── features/prescriptions/ — Módulo de dominio
    ├── components/
    ├── hooks/
    ├── services/
    └── types/

Page:
└── PrescriptionDashboard.tsx — Dashboard principal
```

## Flujo de datos

1. **Consulta** → Doctor llena diagnóstico y plan de tratamiento
2. **Generación** → `AdvancedPrescriptionSystem` o `VisualPrescriptionEditor` para crear receta
3. **Templates** → `HorizontalPrescriptionTemplates` ofrece plantillas predefinidas
4. **Validación** → `PrescriptionLayoutValidator` verifica formato y datos
5. **Emisión** → `PrescriptionEmitModal` para previsualizar e imprimir
6. **Guardado** → Se persiste en tabla `prescriptions` de Supabase
7. **Historial** → `PatientPrescriptionHistory` muestra recetas previas

## Hook principal: `useUnifiedPrescriptionSystem`

```typescript
import { useUnifiedPrescriptionSystem } from '@/hooks/useUnifiedPrescriptionSystem';

const {
  prescription,
  layouts,
  templates,
  savePrescription,
  printPrescription,
  validatePrescription,
} = useUnifiedPrescriptionSystem({ patientId, consultationId });
```

## Tabla `prescriptions` (campos clave)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `patient_id` | UUID | FK → patients |
| `doctor_id` | UUID | FK → profiles |
| `consultation_id` | UUID | FK → consultations |
| `clinic_id` | UUID | FK → clinics |
| `medications` | JSONB | Array de medicamentos |
| `layout_config` | JSONB | Configuración visual del layout |
| `status` | TEXT | draft, active, cancelled |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

## Tabla `prescription_visual_layouts`

Almacena layouts personalizables por doctor/clínica con campos como:
- Header, footer, logo
- Márgenes, fuentes, columnas
- Campos custom del médico

## Templates predefinidos

Ubicación: `src/lib/prescriptionTemplates.ts`

Templates incluyen: medicamentos de uso frecuente por especialidad, formato estándar de receta, etc.

## Impresión

Ubicación: `src/utils/prescriptionPrint.ts`

Genera HTML optimizado para impresión con layout configurable.
