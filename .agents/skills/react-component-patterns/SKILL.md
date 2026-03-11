---
name: react-component-patterns
description: Patrones de componentes React, hooks y estructura del frontend de ExpedienteDLM
---

# React Component Patterns Skill

## Stack del frontend
- **React 18** + TypeScript
- **Vite** (build tool, dev server en puerto 3000)
- **Tailwind CSS v3** + CSS custom (`unified-design-system.css`)
- **React Router v6** (routing)
- **TanStack Query v5** (data fetching / cache)
- **React Hook Form v7** (formularios)
- **Recharts** (gráficas)
- **Lucide React** (iconos)
- **Framer Motion** (animaciones) — via headlessui

## Estructura del proyecto

```
src/
├── App.tsx              # Router principal + layout
├── pages/               # Páginas (componentes de ruta)
├── components/          # Componentes reutilizables
│   ├── ui/              # Componentes base (botones, modals, etc.)
│   ├── shared/          # Componentes compartidos
│   ├── Navigation/      # Navbar, sidebar
│   ├── Layout/          # Layouts
│   ├── Brand/           # Logo, branding
│   ├── guards/          # Route guards (auth, role)
│   ├── settings/        # Componentes de configuración
│   ├── clinic-admin/    # Administración de clínica
│   ├── clinic-config/   # Configuración de clínica
│   ├── medical-scales/  # Escalas médicas
│   ├── patient-registration/  # Registro de pacientes
│   ├── studies/         # Estudios médicos
│   ├── services/        # Componentes de servicios
│   └── assistant/       # Componentes de asistente
├── features/            # Módulos por dominio
│   ├── appointments/
│   ├── authentication/
│   ├── clinic/
│   ├── medical-records/
│   ├── medical-templates/
│   ├── patients/
│   ├── prescriptions/
│   ├── questionnaire-manager/
│   ├── exercise-manager/
│   ├── adherence-dashboard/
│   └── super-admin/
├── hooks/               # Custom hooks globales
├── lib/                 # Utilidades, servicios, tipos
│   └── services/        # Service layer (API calls)
├── context/             # React Contexts
├── data/                # Data estáticos (CIE-10, etc.)
├── styles/              # CSS global
├── utils/               # Utilidades puras
└── test/                # Testing utilities
```

## Convenciones de componentes

### Nombrado
- Componentes: `PascalCase.tsx` → `PatientRecordHeader.tsx`
- Hooks: `useCamelCase.ts` → `useClinicConfiguration.ts`
- Servicios: `kebab-case.ts` → `clinic-config-service.ts`
- Tipos: `*.types.ts` → `medical-scale.types.ts`

### Alias de importación
```typescript
import { supabase } from '@/lib/supabase';
import { useClinicConfiguration } from '@/hooks/useClinicConfiguration';
```
Configurado en `vite.config.ts`: `'@' → './src'`

### Tamaño máximo recomendado
- **Target**: ~500 líneas por componente
- Si supera 800 líneas, considerar extraer:
  - Sub-componentes en archivos separados
  - Lógica a hooks custom
  - Servicios a `lib/services/`

### Patrón de servicio (lib/services)
```typescript
import { supabase } from '@/lib/supabase';

export class NombreService {
  static async metodo(param: string): Promise<TipoRetorno> {
    const { data, error } = await supabase
      .from('tabla')
      .select('*')
      .eq('campo', param);
    if (error) throw error;
    return data;
  }
}

export default NombreService;
```

### Patrón de hook custom
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useNombreHook(param: string) {
  const [data, setData] = useState<Tipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('tabla').select('*').eq('campo', param);
        if (error) throw error;
        setData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [param]);

  return { data, loading, error };
}
```

### Patrón de Context
```typescript
// context/NombreContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface NombreContextType {
  value: string;
  setValue: (v: string) => void;
}

const NombreContext = createContext<NombreContextType | undefined>(undefined);

export function NombreProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('');
  return (
    <NombreContext.Provider value={{ value, setValue }}>
      {children}
    </NombreContext.Provider>
  );
}

export function useNombre() {
  const ctx = useContext(NombreContext);
  if (!ctx) throw new Error('useNombre must be inside NombreProvider');
  return ctx;
}
```

## Features (módulos por dominio)

Cada feature folder contiene:
```
features/nombre/
├── components/    # Componentes específicos del dominio
├── hooks/         # Hooks del dominio
├── services/      # Servicios/API del dominio
├── types/         # Tipos TypeScript
└── index.ts       # Re-exportaciones (barrel)
```

## Iconos
```typescript
import { Calendar, User, Settings } from 'lucide-react';
```

## Formularios (React Hook Form)
```typescript
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
```
