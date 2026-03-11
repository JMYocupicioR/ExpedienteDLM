---
name: netlify-deploy
description: Configuración de despliegue, redirects y edge functions de Netlify para ExpedienteDLM
---

# Netlify Deploy Skill

## Archivos de configuración

### `netlify.toml` (principal)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### `.netlify.toml` (complementario)
Configuración adicional con headers de seguridad, redirects adicionales, etc.

### `.netlifyignore`
Archivos excluidos del deploy para optimizar tiempos de build.

## Variables de entorno requeridas

Configurar en **Netlify Dashboard > Site settings > Environment variables**:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `VITE_GEMINI_API_KEY` | API key de Google Gemini |
| `VITE_OPENAI_API_KEY` | API key de OpenAI/DeepSeek |
| `VITE_HCAPTCHA_SITE_KEY` | Site key de hCaptcha |
| `VITE_PHI_ENCRYPTION_KEY` | Key de encryption para PHI |
| `VITE_GOOGLE_CALENDAR_CLIENT_ID` | Client ID de Google Calendar |

> **Importante**: Variables con prefijo `VITE_` son expuestas al frontend (bundle).

## SPA Routing

El redirect `/* → /index.html` con status 200 es **crítico** para que React Router funcione. Sin esto, todas las rutas excepto `/` dan 404.

## Netlify Edge Functions

### Ubicación: `netlify/edge-functions/`

Edge functions de Netlify (separadas de Supabase edge functions). Actualmente contiene `verify-hcaptcha.ts`.

### Diferencias clave:

| | Supabase Edge Functions | Netlify Edge Functions |
|---|---|---|
| **Ubicación** | `supabase/functions/` | `netlify/edge-functions/` |
| **Runtime** | Deno (Supabase) | Deno (Netlify Edge) |
| **Invocación** | `supabase.functions.invoke()` | URL directa o redirect |
| **Auth** | Supabase JWT | Custom |
| **Uso principal** | Business logic, DB operations | CDN-level (captcha, geo) |

## Troubleshooting de builds

### Error: "Unable to resolve module"
- Verificar que todos los imports existen (`@/` alias funciona en Vite pero no directamente en Node)
- Un import roto causa que todo el build falle en Netlify

### Error: 404 en todas las rutas
- Verificar que el redirect `/*` está en `netlify.toml`
- El archivo debe estar en la raíz del proyecto

### Page Not Found (custom 404)
- `src/pages/NotFound.tsx` — página 404 custom con branding DeepLux
- React Router captura rutas desconocidas y renderiza este componente

## Workflow de deploy

```
git push origin main
  → Netlify detecta cambio
  → npm run build (Vite build)
  → Deploy automático de /dist
  → SPA redirects aplicados
```

## Build commands útiles

```powershell
# Build local para verificar antes de deploy
npm run build

# Preview del build local
npm run preview

# Build con análisis de bundle size
npm run build:analyze
```
