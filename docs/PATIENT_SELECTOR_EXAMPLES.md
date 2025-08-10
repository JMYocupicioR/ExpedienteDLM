# PatientSelector - Ejemplos de Uso

## Descripción

El `PatientSelector` es un componente avanzado que permite buscar pacientes existentes y crear nuevos pacientes sobre la marcha. Está optimizado para una experiencia de usuario fluida y maneja tanto la búsqueda en tiempo real como la creación de pacientes.

## Características

- ✅ **Búsqueda en tiempo real** por nombre, teléfono o email
- ✅ **Creación de pacientes nuevos** sin salir del flujo
- ✅ **Validación automática** de campos obligatorios
- ✅ **Fallback con datos temporales** si falla la base de datos
- ✅ **Interfaz intuitiva** con autocompletado y selección visual
- ✅ **Accesibilidad completa** con navegación por teclado

## Uso Básico

```typescript
import PatientSelector, { Patient } from '../components/PatientSelector';

function MyComponent() {
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    console.log('Paciente seleccionado:', patient);
  };

  const handleNewPatient = (patient: Patient) => {
    console.log('Nuevo paciente creado:', patient);
    // Aquí puedes agregar lógica adicional
  };

  return (
    <PatientSelector
      selectedPatientId={selectedPatientId}
      onPatientSelect={handlePatientSelect}
      onNewPatient={handleNewPatient}
      placeholder="Buscar paciente..."
    />
  );
}
```

## Integración en Formulario de Consulta

```typescript
// En src/components/ConsultationForm.tsx

import React, { useState } from 'react';
import PatientSelector, { Patient } from './PatientSelector';
import AppointmentQuickScheduler from './AppointmentQuickScheduler';

function ConsultationForm() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [consultationData, setConsultationData] = useState({
    // ... otros campos
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    // Actualizar datos de la consulta
    setConsultationData(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.full_name
    }));
  };

  const handleNewPatient = (patient: Patient) => {
    // Opcional: mostrar notificación de éxito
    console.log(`Paciente "${patient.full_name}" creado exitosamente`);
  };

  const handleAppointmentScheduled = (appointmentData) => {
    console.log('Próxima cita programada:', appointmentData);
    // Lógica para manejar la nueva cita
  };

  return (
    <form className="space-y-6">
      {/* Selector de Paciente */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paciente *
        </label>
        <PatientSelector
          selectedPatientId={selectedPatient?.id || ''}
          onPatientSelect={handlePatientSelect}
          onNewPatient={handleNewPatient}
          placeholder="Buscar paciente por nombre, teléfono o email..."
        />
      </div>

      {/* Mostrar información del paciente seleccionado */}
      {selectedPatient && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-white font-medium mb-2">Información del Paciente</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Nombre:</span>
              <span className="text-white ml-2">{selectedPatient.full_name}</span>
            </div>
            {selectedPatient.phone && (
              <div>
                <span className="text-gray-400">Teléfono:</span>
                <span className="text-white ml-2">{selectedPatient.phone}</span>
              </div>
            )}
            {selectedPatient.email && (
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-2">{selectedPatient.email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Otros campos del formulario */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Motivo de Consulta
        </label>
        <textarea
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          rows={3}
          placeholder="Describe el motivo de la consulta..."
        />
      </div>

      {/* Agendador de próxima cita */}
      {selectedPatient && (
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-white font-medium mb-4">Programar Próxima Cita</h3>
          <AppointmentQuickScheduler
            patientId={selectedPatient.id}
            patientName={selectedPatient.full_name}
            onScheduled={handleAppointmentScheduled}
          />
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!selectedPatient}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
        >
          Guardar Consulta
        </button>
      </div>
    </form>
  );
}

export default ConsultationForm;
```

## Funcionalidades del Selector

### 1. Búsqueda Inteligente
- Busca por nombre completo (coincidencia parcial)
- Busca por número de teléfono
- Busca por dirección de email
- Resultados en tiempo real mientras escribes

### 2. Creación de Nuevos Pacientes
- Botón prominente "Crear Nuevo Paciente"
- Pre-llena el nombre con el término de búsqueda
- Formulario modal completo con validación
- Campos: nombre*, teléfono, email, fecha de nacimiento, género
- Validación de formato para email y teléfono

### 3. Experiencia de Usuario
- Autocompletado visual con dropdown
- Información del paciente seleccionado claramente visible
- Opción para limpiar selección y buscar de nuevo
- Loading states y manejo de errores
- Navegación por teclado (Escape para cerrar)

### 4. Fallbacks y Robustez
- Si falla la conexión a Supabase, usa datos mock
- Si falla la creación del paciente, crea uno temporal
- Manejo graceful de errores sin romper el flujo

## Props del Componente

```typescript
interface PatientSelectorProps {
  selectedPatientId: string;           // ID del paciente actualmente seleccionado
  onPatientSelect: (patient: Patient) => void;  // Callback cuando se selecciona un paciente
  onNewPatient?: (patient: Patient) => void;    // Callback cuando se crea un paciente nuevo
  placeholder?: string;                // Texto del placeholder
  className?: string;                  // Clases CSS adicionales
}
```

## Tipo Patient

```typescript
export interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
}
```

## Integración con Base de Datos

El componente está configurado para trabajar con Supabase, pero incluye fallbacks:

1. **Carga de pacientes**: Query a la tabla `patients` con filtros de actividad
2. **Creación de pacientes**: Insert a la tabla `patients` con datos validados
3. **Fallback**: Si falla Supabase, usa datos mock y pacientes temporales

## Mejores Prácticas

1. **Siempre manejar onPatientSelect**: Es obligatorio para capturar la selección
2. **Usar onNewPatient**: Para mostrar feedback cuando se crea un paciente
3. **Validar selección**: Verificar que hay un paciente seleccionado antes de enviar formularios
4. **Feedback visual**: Mostrar información del paciente seleccionado claramente
5. **Accesibilidad**: El componente maneja navegación por teclado automáticamente
