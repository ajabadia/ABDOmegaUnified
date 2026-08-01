# Handoff Prompt — OMEGA Manifest Editor

> Copia y pega este bloque en una nueva sesión de Codebuff para continuar donde lo dejamos.

---

**Contexto:** Eres un agente retomando el desarrollo del OMEGA Manifest Editor. A continuación tienes el resumen de la última sesión y todo lo pendiente.

## Resumen de lo hecho (Era 9.4.0)

### 1. 🔧 Fix: Botones de alineación no funcionaban
**Archivo:** `ViewportToolbar.tsx`
**Causa:** Faltaba `data-toolbar` en el div principal del toolbar. El `onMouseDown` del viewport buscaba `[data-toolbar]` en `.closest()` para ignorar clicks, pero al no encontrarlo, iniciaba drag-to-pan y al soltar ejecutaba `onSelectItem(null)`.
**Fix:** 1 línea — `<div data-toolbar ...>`

### 2. 👻 Ghost Preview en botones de alineación
**Nuevo:** `AlignGhostOverlay.tsx` — rectángulos dashed cyan en posiciones proyectadas al hacer hover.
**Flujo:** `ViewportToolbar` computa posiciones en hover → emite via `onGhostPreviewChange` → `WorkbenchViewport` almacena estado → `VirtualRack` renderiza overlay dentro del rack-viewport.

### 3. ⌨️ Shortcuts de alineación (Ctrl+Shift + letra)
| Tecla | Acción |
|-------|--------|
| L | Alinear izquierda |
| H | Centrar horizontal |
| R | Alinear derecha |
| T | Alinear arriba |
| M | Centrar vertical |
| B | Alinear abajo |
| D | Distribuir horizontal |
| V | Distribuir vertical |

---

## Próximos Pasos (Priorizados)

### 🔴 Prioridad 1: LayersPanel — Indicadores Visuales
- **Colores por categoría:** knob (naranja), port (cyan), slider (verde), display (púrpura), container/grupo (azul)
- **Badge de cantidad de hijos** en nodos container/group
- **Iconos mejorados** según cellRef/kind
- **Barra de progreso de filtros**

### 🔴 Prioridad 2: LayersPanel — Ghost Preview Drag & Drop
- Preview fantasma semitransparente al arrastrar nodos
- Animaciones de reordenación con framer-motion
- Feedback de soltado mejorado (glow en lugar de línea estática)

### 🟡 Prioridad 3: LayersPanel — Filtros por Propiedades
- Filtro por binding/value/min/max
- Filtro por estado de auditoría
- Filtro por plantilla

### 🟡 Prioridad 4: Simulaciones Dinámicas Extendidas
- Nuevas ondas: triangle, PWM, S&H, ADSR, step sequencer
- Scope widget, cross-modulation, persistencia, routing visual

### 🟢 Prioridad 5: Tech Debt
- Consolidar constantes de shortcuts en archivo compartido
- Refactor `useAlignment` hook (extraer gatherPositions, computeAlignedPositions, applyPositionBatch)
- Timer tests en useBatchHistory
- Limpiar logs de diagnóstico
- Reemplazar `manifest.ui!.tree!` por variable local guardada

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/features/manifest-editor/components/viewport/ViewportToolbar.tsx` | Toolbar de alineación + ghost preview + shortcuts |
| `src/features/manifest-editor/components/viewport/AlignGhostOverlay.tsx` | Overlay fantasma para alineación |
| `src/features/manifest-editor/components/viewport/WorkbenchViewport.tsx` | Viewport principal, pasa ghost data |
| `src/features/manifest-editor/components/viewport/VirtualRack.tsx` | Renderiza rack + overlays |
| `src/features/manifest-editor/components/inspector/LayersPanel.tsx` | Panel de layers (objetivo de refinamiento R1) |
| `src/features/manifest-editor/hooks/useBatchHistory.ts` | Batch history hook |
| `src/features/manifest-editor/hooks/useLayerFilters.ts` | Layer filters hook |
| `ROADMAP.md` | Roadmap completo |
| `handoff.md` | Documentación técnica completa |
| `progress.md` | Progreso detallado |

## Comandos

```bash
npm run dev              # Iniciar servidor
npx tsc --noEmit         # Typecheck (0 errores requerido)
npx jest                 # Tests (136 tests, 10 suites)
```
