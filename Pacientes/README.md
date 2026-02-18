# Pacientes App (Standalone)

Aplicacion mobile-first para pacientes, ejecutable de forma independiente desde esta carpeta.

## Requisitos

- Node.js 18+
- Variables de entorno configuradas en `.env` usando `.env.example`

## Ejecutar localmente

```bash
npm install
npm run dev
```

La app inicia con Vite en `http://localhost:3010`.

## Build de produccion

```bash
npm run build
npm run preview
```

## Estructura

- `src/features/auth`: acceso y registro de pacientes
- `src/features/timeline`: tareas diarias
- `src/features/scales`: respuesta de escalas
- `src/features/messages`: mensajeria bidireccional
- `src/features/appointments`: solicitud/agendamiento
- `src/features/progress`: graficas de progreso
- `src/features/exercises`: terapia asignada
- `src/features/medications`: medicamentos activos
- `src/features/profile`: cuenta del paciente

## Nota de backend

Esta app usa el mismo proyecto Supabase que el panel medico.  
Las migraciones y edge functions se mantienen en `../supabase/` para compartir la misma base de datos.
