# Análisis del esquema Supabase – Expediente DLM

**Fecha:** 12 feb 2026  
**Entorno:** Supabase local (CLI conectado), app en `http://localhost:3000/`

---

## 1. Estado del entorno

| Componente | Estado |
|------------|--------|
| **Servidor local (Vite)** | ✅ Corriendo en http://localhost:3000/ |
| **Supabase CLI** | ✅ Conectado – proyecto local activo |
| **Base de datos local** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| **Studio** | http://127.0.0.1:54323 (si `supabase start` está activo) |

*Nota:* Si ves "Stopped services", ejecuta `supabase start` en el directorio del proyecto para levantar todos los servicios locales.

---

## 2. Tablas existentes (esquema `public`)

Resumen a partir de migraciones y `src/lib/database.types.ts`:

### 2.1 Núcleo (auth y clínicas)

| Tabla | Descripción |
|-------|-------------|
| **profiles** | Perfiles de usuario (extiende `auth.users`). Campos: id, email, role, full_name, clinic_id, specialty, license_number, etc. |
| **clinics** | Clínicas. name, type, address, phone, email, settings, is_active. |
| **clinic_user_relationships** | Relación usuario–clínica. clinic_id, user_id, role_in_clinic (doctor/admin_staff/owner/admin), status, is_active. |
| **user_roles** | Roles del sistema (catálogo). |
| **medical_specialties** | Especialidades médicas (catálogo). |

### 2.2 Pacientes e invitaciones

| Tabla | Descripción |
|-------|-------------|
| **patients** | Pacientes. clinic_id, primary_doctor_id, patient_user_id (vínculo a auth), full_name, birth_date, curp, email, phone, allergies, medical_history, etc. |
| **patient_registration_tokens** | Tokens de invitación/registro para pacientes. doctor_id, token, status, expires_at. |

### 2.3 Historia clínica y consultas

| Tabla | Descripción |
|-------|-------------|
| **consultations** | Consultas. patient_id, doctor_id, clinic_id, consultation_date, symptoms, diagnosis, treatment, notes. |
| **prescriptions** | Recetas. patient_id, doctor_id, clinic_id, consultation_id, medications (JSONB), status. |
| **medical_records** | Registros médicos. patient_id, doctor_id, clinic_id, consultation_id, record_type, title, content, data (JSONB). |
| **consultation_configurations** | Configuración por usuario (ej. plantillas por defecto). user_id. |
| **physical_exam_templates** | Plantillas de examen físico. |
| **hereditary_backgrounds** | Antecedentes hereditarios (por paciente). |
| **pathological_histories** | Antecedentes patológicos. |
| **non_pathological_histories** | Antecedentes no patológicos. |

### 2.4 Escalas y evaluaciones

| Tabla | Descripción |
|-------|-------------|
| **medical_scales** | Definición de escalas médicas. |
| **scale_assessments** | Evaluaciones por escala por paciente. patient_id, scale_id, scores (JSONB), etc. |
| **categories** | Categorías (catálogo, ej. para escalas). |
| **scale_category_mapping** | Mapeo escala–categoría. |
| **scale_usage_metrics** | Métricas de uso (solo service_role). |

### 2.5 Citas

| Tabla | Descripción |
|-------|-------------|
| **appointments** | Citas. doctor_id, patient_id, clinic_id, appointment_date, appointment_time, duration, status, type. |
| **appointments_orphan_backup** | Respaldo de citas huérfanas (solo service_role). |

### 2.6 Práctica y configuración

| Tabla | Descripción |
|-------|-------------|
| **medical_practice_settings** | Horarios y configuración de consultas por user_id/clinic_id. |
| **system_settings** | Configuración global (solo service_role). |

### 2.7 Plantillas médicas

| Tabla | Descripción |
|-------|-------------|
| **template_categories** | Categorías de plantillas. |
| **medical_templates** | Plantillas de documentos médicos. clinic_id, created_by. |
| **template_favorites** | Favoritos de plantillas por usuario. |
| **template_usage** | Uso de plantillas (auditoría). |

### 2.8 Ejercicios y taxonomía

| Tabla | Descripción |
|-------|-------------|
| **exercise_taxonomy_types** | Tipos de taxonomía de ejercicios. |
| **exercise_taxonomy_terms** | Términos de taxonomía. |
| **exercise_taxonomy_links** | Enlaces de taxonomía. |
| **exercise_library** | Biblioteca de ejercicios (global o por clínica). |
| **patient_exercise_assignments** | Asignación de ejercicios a pacientes. |
| **patient_exercise_logs** | Registro de realización de ejercicios. |

### 2.9 App paciente (MVP)

| Tabla | Descripción |
|-------|-------------|
| **patient_tasks** | Tareas asignadas al paciente. |
| **patient_adherence** | Adherencia. |
| **patient_achievements** | Logros. |
| **patient_caregivers** | Cuidadores vinculados. |
| **patient_health_data** | Datos de salud del paciente. |
| **conversations** | Conversaciones doctor–paciente. |
| **messages** | Mensajes dentro de conversaciones. |
| **push_subscriptions** | Suscripciones push. |
| **automation_rules** | Reglas de automatización. |
| **automation_executions** | Ejecuciones de reglas. |

### 2.10 Auditoría y seguridad

| Tabla | Descripción |
|-------|-------------|
| **audit_logs** | Registro de auditoría. |
| **patient_access_logs** | Accesos a datos de pacientes. |
| **privacy_consents** | Consentimientos de privacidad. |
| **data_correction_requests** | Solicitudes de corrección de datos. |
| **notifications** | Notificaciones. |
| **clinical_rules** | Reglas clínicas. |
| **medical_tests** / **medical_test_files** | Pruebas médicas y archivos. |

---

## 3. Relaciones principales (FK)

```
auth.users
  └── profiles (id)
        └── clinic_user_relationships (user_id)
        └── patients (primary_doctor_id)
        └── consultations (doctor_id)
        └── prescriptions (doctor_id)
        └── medical_records (doctor_id)
        └── appointments (doctor_id)
        └── patient_registration_tokens (doctor_id)
        └── medical_practice_settings (user_id)
        └── consultation_configurations (user_id)
  └── patients (patient_user_id) [opcional]

clinics (id)
  └── clinic_user_relationships (clinic_id)
  └── patients (clinic_id) [nullable]
  └── consultations (clinic_id)
  └── prescriptions (clinic_id)
  └── medical_records (clinic_id)
  └── appointments (clinic_id)
  └── medical_templates (clinic_id)
  └── medical_practice_settings (clinic_id)

patients (id)
  └── consultations (patient_id)
  └── prescriptions (patient_id)
  └── medical_records (patient_id)
  └── appointments (patient_id)
  └── scale_assessments (patient_id)
  └── patient_exercise_assignments, patient_exercise_logs
  └── patient_tasks, patient_adherence, patient_achievements
  └── patient_caregivers, patient_health_data
  └── conversations (participantes vía lógica)

consultations (id)
  └── prescriptions (consultation_id)
  └── medical_records (consultation_id)
```

- **profiles** es el centro para “quién es el usuario” (doctor/admin) y se relaciona con **clinics** vía **clinic_user_relationships**.
- **patients** puede tener `clinic_id` (clínica) y siempre tiene `primary_doctor_id` (perfil del doctor); opcionalmente `patient_user_id` para la app paciente.
- Todo lo clínico (consultations, prescriptions, medical_records, appointments) se ata a **clinic_id** y/o **doctor_id** para RLS por clínica.

---

## 4. RLS (Row Level Security) por tabla

Todas las tablas listadas tienen **RLS habilitado** (ALTER TABLE ... ENABLE ROW LEVEL SECURITY). Resumen de políticas por tabla:

### 4.1 profiles

| Política | Operación | Criterio |
|----------|------------|----------|
| profiles_select_own / profiles_select_policy | SELECT | id = auth.uid() (o lógica equivalente) |
| profiles_update_own / profiles_update_policy | UPDATE | id = auth.uid() |
| profiles_insert_own / profiles_insert_policy | INSERT | id = auth.uid() |

- Solo se ve/actualiza/crea el propio perfil.

### 4.2 clinics

| Política | Operación | Criterio |
|----------|------------|----------|
| clinics_select_policy | SELECT | Usuario en la clínica (vía clinic_user_relationships) o super_admin |
| clinics_insert_policy | INSERT | Usuario puede crear (ej. clínica personal) |
| clinics_update_policy | UPDATE | Admin/owner de la clínica |
| clinics_delete_super_admin | DELETE | Solo super_admin |

### 4.3 clinic_user_relationships

| Política | Operación | Criterio |
|----------|------------|----------|
| cur_select_policy | SELECT | user_id = auth.uid() o usuario en la misma clínica con rol admin/owner |
| cur_insert_policy | INSERT | Solicitud de vinculación o creación por admin |
| cur_update_policy | UPDATE | Admin de la clínica o propio registro (status) |
| cur_delete_policy | DELETE | Admin/owner de la clínica |
| clinic_relationships_delete_super_admin | DELETE | Super_admin |

### 4.4 patients

| Política | Operación | Criterio |
|----------|------------|----------|
| patients_select_policy | SELECT | Usuario en clinic_id (is_user_in_clinic) O primary_doctor_id = auth.uid() O patient_user_id = auth.uid() (app paciente) |
| patients_insert_policy | INSERT | Pertenece a la clínica O médico independiente (clinic_id NULL, primary_doctor_id = auth.uid()) |
| patients_update_policy | UPDATE | Misma lógica que SELECT (clínica o doctor o paciente) |
| patients_delete_policy | DELETE | Misma lógica (clínica o primary_doctor) |

- Función auxiliar: `is_user_in_clinic(target_clinic_id)` (SECURITY DEFINER).

### 4.5 patient_registration_tokens

| Política | Operación | Criterio |
|----------|------------|----------|
| patient_registration_tokens_doctor_* | SELECT/INSERT/UPDATE/DELETE | doctor_id = auth.uid() |
| patient_registration_tokens_public_validate | SELECT (anon) | status = 'pending' (validación pública del token) |

### 4.6 consultations

| Política | Operación | Criterio |
|----------|------------|----------|
| consultations_select_* / consultations_select_access | SELECT | clinic_id en clínicas del usuario (clinic_user_relationships, is_active) |
| consultations_insert_* | INSERT | Mismo criterio por clinic_id |
| consultations_update_* | UPDATE | Mismo criterio |
| consultations_delete_* | DELETE | Mismo criterio |

### 4.7 prescriptions

| Política | Operación | Criterio |
|----------|------------|----------|
| prescriptions_select_* | SELECT | clinic_id en clínicas del usuario |
| prescriptions_insert_* | INSERT | Idem |
| prescriptions_update_* | UPDATE | Idem |
| prescriptions_delete_* | DELETE | Idem |

### 4.8 medical_records

| Política | Operación | Criterio |
|----------|------------|----------|
| medical_records_select_* | SELECT | clinic_id en clínicas del usuario |
| medical_records_insert_* | INSERT | Idem |
| medical_records_update_* | UPDATE | Idem |
| medical_records_delete_* | DELETE | Idem |

### 4.9 appointments

| Política | Operación | Criterio |
|----------|------------|----------|
| appointments_select_policy | SELECT | clinic_id en clínicas del usuario O doctor_id = auth.uid() O patient en pacientes del doctor; además patients_select_self permite al paciente ver sus citas (patient_user_id = auth.uid()) |
| appointments_insert_policy | INSERT | Pertenece a la clínica O doctor_id = auth.uid() |
| appointments_update_policy | UPDATE | Misma lógica que SELECT (clínica o doctor); paciente puede actualizar las suyas (patient_app) |
| appointments_delete_policy | DELETE | doctor_id = auth.uid() O usuario admin/owner de la clínica |

### 4.10 scale_assessments

| Política | Operación | Criterio |
|----------|------------|----------|
| scale_assessments_select_by_doctor | SELECT | patient del doctor (primary_doctor_id) o del propio paciente (patient_user_id) |
| scale_assessments_insert_by_doctor | INSERT | Idem |
| scale_assessments_update_by_doctor | UPDATE | Solo primary_doctor del paciente |
| scale_assessments_delete_by_doctor | DELETE | Solo primary_doctor |
| scale_assessments_patient_insert_own | INSERT | Paciente puede insertar sus propias evaluaciones (patient_user_id) |

### 4.11 medical_practice_settings

| Política | Operación | Criterio |
|----------|------------|----------|
| Users can view/insert/update/delete own practice settings | SELECT/INSERT/UPDATE/DELETE | user_id = auth.uid() |
| medical_practice_settings_patient_read_primary_doctor | SELECT | Paciente puede leer configuración del doctor primario (app paciente) |

### 4.12 consultation_configurations

| Política | Operación | Criterio |
|----------|------------|----------|
| Users can view/insert/update/delete own configuration | SELECT/INSERT/UPDATE/DELETE | user_id = auth.uid() (implícito por “own”) |

### 4.13 Catálogos (solo lectura para authenticated)

| Tabla | Políticas |
|-------|-----------|
| categories | categories_authenticated_read (SELECT); categories_service_role_all (ALL para service_role) |
| scale_category_mapping | scale_category_mapping_authenticated_read; scale_category_mapping_service_role_all |
| user_roles, medical_specialties | Lectura para autenticados (según migraciones/RLS aplicados) |

### 4.14 Solo service_role

| Tabla | Políticas |
|-------|-----------|
| scale_usage_metrics | scale_usage_metrics_service_role_all |
| system_settings | system_settings_service_role_all |
| appointments_orphan_backup | appointments_orphan_backup_service_role_all |

### 4.15 Plantillas médicas (medical_templates, template_*)

- **template_categories**: SELECT todos; INSERT/UPDATE/DELETE solo admin (vía role/clinic).
- **medical_templates**: SELECT por clínica o creador; INSERT/UPDATE/DELETE por clínica o creador.
- **template_favorites**: SELECT/INSERT/DELETE por usuario.
- **template_usage**: SELECT/INSERT por usuario/clínica según políticas definidas en migración.

### 4.16 Ejercicios (exercise_*)

- **exercise_taxonomy_***: SELECT para authenticated; manage (INSERT/UPDATE/DELETE) para roles permitidos.
- **exercise_library**: Lectura global o por propietario; doctor_manage para CRUD.
- **patient_exercise_assignments**, **patient_exercise_logs**: Paciente ve/inserta los suyos; doctor gestiona los de sus pacientes.

### 4.17 App paciente (patient_tasks, conversations, messages, etc.)

- **patient_tasks**: Paciente SELECT/UPDATE los suyos; doctor manage.
- **conversations**: Paciente SELECT las suyas; doctor manage.
- **messages**: Participantes SELECT; paciente/doctor INSERT según rol.
- **patient_adherence**, **patient_achievements**, **patient_caregivers**, **patient_health_data**: Paciente ve (y en algunos INSERT) los suyos; doctor ve/gestiona por paciente.
- **push_subscriptions**: Paciente gestiona las suyas (patient_user_id).
- **automation_rules** / **automation_executions**: Doctor manage / SELECT.

---

## 5. Resumen de patrones RLS

1. **Por clínica:** consultations, prescriptions, medical_records, appointments (y vistas similares) usan `clinic_id IN (SELECT clinic_id FROM clinic_user_relationships WHERE user_id = auth.uid() AND is_active)`.
2. **Por doctor:** patients, scale_assessments, patient_registration_tokens usan `primary_doctor_id = auth.uid()` o `doctor_id = auth.uid()`.
3. **Por paciente (app):** patients (patient_user_id), appointments, scale_assessments, medical_practice_settings (lectura), patient_tasks, conversations, messages, etc., permiten al paciente ver/actualizar solo lo suyo.
4. **Propio perfil/configuración:** profiles, medical_practice_settings, consultation_configurations restringen por `auth.uid()`.
5. **Catálogos:** categories, scale_category_mapping son solo lectura para authenticated; system_settings y scale_usage_metrics solo para service_role.

---

## 6. Cómo verificar en local

```bash
# En la raíz del proyecto
cd "c:\Users\JmYoc\OneDrive\Documentos\DeepLuxMed\Expediente DLM\ExpedienteDLM-11"

# Estado de Supabase
npx supabase status

# Si los servicios están parados
npx supabase start

# Generar tipos TypeScript desde la BD local
npm run gen:types:local
```

- **App:** http://localhost:3000/  
- **Supabase Studio (local):** http://127.0.0.1:54323 (tras `supabase start`)

Este documento refleja el estado del esquema y RLS según las migraciones en `supabase/migrations` y los tipos en `src/lib/database.types.ts`.
