---
name: appointment-calendar
description: Sistema de citas, Google Calendar, conflictos de agenda y multi-sala para ExpedienteDLM
---

# Appointment & Calendar Skill

## Arquitectura del módulo

```
Services:
├── appointment-service.ts — CRUD básico de citas
├── enhanced-appointment-service.ts (22KB) — Citas avanzadas (conflictos, rooms)
├── admin-appointment-service.ts — Citas para admins
├── google-calendar-service.ts (19KB) — Integración Google Calendar
└── medical-record-appointment-integration.ts — Integración con expediente

Hooks:
├── useGoogleCalendarAppointments.ts (14KB) — Hook de Google Calendar
├── useSchedulingConflicts.ts — Detección de conflictos
├── useAdminAppointments.ts — Citas admin
├── useClinicRooms.ts — Gestión de consultorios

Components:
├── AppointmentForm.tsx (28KB) — Formulario de cita
├── EnhancedAppointmentManager.tsx — Manager avanzado
├── AppointmentQuickScheduler.tsx — Agendamiento rápido
├── AppointmentsDiagnostic.tsx — Diagnóstico de problemas
├── GoogleCalendarIntegration.tsx — UI de integración GCal
├── MedicalRecordAppointmentIntegration.tsx — Integración con expediente

Pages:
├── AppointmentsPage.tsx — Página principal
├── StaffSchedulePage.tsx — Horarios de staff

Calendar Library:
└── react-big-calendar + moment (adaptador de fechas)
```

## Tabla `appointments`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `patient_id` | UUID | FK → patients |
| `doctor_id` | UUID | FK → profiles |
| `clinic_id` | UUID | FK → clinics |
| `room_id` | UUID | FK → clinic_rooms (opcional) |
| `title` | TEXT | Título de la cita |
| `start_time` | TIMESTAMPTZ | Inicio |
| `end_time` | TIMESTAMPTZ | Fin |
| `status` | TEXT | scheduled, completed, cancelled, no_show |
| `type` | TEXT | consultation, follow_up, procedure, etc. |
| `notes` | TEXT | Notas |
| `google_event_id` | TEXT | ID del evento en Google Calendar |
| `recurrence_rule` | JSONB | Regla de recurrencia |

## Google Calendar Integration

### Flujo OAuth

1. Doctor hace click en "Conectar Google Calendar"
2. Redirect a `supabase/functions/google-calendar-auth` → genera URL OAuth
3. Google redirige a `GoogleCalendarCallback.tsx` con auth code
4. Callback envía code a edge function → obtiene tokens
5. Tokens guardados en profiles o tabla de integrations

### Edge Functions

| Función | Propósito |
|---|---|
| `google-calendar-auth` | Inicia flujo OAuth, genera URL |
| `google-calendar-sync` | Sincroniza eventos bidireccionalmente |
| `check-appointment-availability` | Verifica slots disponibles |
| `schedule-appointment` | Crea cita + evento en GCal |

### Variable de entorno
```env
VITE_GOOGLE_CALENDAR_CLIENT_ID=
```

## Detección de conflictos

### Hook: `useSchedulingConflicts`

```typescript
import { useSchedulingConflicts } from '@/hooks/useSchedulingConflicts';

const { conflicts, hasConflicts, checkConflict } = useSchedulingConflicts({
  doctorId,
  clinicId,
  date,
});
```

Detecta:
- Superposición de horarios del mismo doctor
- Superposición del mismo consultorio
- Doble booking del mismo paciente

## Multi-sala (clinic_rooms)

### Hook: `useClinicRooms`

```typescript
import { useClinicRooms } from '@/hooks/useClinicRooms';

const { rooms, loading, addRoom, updateRoom, deleteRoom } = useClinicRooms(clinicId);
```

Cada consultorio tiene: nombre, capacidad, equipamiento, estado (activo/inactivo).

## react-big-calendar

```typescript
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

<Calendar
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  views={['month', 'week', 'day', 'agenda']}
  onSelectEvent={handleSelectEvent}
  onSelectSlot={handleSelectSlot}
  selectable
/>
```

## Roles y permisos de citas

Definidos en `src/lib/roles.ts`:
- `APPOINTMENT_ELIGIBLE_ROLES`: owner, director, doctor, physiotherapist, nurse, assistant, admin_staff
- Todos estos roles pueden tener citas asignadas como `doctor_id`
