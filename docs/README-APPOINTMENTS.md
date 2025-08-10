# Sistema de Citas Médicas - ExpedienteDLM

## Descripción

Sistema completo de gestión de citas médicas integrado al expediente clínico electrónico ExpedienteDLM. Proporciona funcionalidades para crear, editar, eliminar y visualizar citas médicas con vista de calendario y opciones de agendamiento rápido.

## Características Principales

- **Calendario mensual** con navegación intuitiva y vista de citas
- **Formulario modal** completo para crear/editar citas con validación
- **Panel lateral** que muestra las citas del día seleccionado
- **Agendador rápido** para programar citas desde otros módulos
- **Sistema de notificaciones** con validación en tiempo real
- **Verificación de disponibilidad** para evitar conflictos de horario

## Integración en el Dashboard

### 1. Agregar Ruta en App.tsx
```typescript
import AppointmentsPage from './pages/AppointmentsPage';

// En las rutas protegidas:
<Route 
  path="/citas" 
  element={isAuthenticated ? <AppointmentsPage /> : <Navigate to="/auth" />} 
/>
```

### 2. Actualizar Navegación
La nueva sección "Citas Médicas" ya está integrada en:
- Dashboard principal (tarjeta de estadísticas)
- Barra de navegación lateral
- Acciones rápidas del dashboard

### 3. Uso del Agendador Rápido
Para integrar el agendamiento en formularios de consulta:

```typescript
import AppointmentQuickScheduler from '../components/AppointmentQuickScheduler';

// En tu componente:
<AppointmentQuickScheduler
  patientId={patientId}
  patientName={patientName}
  onScheduled={(appointmentData) => {
    console.log('Cita programada:', appointmentData);
    // Lógica adicional...
  }}
/>
```

## Arquitectura del Código

### Servicio Principal (`/lib/services/appointment-service.ts`)
- Manejo de datos de citas con API plug-and-play
- Funciones CRUD: `createAppointment`, `updateAppointment`, `deleteAppointment`, `getAppointments`
- Verificación de disponibilidad de horarios
- Datos mock para desarrollo, listo para API corporativa

### Componentes Principales
- `AppointmentsCalendar`: Vista principal del calendario
- `AppointmentForm`: Modal para crear/editar citas
- `AppointmentQuickScheduler`: Agendador rápido para otros módulos

### Hook Personalizado (`useAppointments`)
Proporciona estado y funciones para manejar citas de forma eficiente.

## Datos de Ejemplo

El sistema incluye datos mock para testing y desarrollo rápido:
- 3 citas de ejemplo con diferentes estados
- Pacientes de prueba con información completa
- Horarios variados para probar el calendario

## Próximos Pasos

1. **Conectar API corporativa**: Cambiar `useRealAPI = true` en el servicio
2. **Integrar con base de datos**: Crear tabla `appointments` en Supabase
3. **Notificaciones automáticas**: Sistema de recordatorios por email/SMS
4. **Sincronización**: Integración con calendarios externos (Google Calendar, Outlook)
5. **Reportes**: Dashboard de métricas y estadísticas de citas
