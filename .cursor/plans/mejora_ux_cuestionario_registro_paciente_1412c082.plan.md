---
name: Mejora UX cuestionario registro paciente
overview: Plan para mejorar el layout, visibilidad de opciones, diseño visual y datos mostrados en el cuestionario de escalas del registro público de pacientes (enlace de invitación).
todos: []
isProject: false
---

# Plan: Mejora UX/UI del cuestionario en registro público de pacientes

## Contexto

El flujo de registro por enlace ([src/pages/PatientPublicRegistration.tsx](src/pages/PatientPublicRegistration.tsx)) muestra un cuestionario de escalas (ej. Índice de Katz) renderizado por [src/components/ScaleStepper.tsx](src/components/ScaleStepper.tsx). Los datos del token (`patient_registration_tokens`) incluyen: `doctor_id`, `clinic_id`, `message_template`, `invitation_template`. Actualmente no se muestran el mensaje personalizado ni los datos del médico de forma clara, y las opciones de respuesta se truncaban.

---

## 1. Arreglo del layout y visibilidad de opciones en ScaleStepper

**Problema:** Las opciones de respuesta se truncan ("Independiente: Se lava solo o necesita ayuda solo pa...").

**Causa:** En [ScaleStepper.tsx](src/components/ScaleStepper.tsx) (líneas 103-127):

- Altura fija `h-56 sm:h-64` impide mostrar texto largo
- `grid-cols-2` en sm fuerza dos columnas y trunca el texto
- Los botones no permiten wrap (`whitespace-normal`, `break-words`)
- `overflow-hidden` en el contenedor padre recorta el contenido

**Cambios:**

- Aumentar la altura del panel o hacerla flexible (`min-h-[200px]` o `min-h-[14rem]`) en lugar de altura fija
- Añadir a los botones de opciones: `whitespace-normal text-left break-words min-w-0`
- En móvil usar `grid-cols-1` para que cada opción ocupe el ancho completo y el texto pueda envolver
- Sustituir `overflow-hidden` por `overflow-y-auto` en el contenedor del panel para permitir scroll si hay mucho contenido
- Ajustar `max-w` del modal en pantallas pequeñas (`max-w-[95vw]` o similar) para mejorar responsividad

---

## 2. Mensaje personalizado del médico (message_template)

**Problema:** El mensaje configurado por el médico no se muestra.

**Estado actual:** El token tiene `message_template` (columna en BD desde [20260211130000_improve_patient_invitation_tokens.sql](supabase/migrations/20260211130000_improve_patient_invitation_tokens.sql)), pero [PatientPublicRegistration](src/pages/PatientPublicRegistration.tsx) solo hace `select` de `invitation_template` y no de `message_template`.

**Cambios:**

- Añadir `message_template` al `select` del token (línea ~122)
- Añadir `message_template?: string | null` al tipo `TokenRow`
- Mostrar el mensaje en la parte superior del header (antes del texto de bienvenida) cuando exista

---

## 3. Datos del médico debajo del nombre de la clínica

**Estado actual:** Se muestra algo como "Bienvenido(a). Este registro será entregado a Dr. Yocu en Consultorio privado Dr. Yocu." (welcome, línea 401). No hay un bloque dedicado con clínica y doctor.

**Cambios:**

- Reorganizar el header para mostrar:
  1. Título (Registro de paciente / Cuestionarios asignados...)
  2. **Clínica** en un bloque destacado (p. ej. card o texto más grande)
  3. **Médico** debajo de la clínica (nombre, y si está disponible en BD: `profiles.specialty`)
- Consultar `profiles(specialty)` en el doctor para mostrar especialidad si se desea
- Asegurarse de que el orden sea: mensaje del médico → clínica → médico

---

## 4. Mejoras de estilo del cuestionario para que sea más agradable

**Cambios en ScaleStepper:**

- Usar bordes y sombras más suaves
- Mejorar contraste de opciones (hover/focus) y espaciado
- Añadir transiciones ligeras en hover/focus
- Barras de progreso o indicadores de pasos más claros (p. ej. dots o barra porcentual)
- Ajustar tipografía (tamaños y pesos) para jerarquía visual clara
- Asegurar `min-height` en botones para áreas táctiles (~44px) en móvil

**Cambios en PatientPublicRegistration (paso 3):**

- Estilo más consistente con el resto del flujo
- Lista de escalas pendientes/completadas más legible
- Mejor contraste en texto e iconografía

---

## 5. Responsividad en todos los dispositivos

- Usar `min-h-[44px]` o similar en botones y controles táctiles para móvil
- Garantizar que el modal de ScaleStepper se adapte a viewport pequeño
- Revisar padding y márgenes en pantallas muy estrechas
- Probar en móvil que no haya overflow horizontal

---

## 6. Sugerencias adicionales de UX

- Indicador de progreso más visible (ej. "Pregunta 2 de 6" con barra o dots)
- Posibilidad de ir hacia atrás (anterior) sin perder respuestas
- Feedback visual al seleccionar una opción (check o highlight breve)
- Animación sutil al avanzar de pregunta
- Texto de ayuda más visible ("Responde tocando una opción; avanza automáticamente")
- Ajustar el orden: Imprimir / Finalizar para que Finalizar sea la acción principal
- Opcional: modo “solo lectura” de la última pantalla antes de finalizar

---

## Archivos a modificar


| Archivo                                                                            | Cambios                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [src/components/ScaleStepper.tsx](src/components/ScaleStepper.tsx)                 | Layout, opciones visibles, grid responsive, estilo, indicador de progreso      |
| [src/pages/PatientPublicRegistration.tsx](src/pages/PatientPublicRegistration.tsx) | Fetch de `message_template`, header (mensaje, clínica, médico), estilo general |


---

## Orden de implementación sugerido

1. ScaleStepper: layout y visibilidad de opciones (impacto inmediato)
2. PatientPublicRegistration: mensaje del médico y datos clínica/médico
3. ScaleStepper: refinamientos de estilo y UX
4. Pruebas en móvil y desktop

