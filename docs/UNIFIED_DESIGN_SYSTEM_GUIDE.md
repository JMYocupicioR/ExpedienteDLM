# Guía del Sistema de Diseño Unificado

## Introducción

Este documento describe cómo usar correctamente el sistema de diseño unificado para mantener la consistencia visual y mejorar la alineación en toda la aplicación.

## Variables CSS Principales

El sistema utiliza variables CSS consolidadas para mantener consistencia:

### Espaciado
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Tamaños de Fuente Responsivos
```css
--text-xs: clamp(0.75rem, 2vw, 0.875rem);
--text-sm: clamp(0.875rem, 2.5vw, 1rem);
--text-base: clamp(1rem, 3vw, 1.125rem);
--text-lg: clamp(1.125rem, 3.5vw, 1.25rem);
--text-xl: clamp(1.25rem, 4vw, 1.5rem);
--text-2xl: clamp(1.5rem, 5vw, 2rem);
--text-3xl: clamp(2rem, 6vw, 3rem);
```

## Estructura de Layout

### Contenedor Principal
```jsx
<div className="app-container">
  <div className="main-layout">
    <div className="content-wrapper">
      <div className="page-container">
        {/* Contenido */}
      </div>
    </div>
  </div>
</div>
```

### Secciones
```jsx
<section className="section">
  <div className="section-header">
    <h2 className="section-title">Título de la Sección</h2>
    <p className="section-subtitle">Descripción opcional</p>
  </div>
  
  {/* Contenido de la sección */}
</section>
```

## Componentes Comunes

### Cards
```jsx
<div className="card">
  <h3 className="text-lg font-semibold mb-4">Título de la Card</h3>
  {/* Contenido */}
</div>
```

### Listas con Viñetas
```jsx
<ul className="list">
  <li className="list-item">
    <span>Elemento de lista 1</span>
  </li>
  <li className="list-item">
    <span>Elemento de lista 2</span>
  </li>
</ul>
```

### Listas Numeradas
```jsx
<ol className="list list-numbered">
  <li className="list-item">
    <span>Primer elemento</span>
  </li>
  <li className="list-item">
    <span>Segundo elemento</span>
  </li>
</ol>
```

### Grids Responsivos

#### Grid de Estadísticas
```jsx
<div className="stats-grid">
  <div className="card">...</div>
  <div className="card">...</div>
  <div className="card">...</div>
</div>
```

#### Grid de Contenido
```jsx
<div className="content-grid content-grid-md">
  <div className="card">...</div>
  <div className="card">...</div>
</div>
```

### Formularios
```jsx
<form>
  <div className="form-group">
    <label className="form-label">Etiqueta</label>
    <input type="text" className="form-input" />
  </div>
  
  <div className="flex gap-3">
    <button className="btn btn-secondary">Cancelar</button>
    <button className="btn btn-primary">Guardar</button>
  </div>
</form>
```

### Botones
```jsx
<!-- Botón Primario -->
<button className="btn btn-primary">
  Acción Principal
</button>

<!-- Botón Secundario -->
<button className="btn btn-secondary">
  Acción Secundaria
</button>
```

## Utilidades de Espaciado

### Márgenes
```jsx
<div className="mt-4">...</div>  <!-- margin-top: 1rem -->
<div className="mb-6">...</div>  <!-- margin-bottom: 1.5rem -->
<div className="mt-8">...</div>  <!-- margin-top: 2rem -->
```

### Padding
```jsx
<div className="p-4">...</div>   <!-- padding: 1rem -->
<div className="p-6">...</div>   <!-- padding: 1.5rem -->
<div className="p-8">...</div>   <!-- padding: 2rem -->
```

## Responsive Design

### Breakpoints
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Clases Responsive
```jsx
<!-- Grid responsive -->
<div className="content-grid content-grid-md content-grid-lg">
  {/* 1 columna en móvil, 2 en tablet, 3 en desktop */}
</div>

<!-- Espaciado responsive -->
<div className="p-3 md:p-6 lg:p-8">
  {/* Padding adaptativo */}
</div>
```

## Mejores Prácticas

### 1. Usar Variables CSS
❌ Incorrecto:
```jsx
<div style={{ padding: '16px', marginBottom: '24px' }}>
```

✅ Correcto:
```jsx
<div className="p-4 mb-6">
```

### 2. Estructura Consistente de Secciones
❌ Incorrecto:
```jsx
<div className="mb-8">
  <h2 className="text-2xl font-bold text-white mb-4">Título</h2>
  <div className="bg-gray-800 p-6 rounded-lg">
    {/* Contenido */}
  </div>
</div>
```

✅ Correcto:
```jsx
<section className="section">
  <div className="section-header">
    <h2 className="section-title">Título</h2>
  </div>
  <div className="card">
    {/* Contenido */}
  </div>
</section>
```

### 3. Listas Estructuradas
❌ Incorrecto:
```jsx
<div>
  <div>• Item 1</div>
  <div>• Item 2</div>
</div>
```

✅ Correcto:
```jsx
<ul className="list">
  <li className="list-item">
    <span>Item 1</span>
  </li>
  <li className="list-item">
    <span>Item 2</span>
  </li>
</ul>
```

### 4. Grids Responsivos
❌ Incorrecto:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
```

✅ Correcto:
```jsx
<div className="content-grid content-grid-md content-grid-lg">
```

## Migración de Componentes Existentes

### Dashboard
```jsx
// Antes
<div className="dashboard-grid stats-grid">
  <div className="dashboard-card">

// Después  
<div className="stats-grid">
  <div className="card">
```

### Settings
```jsx
// Antes
<div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">

// Después
<div className="card">
```

### Formularios
```jsx
// Antes
<input className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400" />

// Después
<input className="form-input" />
```

## Conclusión

Al seguir estas guías, lograremos:
- ✅ Consistencia visual en toda la aplicación
- ✅ Mejor mantenibilidad del código
- ✅ Diseño responsive automático
- ✅ Accesibilidad mejorada
- ✅ Rendimiento optimizado

Para ver ejemplos prácticos, revisa el archivo `src/components/SettingsExample.tsx`.
