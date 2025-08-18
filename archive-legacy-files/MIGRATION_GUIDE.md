# 🚀 ExpedienteDLM - Guía de Migración a Arquitectura por Dominios

Esta guía te ayudará a migrar tu proyecto ExpedienteDLM de una estructura por tipos de archivo a una arquitectura moderna por dominios/features.

## 📋 Tabla de Contenidos

- [🔍 Resumen de Cambios](#-resumen-de-cambios)
- [⚡ Migración Rápida](#-migración-rápida)
- [🛠️ Migración Manual Paso a Paso](#️-migración-manual-paso-a-paso)
- [🎯 Beneficios de la Nueva Arquitectura](#-beneficios-de-la-nueva-arquitectura)
- [📚 Nuevo Flujo de Desarrollo](#-nuevo-flujo-de-desarrollo)

## 🔍 Resumen de Cambios

### Estructura Anterior vs Nueva

**ANTES (por tipos de archivo):**
```
src/
├── components/        # ❌ Todos los componentes mezclados
├── hooks/            # ❌ Todos los hooks mezclados
├── pages/            # ❌ Todas las páginas mezcladas
└── lib/              # ✅ Se mantiene igual
```

**DESPUÉS (por dominios):**
```
src/
├── features/         # ✨ NUEVO: Organizado por dominios
│   ├── authentication/
│   ├── patients/
│   ├── appointments/
│   ├── clinic/
│   ├── prescriptions/
│   ├── medical-templates/
│   ├── medical-records/
│   └── medical-scales/
├── components/       # ✨ SOLO componentes UI genéricos
│   ├── ui/          # Botones, inputs, modales
│   ├── layout/      # Layouts principales
│   └── shared/      # Componentes compartidos
├── hooks/           # ✨ SOLO hooks genéricos
├── lib/             # ✅ Configuración y servicios globales
└── pages/           # ✅ Se mantiene, solo ensambla features
```

## ⚡ Migración Rápida

### Paso 1: Instalar Dependencias
```bash
npm install prettier glob --save-dev
```

### Paso 2: Ejecutar Script de Migración
```bash
# Migrar archivos automáticamente
npm run migrate:features

# Actualizar imports automáticamente
npm run fix-imports

# Verificar que todo funciona
npm run check
```

### Paso 3: Verificar y Ejecutar
```bash
# Probar la aplicación
npm run dev

# Si hay errores de imports, arreglar manualmente
npm run lint
```

## 🛠️ Migración Manual Paso a Paso

### 1. Preparar el Entorno

```bash
# 1. Crear archivo de variables de entorno
cp env.example .env.local

# 2. Configurar tus variables de Supabase en .env.local
# VITE_SUPABASE_URL=tu-url-aqui
# VITE_SUPABASE_ANON_KEY=tu-clave-aqui
# SUPABASE_PROJECT_ID=tu-project-id-aqui
```

### 2. Generar Tipos de Supabase

```bash
# Generar tipos automáticamente
npm run gen:types

# O si usas Supabase local
npm run gen:types:local
```

### 3. Migrar por Dominio

#### Ejemplo: Dominio de Pacientes

1. **Crear estructura:**
   ```bash
   mkdir -p src/features/patients/{components,hooks,services,types,pages}
   ```

2. **Mover archivos:**
   ```bash
   mv src/hooks/usePatients.ts src/features/patients/hooks/
   mv src/components/NewPatientForm.tsx src/features/patients/components/
   mv src/pages/PatientsList.tsx src/features/patients/pages/
   ```

3. **Actualizar imports en cada archivo movido:**
   ```typescript
   // ANTES
   import { useAuth } from '../hooks/useAuth';
   import { PatientForm } from '../components/PatientForm';

   // DESPUÉS
   import { useAuth } from '@/features/authentication/hooks/useAuth';
   import { PatientForm } from '@/features/patients/components/PatientForm';
   ```

### 4. Implementar Capa de Servicios

Cada dominio debe tener su propio servicio:

```typescript
// src/features/patients/services/patientService.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

export class PatientService {
  static async getPatientsByClinic(clinicId: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId);

    return { data, error, success: !error };
  }
  // ... más métodos
}
```

### 5. Refactorizar Hooks

```typescript
// src/features/patients/hooks/usePatients.ts
import { PatientService } from '../services/patientService';

export const usePatients = () => {
  const loadPatients = async () => {
    const response = await PatientService.getPatientsByClinic(clinicId);
    // Manejar respuesta...
  };

  return { patients, loadPatients, createPatient, /* ... */ };
};
```

## 🎯 Beneficios de la Nueva Arquitectura

### ✅ **Escalabilidad**
- Agregar nuevas funciones es tan simple como crear una nueva carpeta en `features/`
- Cada dominio es independiente y autocontenido

### ✅ **Mantenimiento**
- Bugs en pacientes → todo el código está en `features/patients/`
- Cambios en autenticación → todo está en `features/authentication/`

### ✅ **Colaboración en Equipo**
- Desarrolladores pueden trabajar en diferentes dominios sin conflictos
- Estructura clara y predecible para nuevos miembros del equipo

### ✅ **Reutilización**
- Componentes UI genéricos en `components/ui/`
- Servicios centralizados y tipados
- Hooks específicos por dominio

### ✅ **Testing**
- Tests organizados por feature
- Fácil mockear servicios específicos
- Tests de integración más claros

## 📚 Nuevo Flujo de Desarrollo

### Agregar Nueva Funcionalidad

```bash
# 1. Crear estructura del dominio
mkdir -p src/features/billing/{components,hooks,services,types,pages}

# 2. Crear servicio
touch src/features/billing/services/billingService.ts

# 3. Crear tipos
touch src/features/billing/types/index.ts

# 4. Crear hook
touch src/features/billing/hooks/useBilling.ts

# 5. Crear componentes
touch src/features/billing/components/BillingForm.tsx

# 6. Crear página
touch src/features/billing/pages/BillingDashboard.tsx
```

### Scripts de Calidad de Código

```bash
# Verificar todo antes de commit
npm run check

# Arreglar problemas automáticamente
npm run check:fix

# Solo verificar tipos
npm run typecheck

# Solo lint
npm run lint

# Solo formato
npm run format
```

### Debugging

1. **VSCode**: Usa F5 para abrir el debugger
2. **React DevTools**: Instala la extensión del navegador
3. **Network Inspector**: Usa Ctrl+Shift+I → Network tab

## 🚨 Troubleshooting

### Error: Module not found

```bash
# Ejecutar el script de arreglo de imports
npm run fix-imports

# Si persiste, buscar y reemplazar manualmente
```

### Error: Cannot find type definitions

```bash
# Regenerar tipos de Supabase
npm run gen:types
```

### Error: ESLint warnings

```bash
# Arreglar automáticamente
npm run lint:fix
```

## 📞 Soporte

Si encuentras problemas durante la migración:

1. **Revisa los logs** de la consola del navegador
2. **Ejecuta** `npm run check` para ver todos los errores
3. **Compara** con la estructura de ejemplo en este documento
4. **Verifica** que todas las variables de entorno estén configuradas

---

## 🎉 ¡Felicidades!

Una vez completada la migración, tendrás:

- ✅ Estructura modular y escalable
- ✅ Tipos automáticos de Supabase
- ✅ Capa de servicios centralizada
- ✅ Entorno de debugging profesional
- ✅ Scripts de calidad de código
- ✅ Configuración de VSCode optimizada

**Tu proyecto ExpedienteDLM ahora está listo para escalar sin dolor.** 🚀
