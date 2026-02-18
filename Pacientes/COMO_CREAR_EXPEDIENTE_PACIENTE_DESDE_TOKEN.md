# Flujo para crear expediente del paciente desde token

Este documento describe el flujo operativo y tecnico para crear (o actualizar) el expediente de un paciente usando un token de invitacion, su vinculacion con medico/clinica, la informacion solicitada al paciente y como se refleja en el dashboard de expediente.

## 1) Generacion del token de invitacion

El medico genera el enlace desde el modal de invitacion:

- `src/components/GenerateInvitationLinkModal.tsx`
- Se inserta un registro en `patient_registration_tokens` con:
  - `token`: valor aleatorio seguro.
  - `doctor_id`: usuario autenticado que genera el enlace.
  - `clinic_id`: clinica activa del perfil del medico.
  - `selected_scale_ids`: escalas que debe contestar el paciente (opcional).
  - `allowed_sections`: secciones del formulario habilitadas.
  - `assigned_patient_id`: paciente existente para actualizar (opcional).
  - `expires_at`: vigencia configurada.
  - `status`: inicia en `pending`.

El link final publicado al paciente es:

- `/register/patient/{token}`

## 2) Validacion del token y contexto de vinculacion

Antes de capturar informacion, el sistema valida que el token sea utilizable:

- Frontend: `src/pages/PatientPublicRegistration.tsx`
- Edge Function: `supabase/functions/validate-patient-registration/index.ts`

Reglas de validacion:

1. El token debe existir en `patient_registration_tokens`.
2. Debe tener `status = 'pending'`.
3. No debe estar vencido (`expires_at` mayor a fecha/hora actual).

Contexto que se obtiene para la vinculacion:

- Datos del medico (`profiles.full_name`) usando `doctor_id`.
- Datos de clinica (`clinics.name`) usando `clinic_id`.
- Escalas habilitadas (`selected_scale_ids`).
- Secciones permitidas (`allowed_sections`).
- Paciente asignado opcional (`assigned_patient_id`).

Con esto, el registro queda explicitamente ligado al medico y a la clinica desde el inicio del flujo.

## 3) Informacion solicitada al paciente

El formulario publico (`src/pages/PatientPublicRegistration.tsx`) solicita:

### 3.1 Informacion personal (`personal`)

- `full_name`
- `birth_date`
- `gender`
- `email` (opcional)
- `phone` (opcional)
- `address` (opcional)

### 3.2 Antecedentes patologicos (`pathological`)

- `chronic_diseases` (arreglo)
- `current_treatments` (arreglo)
- `surgeries` (arreglo)
- `fractures` (arreglo)
- `previous_hospitalizations` (arreglo)
- `substance_use` (objeto)

### 3.3 Antecedentes no patologicos (`nonPathological`)

- `handedness`
- `religion`
- `marital_status`
- `education_level`
- `diet`
- `personal_hygiene`
- `vaccination_history` (arreglo)

### 3.4 Antecedentes heredofamiliares (`hereditary`)

Lista de familiares con:

- `relationship`
- `condition`
- `notes` (opcional)

### 3.5 Escalas medicas (`scales`)

Para cada escala seleccionada:

- `answers` (respuestas por reactivo)
- `score` (resultado numerico)
- `severity` (nivel interpretado)

## 4) Envio y creacion del expediente

El frontend envia el payload al endpoint:

- `supabase.functions.invoke('complete-patient-registration', { body })`
- Edge Function: `supabase/functions/complete-patient-registration/index.ts`

### 4.1 Logica de alta o actualizacion

- Si existe `assigned_patient_id`:
  - Se actualiza el paciente existente en `patients`.
- Si no existe:
  - Se crea un paciente nuevo en `patients` con:
    - `clinic_id = token.clinic_id`
    - `primary_doctor_id = token.doctor_id`

### 4.2 Persistencia de antecedentes y escalas

Se guarda la informacion del paciente en:

- `pathological_histories`
- `non_pathological_histories`
- `hereditary_backgrounds`
- `scale_assessments`

Al finalizar, el token se marca como `completed` en `patient_registration_tokens`.

## 5) Vinculacion final con medico y clinica

La vinculacion queda establecida por diseno:

- Relacion medico-paciente:
  - `patients.primary_doctor_id = token.doctor_id`
- Relacion clinica-paciente:
  - `patients.clinic_id = token.clinic_id`
- Trazabilidad del flujo:
  - `patient_registration_tokens` conserva quien invito, a que clinica y con que alcance.

## 6) Que ve el dashboard especial del paciente

El expediente se consume principalmente en:

- `src/pages/PatientRecord.tsx`

Consultas principales del dashboard:

- `patients` (datos personales del paciente)
- `pathological_histories`
- `non_pathological_histories`
- `hereditary_backgrounds`
- `consultations` (seguimiento clinico posterior)
- `appointments` (citas del paciente)

### Mapeo de captura -> visualizacion

1. Lo capturado en `personal` se visualiza en "Informacion Personal".
2. Lo capturado en `pathological` se visualiza en "Antecedentes Patologicos".
3. Lo capturado en `nonPathological` se visualiza en "Antecedentes No Patologicos".
4. Lo capturado en `hereditary` se visualiza en "Antecedentes Heredofamiliares".
5. Lo capturado en `scales` queda en `scale_assessments` para seguimiento clinico y analisis.

## 7) Reglas operativas recomendadas

Para operar correctamente este flujo:

1. El token siempre debe emitirse desde un medico autenticado y con clinica activa.
2. Definir `allowed_sections` solo con la informacion estrictamente necesaria.
3. Definir `selected_scale_ids` segun motivo clinico.
4. Usar `assigned_patient_id` cuando se requiera actualizar un expediente existente.
5. Validar que el token siga `pending` y no expirado antes de mostrar formulario.

## 8) Resultado esperado del proceso

Al completar el flujo correctamente:

- Se crea/actualiza el paciente.
- El paciente queda vinculado al medico y a la clinica del token.
- Se guardan antecedentes y escalas respondidas.
- El token deja de ser reutilizable (`completed`).
- El dashboard de expediente puede mostrar inmediatamente la informacion capturada.
