# OMEGA Manifest Editor - Handoff Briefing

> **Última actualización:** 2026-06-14
> **Sesión:** Era 9.4.0 — Alignment Fix, Ghost Preview, Keyboard Shortcuts

Este briefing sirve como guía técnica para desarrolladores o agentes de IA que asuman el mantenimiento o desarrollo del repositorio.

---

## 🏗️ Resumen del Proyecto y Arquitectura

El **OMEGA Manifest Editor** es una SPA reactiva desarrollada sobre Next.js 16 (App Router) y React 19. Su único propósito es la creación, visualización y edición interactiva de manifiestos de configuración de módulos `.acemm` para el motor modular **ABDOmega**.

- **URL de producción:** [https://abd-omega-editor.vercel.app/](https://abd-omega-editor.vercel.app/) (apunta a `manifests.ajabadia.es`)
- **Stack:** Next.js 16.2.4, React 19.2.4, Tailwind CSS 4, Framer Motion v12.38, TypeScript strict
- **UI Core:** `src/omega-ui-core/` — biblioteca de diseño analógico compartida (Knobs, Jacks, Sliders, LEDs)

---

## 🔗 Integraciones Críticas

1. **File System Access API:** `useManifestTransfer.ts` — `window.showDirectoryPicker()` para vincular carpetas locales.
2. **SSE Watchdog:** `omega-watchdog.mjs` — servidor local Node.js que escucha cambios en FS y actualiza el editor en caliente.
3. **UI Core (`omega-ui-core`):** Biblioteca compartida de renderizado analógico.

---

## 📋 Comandos Clave

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor local en `localhost:3000` (o 3035) |
| `npm run build` | Build de producción |
| `npx tsc --noEmit` | Typecheck (0 errores requerido) |
| `npx jest` | Tests unitarios (136 tests, 10 suites) |
| `npm run full-audit` | Auditoría completa (typecheck + lint + estructural) |
| `node omega-watchdog.mjs [ruta]` | Lanza watchdog SSE |

---

## 🛠 Cambios de la Última Sesión (Era 9.4.0)

### 1. 🔧 Fix Crítico: Botones de Alineación no Funcionaban

**Archivo:** `src/features/manifest-editor/components/viewport/ViewportToolbar.tsx`

**Problema:** Al hacer clic en un botón de alineación, se deseleccionaban todos los elementos y los botones se deshabilitaban.

**Causa raíz:** El `onMouseDown` del `<section>` en `WorkbenchViewport.tsx` tiene un guard que busca `[data-toolbar]` en `.closest()` para ignorar clicks en la toolbar y no iniciar el modo drag-to-pan. El `ViewportToolbar` **no tenía el atributo `data-toolbar`**, por lo que el clic iniciaba drag-to-pan y el `mouseup` ejecutaba `onSelectItem(null)` borrando la selección.

**Fix:** Una línea — añadido `data-toolbar` al div principal del toolbar.

```tsx
<div data-toolbar className="absolute top-0 left-0 right-0 z-[61] ...">
```

### 2. 👻 Alignment Ghost Preview

**Archivos nuevos:**
- `src/features/manifest-editor/components/viewport/AlignGhostOverlay.tsx` — Componente que renderiza rectángulos fantasma (borde dashed cyan, fondo semitransparente, etiqueta de coordenadas, badge de tipo) para cada elemento seleccionado en su posición proyectada.

**Archivos modificados:**
- `ViewportToolbar.tsx` — Añadido `onGhostPreviewChange` callback prop, `showGhostPreview()` y `hideGhostPreview()` callbacks. Cada `AlignBtn` ahora tiene `onMouseEnter={() => showGhostPreview('left')}` y `onMouseLeave={hideGhostPreview}`.
- `WorkbenchViewport.tsx` — Nuevo estado `alignGhostItems`/`alignGhostType`, callback `handleGhostPreviewChange`. Añadido `[data-ghost-overlay]` al guard de `onMouseDown` para evitar que el ghost overlay interfiera. Props `onGhostPreviewChange`, `alignGhostItems`, `alignGhostType` conectados.
- `VirtualRack.tsx` — Nuevas props `alignGhostItems`/`alignGhostType`. Renderiza `AlignGhostOverlay` dentro del rack-viewport (mismo espacio de coordenadas que los elementos UCA). Wrapping `<div data-ghost-overlay>`.

### 3. ⌨️ Keyboard Shortcuts de Alineación

**Archivo:** `ViewportToolbar.tsx`

Añadidas constantes y handler:
- `SHORTCUT_TO_ALIGN`: Mapea tecla → tipo de alineación
- `SHORTCUT_LABELS`: Mapea tecla → string "Ctrl+Shift+X" para tooltips
- `useEffect` con keydown listener: guarda inputs, chequea Ctrl+Shift, mapea tecla, ejecuta `handleAlign`/`handleDistribute`
- Cada `AlignBtn` title actualizado para mostrar el shortcut

| Tecla | Acción |
|-------|--------|
| Ctrl+Shift+L | Alinear izquierda |
| Ctrl+Shift+H | Centrar horizontalmente |
| Ctrl+Shift+R | Alinear derecha |
| Ctrl+Shift+T | Alinear arriba (top) |
| Ctrl+Shift+M | Centrar verticalmente (middle) |
| Ctrl+Shift+B | Alinear abajo (bottom) |
| Ctrl+Shift+D | Distribuir horizontalmente |
| Ctrl+Shift+V | Distribuir verticalmente |

---

## 📋 Todo lo Pendiente (Actualizado)

### Prioridad Alta

#### R1a — Indicadores Visuales en LayersPanel
- **Colores por categoría de nodo:** Asignar color distintivo por tipo: knob (naranja), port (cyan), slider (verde), display (púrpura), container/grupo (azul), label/switch/button (gris).
- **Badge de cantidad de hijos:** Badge numérico en nodos container/group con cuenta de hijos directos.
- **Iconos mejorados:** Sustituir iconos genéricos por variantes más descriptivas.
- **Barra de progreso de filtros:** Indicador de nodos visibles vs ocultos por filtros.

#### R1b — Ghost Preview Drag & Drop en LayersPanel
- **Preview fantasma al arrastrar:** Silueta semitransparente del nodo arrastrado que sigue al cursor.
- **Animaciones de reordenación:** Transiciones suaves (framer-motion AnimatePresence) en el árbol.
- **Feedback de soltado:** Indicadores glow mejorados para top/bottom/inside en lugar de línea estática.

#### R1c — Filtros por Propiedades
- **Binding/value:** Buscar nodos por bind, value, min, max, etc.
- **Auditoría:** Ocultar/mostrar nodos con warnings/errores de integridad.
- **Plantilla:** Filtrar nodos de una blueprint template específica.

### Prioridad Media

#### R2 — Simulaciones Dinámicas Extendidas
- **Tipos de onda:** triangle, pulse/PWM, sample-and-hold, ADSR, step sequencer, random correlacionado.
- **Comportamientos:** Modulación cruzada, curvas no lineales, slew rate/portamento, cuantización.
- **Scope widget:** Visualización en tiempo real de forma de onda, frecuencia y amplitud.
- **Persistencia:** Guardar/configuración de simulación en proyecto .omega.
- **Routing visual:** Líneas de modulación animadas en el rack.

#### R3 — Grupos Compositivos → Blueprints
- **Parámetros expuestos:** Seleccionar atributos internos como placeholders al guardar blueprint.
- **Preview:** Miniatura del grupo antes de inyectar.
- **Nested groups:** Grupos dentro de grupos.
- **Versioning:** Seguimiento de versiones de blueprints.
- **Edición post-inyección:** Reabrir GroupEditor para modificar hijos de grupo inyectado.

### Prioridad Baja (Tech Debt)

- **Timer Tests:** Más cobertura de setTimeout/clearTimeout en useBatchHistory.spec.ts.
- **Consolidar constantes:** Mover SHORTCUT_TO_ALIGN, SHORTCUT_LABELS, GHOST_TYPE_MAP a archivo compartido.
- **Refactor useAlignment hook:** Extraer gatherPositions, computeAlignedPositions, applyPositionBatch de ViewportToolbar a hook reutilizable.
- **Eliminar logs diagnóstico:** Revisar ViewportToolbar.tsx por logs persistentes agregados durante debugging.
- **Limpiar `manifest.ui!.tree!`:** Reemplazar non-null assertions en showGhostPreview por variables locales ya guardadas.

---

## ⚠️ Directivas Técnicas

- **`exactOptionalPropertyTypes`** habilitado → todas las props opcionales deben tiparse con `| undefined`.
- **Tipos experimentales:** Castings `(handle as any)` necesarios para showDirectoryPicker.
- **Modal sizes:** `max-w-7xl` width, `h-full max-h-[850px]` height.
- **Layout Multi-Pane:** 1-4 paneles (primary, primary_bottom, secondary, secondary_bottom), splitters independientes.
- **Historial selectivo:** Solo mutaciones de datos del rack, NO cambios de UI (zoom, pan, split).
- **Rack HUD aislado:** Zoom/pan solo en RACK_FRAME, no en botones ENGINEERING/LIVE ni planos.
