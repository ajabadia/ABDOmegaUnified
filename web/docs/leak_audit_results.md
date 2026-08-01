# Auditoría de Fugas Estéticas (Leak Audit)

> **Fecha:** 2026-06-11
> **Contexto:** Self-Contained Manifest — Era 9.2.0-dev
> **Propósito:** Catalogar todos los puntos del editor donde se resuelven valores estéticos usando recursos externos al manifiesto (constantes hardcodeadas, CSS, lógica de fallback en JS).
> **Uso:** Guía paso a paso para eliminar estas dependencias y completar la transición al Self-Contained Manifest.

---

## F1: ColorResolver.defaults (Colores por Defecto)

**Ubicación:** `src/omega-ui-core/utils/ColorResolver.ts`

```typescript
const defaults: Record<string, string> = {
  primary: '#00f2ff', secondary: '#ff8c00', utility: '#a0a0a0',
  feedback: '#32cd32', surface: '#121416', hardware: '#777777',
  chassis: '#1a1a1a', text: '#ffffff', glow: '#00f2ff',
  glass: 'rgba(255,255,255,0.05)', warning: '#ff3300',
  highlight: '#ffffff', weak: '#555555'
};
```

**Problema:** Si `manifest.ui.palette` no contiene un token, el editor usa estos valores hardcodeados en JS. Omega (C++) no tiene acceso a esta tabla.

**Acción:** Deprecar gradualmente:
1. Asegurar que `manifest.ui.palette` se popula siempre (migración legacy en memoria)
2. Eliminar los defaults y que `resolve()` devuelva error/transparent si el token no existe en palette

---

## F2: isCustom Gate Bypass

### F2.1: Renderizado Condicionado en Primitivas

**Ubicación:** `src/omega-ui-core/renderers/CellRenderer.ts` (líneas 105, 129, 145, 157, 165)

```typescript
const isCustom = opt.manifest?.ui?.skinMode === 'custom';
const resolvedIndicator = isCustom ? ColorResolver.resolve(...) : undefined;
```

**Problema:** Cuando `skinMode !== 'custom'`, la resolución dinámica se omite y se retorna `undefined`, forzando al motor a usar colores de clases CSS del editor.

**Acción:** Eliminar el gate `isCustom` y forzar resolución siempre.

### F2.2: Visibilidad de Propiedades en el Inspector

**Ubicaciones:**
- `src/features/manifest-editor/components/inspector/shared/IndustrialGovernanceConsole.tsx` — Badge "Expert Mode / Standard Theme Mode" + posible ocultación de controles
- `src/features/manifest-editor/components/inspector/primitives/SliderProperties.tsx` — `{isCustom && (<StyleLibraryLink ...>)}` oculta link a librería de estilos en modo standard
- `src/features/manifest-editor/components/inspector/primitives/DisplayProperties.tsx` — `{isCustom && (...)}` + mensaje "locked" cuando no es custom

**Acción:** El inspector debe permitir siempre la edición de variantes, independientemente del skinMode.

---

## F3: Dimensiones y Métricas Físicas

### F3.1: RADIUS_MAP Hardcodeado

**Ubicación:** `src/omega-ui-core/renderers/utils/CellMetrics.ts`

```typescript
const RADIUS_MAP: Record<string, Record<string, number>> = {
  knob: { A: 24, B: 18, C: 12, D: 9 },
  port: { A: 21, B: 18, C: 15, D: 12 },
  display: { A: 16.5, B: 13, C: 10, D: 7 },
  led: { A: 6, B: 4, C: 2.5, D: 1.5 },
  slider: { A: 6, B: 6, C: 6, D: 6 },
  switch: { A: 16, B: 12, C: 10, D: 8 },
  stepper: { A: 12, B: 9, C: 7, D: 6 },
  select: { A: 12, B: 12, C: 12, D: 12 }
};
```

**Problema:** Mapea letras de tamaño (A/B/C/D) a píxeles. Omega no tiene esta tabla.

**Acción:** Reemplazar lookup por consultas a `manifest.ui.sizes[size]` (ver sección 2.2 del diseño).

### F3.2: Clases CSS de Dimensiones (size-X)

**Ubicación:** Renderers en `src/omega-ui-core/renderers/` + archivos CSS asociados

```tsx
className={`knob-container size-${sizeLabel} ...`}
```

```css
.knob-container.size-A { width: 48px; height: 48px; }
```

**Problema:** El tamaño final se aplica mediante clases CSS. Omega no tiene CSS.

**Acción:** Los componentes deben aplicar ancho/alto como estilos inline (`style={{ width, height }}`) calculados desde el manifiesto.

---

## F4: Clases CSS de Colores (Theme Presets)

**Ubicación:** Archivos CSS de primitivas (`knob.css`, etc.)

```css
.knob-container.color-cyan .knob-marker { background: var(--wb-primary) !important; }
.knob-container.color-red .knob-marker { background: #ff4444 !important; }
```

**Problema:** Los colores de variantes (cyan, red, orange...) se asignan mediante selectores CSS con colores fijos o variables del workbench (`--wb-primary`).

**Acción:** Los colores deben inyectarse mediante variables CSS inline específicas de Omega (`--omega-indicator-color`, `--omega-color-override`) resueltas desde el manifiesto. Si el CSS no existe (C++), el valor se extrae del JSON.

---

## F5: Herencia de Tipografía (TypographyInheritance)

**Ubicación:** `src/omega-ui-core/renderers/utils/TypographyInheritance.ts`

```typescript
let cat: 'headings' | 'labels' | 'displays' | 'technical' = 'labels';
```

**Problema:** Si el manifiesto no especifica tipografía, el sistema asume categorías implícitas con fallbacks hardcodeados.

**Acción:** Fosilizar estos mapeos en `manifest.ui.typography` mediante el migrador automático, eliminando la lógica de fallback en tiempo de render.

---

## Resumen de Archivos Afectados

| Archivo | Líneas | Fugas | Prioridad |
|---------|--------|-------|-----------|
| `src/omega-ui-core/utils/ColorResolver.ts` | ~80 | F1 | 🔴 Alta |
| `src/omega-ui-core/renderers/CellRenderer.ts` | ~200 | F2.1 | 🔴 Alta |
| `src/omega-ui-core/renderers/utils/CellMetrics.ts` | ~40 | F3.1 | 🟡 Media |
| `src/omega-ui-core/renderers/utils/TypographyInheritance.ts` | ~30 | F5 | 🟡 Media |
| `src/omega-ui-core/renderers/KnobRenderer.ts` | ~80 | F3.2, F4 | 🟡 Media |
| `src/omega-ui-core/renderers/SliderRenderer.ts` | ~60 | F3.2, F4 | 🟡 Media |
| `src/omega-ui-core/renderers/LedRenderer.ts` | ~60 | F3.2, F4 | 🟡 Media |
| `src/omega-ui-core/renderers/PortRenderer.ts` | ~60 | F3.2, F4 | 🟡 Media |
| CSS files en primitivas/ | varios | F4 | 🟢 Baja |
| `.../IndustrialGovernanceConsole.tsx` | ~70 | F2.2 | 🟢 Baja |
| `.../SliderProperties.tsx` | ~100 | F2.2 | 🟢 Baja |
| `.../DisplayProperties.tsx` | ~100 | F2.2 | 🟢 Baja |

---

*OMEGA — Engineering Standard v9.2.0-dev — Leak Audit — 2026-06-11*
