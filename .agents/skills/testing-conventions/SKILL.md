---
name: testing-conventions
description: Convenciones de testing con Vitest, Testing Library y mocking de Supabase para ExpedienteDLM
---

# Testing Conventions Skill

## Stack de testing
- **Vitest** — Test runner (compatible con Jest API)
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`)
- **Happy DOM** / **JSDOM** — Entorno DOM
- **Coverage**: `@vitest/coverage-v8`

## Configuración

### `vitest.config.ts`
```typescript
// Hereda de vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
});
```

### `vitest.setup.ts`
Setup global con matchers de jest-dom:
```typescript
import '@testing-library/jest-dom';
```

## Comandos

```powershell
# Correr todos los tests
npm test

# Con UI interactiva
npm run test:ui

# Con coverage report
npm run test:coverage

# Modo watch
npm run test:watch
```

## Estructura de archivos de test

```
src/
├── lib/
│   ├── __tests__/          # Tests de lib utilities
│   │   └── validation.test.ts
│   └── services/
│       └── __tests__/      # Tests de servicios
│           └── audit-service.test.ts
├── test/                    # Test utilities compartidas
└── features/
    └── patients/
        └── __tests__/       # Tests del feature
```

### Convención de naming
- Archivos: `nombre.test.ts` o `nombre.test.tsx`
- Carpetas: `__tests__/` junto al código que testean

## Patrones de test

### Test de servicio (sin componente)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NombreService } from '../nombre-service';

// Mock de Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    })),
  },
}));

describe('NombreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data correctly', async () => {
    const result = await NombreService.metodo('param');
    expect(result).toBeDefined();
  });
});
```

### Test de componente React
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MiComponente } from '../MiComponente';

describe('MiComponente', () => {
  it('renders correctly', () => {
    render(<MiComponente />);
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MiComponente />);
    
    await user.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => {
      expect(screen.getByText('Guardado')).toBeInTheDocument();
    });
  });
});
```

### Mocking de Supabase client

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));
```

## Quality checks completos

```powershell
# Typecheck + Lint + Format check
npm run check

# Typecheck + Lint fix + Format fix
npm run check:fix
```
