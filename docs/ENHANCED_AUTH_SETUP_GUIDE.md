# Sistema de Autenticación Multi-Rol - ExpedienteDLM

## 🎯 Resumen del Sistema

Se ha implementado un sistema de autenticación avanzado que soporta múltiples tipos de usuarios con permisos granulares y gestión de clínicas integrada con Supabase.

## 🔐 Tipos de Usuario Soportados

### 1. **Super Administrador** (super_admin)
- **Descripción**: Control total del sistema (tú)
- **Permisos**: Acceso completo a todas las funcionalidades
- **Capacidades**:
  - Crear y gestionar clínicas
  - Administrar todos los usuarios
  - Acceso a todos los datos del sistema
  - Configurar roles y permisos

### 2. **Doctor** (doctor)
- **Descripción**: Médicos certificados
- **Permisos**: Acceso completo a pacientes y consultas de su clínica
- **Capacidades**:
  - Ver y crear pacientes
  - Realizar consultas médicas
  - Prescribir medicamentos
  - Ver datos de colegas en su clínica

### 3. **Personal de Salud** (health_staff)
- **Descripción**: Enfermería, fisioterapia, dentistas, etc.
- **Permisos**: Acceso limitado según especialidad
- **Capacidades**:
  - Ver pacientes de su clínica
  - Asistir en consultas
  - Registrar signos vitales
  - Documentar procedimientos

### 4. **Personal Administrativo** (admin_staff)
- **Descripción**: Administradores de clínicas
- **Permisos**: Gestión administrativa de su clínica
- **Capacidades**:
  - Ver todos los usuarios de su clínica
  - Gestionar lista de doctores
  - Acceso a reportes administrativos
  - Configurar clínica

### 5. **Paciente** (patient)
- **Descripción**: Usuarios pacientes
- **Permisos**: Solo su información personal
- **Capacidades**:
  - Ver su historial médico
  - Programar citas
  - Ver sus prescripciones
  - Actualizar información personal

## 🏥 Estructura de Clínicas

Cada usuario (excepto super admin) pertenece a una clínica específica:
- Los usuarios solo pueden acceder a datos de su propia clínica
- Las clínicas pueden ser hospitales, clínicas, consultorios privados
- Cada clínica tiene configuraciones y permisos específicos

## 📋 Proceso de Registro Mejorado

### Flujo de Registro:
1. **Información Personal**: Datos básicos y contacto
2. **Tipo de Cuenta**: Selección de rol y credenciales
3. **Información Profesional**: Licencias y especialidades (no para pacientes)
4. **Clínica/Institución**: Asociación o creación de clínica (no para pacientes)
5. **Información Adicional**: Horarios y preferencias
6. **Confirmación**: Revisión y finalización

### Validaciones Específicas por Rol:
- **Doctores**: Requieren cédula profesional y especialidad
- **Personal de Salud**: Requieren licencia según especialidad
- **Personal Administrativo**: Pueden crear nuevas clínicas
- **Pacientes**: Proceso simplificado sin requisitos profesionales

## 🗄️ Estructura de Base de Datos

### Nuevas Tablas Creadas:

#### `clinics`
- Información de clínicas/instituciones
- Configuraciones específicas por clínica
- Relación con usuarios

#### `user_roles`
- Definición de roles del sistema
- Permisos asociados a cada rol
- Configuración flexible de capacidades

#### `medical_specialties`
- Catálogo completo de especialidades médicas
- Categorización por tipo (médica, quirúrgica, diagnóstica, etc.)
- Requisitos de licencia por especialidad

#### `clinic_user_relationships`
- Relaciones entre usuarios y clínicas
- Historial de empleos
- Permisos específicos por relación

### Tablas Actualizadas:

#### `profiles`
- Campos adicionales para nuevo sistema
- Relaciones con clínicas y especialidades
- Información professional expandida

#### `patients`
- Relación con clínica de atención
- Doctor primario asignado
- Información de seguros y contactos de emergencia

## 🔒 Políticas de Seguridad (RLS)

### Principios de Seguridad:
1. **Aislamiento por Clínica**: Los datos están separados por clínica
2. **Permisos Basados en Rol**: Cada rol tiene capacidades específicas
3. **Acceso Granular**: Permisos detallados por operación (leer, escribir, eliminar)

### Ejemplos de Políticas:
- **Pacientes**: Solo pueden ver sus propios datos
- **Doctores**: Ven pacientes de su clínica
- **Admin Staff**: Ve usuarios de su clínica
- **Super Admin**: Ve todo el sistema

## 🚀 Instrucciones de Implementación

### 1. Aplicar Migraciones de Base de Datos

```bash
# Ejecutar el script de migración
node apply-enhanced-auth-migration.js
```

### 2. Configurar Variables de Entorno

Asegúrate de tener configuradas las siguientes variables:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 3. Verificar Instalación

El script de migración verificará automáticamente:
- Creación de tablas
- Inserción de datos iniciales
- Configuración de políticas RLS

## 📱 Rutas Actualizadas

### Nuevas Rutas:
- `/signup-questionnaire` - Registro mejorado multi-rol
- `/signup-legacy` - Registro anterior (mantenido para referencia)

### Flujo de Autenticación:
1. Usuario hace clic en "Crear Cuenta" en `/auth`
2. Redirige a `/signup-questionnaire`
3. Completa proceso de registro paso a paso
4. Crea cuenta en Supabase Auth + perfil completo
5. Redirige a dashboard según confirmación de email

## 🧪 Testing del Sistema

### Casos de Prueba Recomendados:

#### 1. Registro de Doctor
- Completar información profesional
- Seleccionar especialidad
- Asociar a clínica existente o crear nueva
- Verificar acceso post-registro

#### 2. Registro de Paciente
- Proceso simplificado
- Sin requisitos profesionales
- Información médica básica
- Verificar acceso limitado

#### 3. Registro de Personal Administrativo
- Crear nueva clínica
- Configurar institución
- Verificar permisos administrativos

#### 4. Seguridad RLS
- Intentar acceso cross-clínica
- Verificar permisos por rol
- Confirmar aislamiento de datos

## 🔧 Personalización y Configuración

### Agregar Nuevas Especialidades:
```sql
INSERT INTO medical_specialties (name, category, description, requires_license)
VALUES ('Nueva Especialidad', 'medical', 'Descripción', true);
```

### Configurar Permisos de Rol:
```sql
UPDATE user_roles 
SET permissions = '{"new_permission": ["read", "write"]}'::jsonb
WHERE name = 'doctor';
```

### Crear Nueva Clínica:
```sql
INSERT INTO clinics (name, type, address, phone, email)
VALUES ('Nueva Clínica', 'clinic', 'Dirección', 'Teléfono', 'Email');
```

## 📞 Soporte y Mantenimiento

### Logs y Monitoreo:
- Todos los registros incluyen logs detallados
- Errores se muestran al usuario de forma amigable
- Sistema de auditoría automático

### Backup y Recuperación:
- Backup automático antes de aplicar migraciones
- Políticas RLS protegen contra eliminación accidental
- Soft delete implementado donde sea apropiado

### Escalabilidad:
- Estructura preparada para múltiples clínicas
- Índices optimizados para performance
- Queries eficientes con filtros por clínica

## 🎉 Funcionalidades Completadas

✅ **Sistema Multi-Rol Completo**
✅ **Gestión de Clínicas Integrada**
✅ **Registro Paso a Paso Intuitivo**
✅ **Seguridad RLS Robusta**
✅ **Especialidades Médicas Completas**
✅ **Validaciones Específicas por Rol**
✅ **Interfaz de Usuario Mejorada**
✅ **Documentación Completa**

El sistema está listo para usar y puede manejar el crecimiento de múltiples clínicas y miles de usuarios con permisos apropiados para cada rol.