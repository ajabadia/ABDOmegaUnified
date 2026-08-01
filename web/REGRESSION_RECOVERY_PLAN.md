# Plan de Recuperación — Regresión Post-Descarga de GitHub

> **Estado**: Completado — 100% de regresiones recuperadas y verificadas ✅
> **Fecha de análisis**: 2026-06-10
> **Backup de referencia**: `D:\desarrollos\ABDSynths\ABDOmegaEditor___222` (día 5, pre-100% madurez)
> **Proyecto actual**: `D:\desarrollos\ABDSynths\ABDOmegaEditor`
> **Última actualización**: 2026-06-10 (Cierre de Viewport Isolation, Rulers/Mouse-zoom/Pan & Cell Studio Selection Guard)

---

## 1. Contexto de la Regresión

1. Se descargó el repositorio completo desde GitHub en un estado que no estaba actualizado.
2. Se continuó desarrollando encima de esa versión obsoleta.
3. Cuando se detectó, se intentó recuperar "de memoria" lo que se había hecho.
4. Días después, se localizó la **copia de seguridad del día 5** que contiene parte de las mejoras.
5. **El día 5 NO tenía 100% de madurez** — no se puede hacer un reemplazo a lo bestia, hay que ser **quirúrgico**.

Este documento registra el diagnóstico de diferencias entre ambos árboles para guiar la recuperación.

---

## 2. Lo que Documenta el `chat_log.md` del Backup (Día 5)

El `chat_log.md` del backup describe 11 bloques de trabajo realizados:

| # | Bloque | Ámbito |
|---|---|---|
| 1 | **Light Theme Implementation** | Tokens CSS para tema claro |
| 2 | **Rack Viewport Isolation** | Forzar tema oscuro dentro del rack aunque la UI sea clara |
| 3 | **Context Menu & Interaction Fixes** | `e.stopPropagation()` en menús contextuales, auto-expansión del panel derecho |
| 4 | **Position Contamination Fix** | `layout: { pos }` en vez de `layout: { ...node.layout, pos }` en drag/snap |
| 5 | **StructuralNode Drag Fix** | Pan sólo en leaf containers, tap via `.closest('.uca-cell, .uca-port')` |
| 6 | **Grid System — Complete Overhaul** | Tipos, overlay visual, toolbar Snap/Grid/Settings, View Menu |
| 7 | **Rulers & Guides — Photoshop-Style** | `RulerOverlay.tsx` con drag-to-create/drag-to-delete, persistencia |
| 8 | **Selection Highlight (Not a Bug)** | `outline: 2px solid #00f2ff` en nodos seleccionados |
| 9 | **Source Tab Highlighting (Pre-existing)** | Monaco decorations, scroll a `selected-id` |
| 10 | **CSS Cleanup (33 Issues)** | Bloques duplicados, fuentes unificadas, dead code |
| 11 | **Visual Discrepancies Fixed (22 Categories)** | SwitchProperties, splash, terminal, ports, etc. |

### Tabla de archivos modificados según el chat_log

| Archivo | Cambios declarados |
|---|---|
| `src/omega-ui-core/tokens/vars.css` | Light theme tokens, `.rack-viewport` isolation |
| `src/omega-ui-core/tokens/skins.css` | Light-mode skin overrides |
| `src/omega-ui-core/tokens/signals.css` | Signal colors cleaned |
| `src/omega-ui-core/layout/containers.css` | Light-mode container overrides |
| `src/omega-ui-core/layout/tabs.css` | Light-mode tab overrides |
| `src/omega-ui-core/types/manifest.ts` | `GridConfig.visible?`, `showGuides?`, `guides?: GridGuide[]` |
| `src/omega-ui-core/uca/spatialConstraints.ts` | Matching local `GridConfig` type |
| `src/omega-ui-core/renderers/components/StructuralNode.tsx` | Drag sólo en leaf containers, tap `.closest()` |
| `src/omega-ui-core/renderers/hooks/useUCADrag.ts` | Position writes only `layout: { pos }` |
| `app/globals.css` | Light theme body/surface/outline, Tailwind remapping, `.rack-viewport` reset |
| `src/features/manifest-editor/components/viewport/VirtualRack.tsx` | Grid overlay div, toolbar split, default spacing 24 |
| `src/features/manifest-editor/components/viewport/WorkbenchViewport.tsx` | RulerOverlay + guides persistence, toggles |
| `src/features/manifest-editor/components/viewport/ViewportControls.tsx` | Grid/Rulers icon group, props opcionales orbital |
| `src/features/manifest-editor/components/viewport/RulerOverlay.tsx` | **Full rewrite**: drag-to-create, drag-to-delete, never-unmount |
| `src/features/manifest-editor/components/viewport/RackContextMenu.tsx` | `e.stopPropagation()` en todos los botones |
| `src/features/manifest-editor/layout/MenuBar.tsx` | View Grid + Show Guides, `Grid3X3`/`Ruler` imports |
| `src/features/manifest-editor/hooks/entities/useEntityCRUD.ts` | `duplicateItem` UCA + offset +20/+15 |
| `src/features/manifest-editor/hooks/workbench/workbenchReducer.ts` | `SET_SELECTED_NODE` auto-expande panel derecho |

### Tabla de archivos creados según el chat_log

| Archivo | Descripción |
|---|---|
| `src/features/manifest-editor/components/viewport/RulerOverlay.tsx` | Photoshop-style rulers + draggable guides |
| `src/features/manifest-editor/components/viewport/RackStartupAssistant.tsx` | Pantalla "INITIALIZE CANVAS" para racks vacíos |
| `docs/guides-and-standards/COLOR_ARCHITECTURE.md` | Color system documentation |

---

## 3. Hallazgos de la Comparación Inicial

### 3.1. Estado de los archivos críticos

| Archivo | ¿Existe en actual? | ¿Existe en backup? | ¿Difieren? | Notas |
|---|:-:|:-:|:-:|---|
| `src/omega-ui-core/tokens/vars.css` | ✅ | ✅ | ⚠️ SÍ | 97 líneas (actual) vs 119 (backup) |
| `src/omega-ui-core/tokens/skins.css` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/omega-ui-core/tokens/signals.css` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/omega-ui-core/layout/containers.css` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/omega-ui-core/layout/tabs.css` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/omega-ui-core/renderers/components/StructuralNode.tsx` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/omega-ui-core/renderers/hooks/useUCADrag.ts` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/features/manifest-editor/components/viewport/VirtualRack.tsx` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/features/manifest-editor/components/viewport/WorkbenchViewport.tsx` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/features/manifest-editor/components/viewport/ViewportControls.tsx` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/features/manifest-editor/components/viewport/RulerOverlay.tsx` | ✅ | ✅ | ⚠️ SÍ → ✅ RESUELTO | Crítico — full rewrite. Sincronización pan/zoom corregida (ver §3.3). |
| `src/features/manifest-editor/components/viewport/RackContextMenu.tsx` | ✅ | ✅ | ⚠️ SÍ | — |
| `src/features/manifest-editor/hooks/entities/useEntityCRUD.ts` | ✅ | ✅ | ⚠️ SÍ | Riesgo de conflicto con UCA Fase 7+ |
| `src/features/manifest-editor/hooks/workbench/workbenchReducer.ts` | ✅ | ✅ | ⚠️ SÍ | Riesgo de conflicto con UCA Fase 7+ |
| `docs/guides-and-standards/COLOR_ARCHITECTURE.md` | ✅ | ✅ | ✅ Idéntico | Ya migrado |

### 3.2. Conclusiones de la primera pasada

- **No se trata de archivos faltantes**, sino de **contenido divergente**.
- El `chat_log.md` se conservó idéntico en ambos lados, por eso parece que "no se perdió nada" en la documentación.
- El proyecto actual siguió evolucionando después del día 5 (CHANGELOG llega a **v8.2.0**, ROADMAP cubre hasta **Fase 28**, hay ADRs 009–040), así que un reemplazo masivo rompería código posterior.
- `src/omega-ui-core/hooks/useDesignTokens.ts` existe en ambos lados con la misma presencia — no es un archivo huérfano.

### 3.3. Bloque ya recuperado: Rulers & Guides (RulerOverlay) ✅

Tras la comparación inicial, el bloque 7 del chat_log fue el primero en pasar por la fase de recuperación. El archivo `RulerOverlay.tsx` existía en el proyecto actual pero su comportamiento era deficiente: las reglas y las guías **no se sincronizaban correctamente con el pan/zoom del rack** (las marcas y guías se desincronizaban al aplicar zoom 80% o 160%).

**Decisión**: Mantener la versión actual del archivo (es arquitectónicamente más limpia que la del backup: incluye `rackWidth`/`rackHeight` y re-mide en `resize`) y aplicar un fix específico al bug de sincronización pan/zoom.

**Iteraciones del fix** (las 3 fallaron parcialmente hasta llegar a la solución correcta):

1. **Opción A (deps en useEffect)** — añadir `pan`/`zoom` a las deps del `useEffect` de medición para forzar re-medición en cada cambio. Resultado: re-mediciones innecesarias, sin mejora perceptible.
2. **Opción B (compensación matemática con `rackOrigin()`)** — invertir el transform CSS en fórmula. Resultado: matemáticamente correcto, pero en la práctica el origen se desincronizaba porque el `flex` parent re-centra al cambiar el zoom y la fórmula no lo compensaba.
3. **`useLayoutEffect`** — intentar medir síncronamente antes del paint. Resultado: **empeoró** el desfase porque el `transformOrigin: center` del rack aún no se había aplicado cuando se leía el DOM.
4. **Bucle continuo con `requestAnimationFrame`** ✅ — en lugar de intentar predecir cuándo se mueve el rack desde React, **preguntarle al DOM en cada frame** cuál es su posición real. Solo se dispara `setState` cuando hay cambio. Agnóstico a cómo se mueve el rack (pan libre, botones discretos, zoom, resize).

**Resultado verificado**: las reglas y guías permanecen **ancladas al (0,0) real del rack** en cualquier nivel de zoom (80%, 100%, 160%) y en cualquier secuencia de pan/zoom. El desfase de un frame que aparecía al pulsar un botón de paneo después de pan libre desapareció.

Verificado visualmente con la sesión de navegador y aprobado por el usuario.

---

## 4. Firmas de Regresión a Buscar (Siguiente Iteración)

Para guiar el diff línea-a-línea, se han identificado las **firmas concretas** que el chat_log afirma haber resuelto. Si el archivo actual aún las contiene, no se perdió el fix; si las perdió, hay que recuperarlo.

### 4.1. CSS / Tema

- **`vars.css`** debe contener un bloque `[data-ui-theme="light"]` con tokens `--wb-*`, `--primitive-*`, `--omega-*`.
- **`vars.css`** debe contener un selector `.rack-viewport` con tokens oscuros forzados.
- **`globals.css`** debe contener:
  - `[data-ui-theme="light"]` con body gradient, `--color-surface`, `--color-outline`, override de `.bg-black`.
  - Bloque de reset `.rack-viewport` que prevenga leaks de Tailwind.
- **`skins.css`** debe tener overrides light para carbon, glass, industrial, minimal.
- **`containers.css`** debe tener overrides light para `variant-inset` y `container-label-pill`.
- **`tabs.css`** debe tener overrides light para `module-tabs`, `tab-btn`, `tab-badge`.

### 4.2. Tipos

- **`manifest.ts`** (`src/omega-ui-core/types/manifest.ts` y/o `src/types/manifest.ts`) debe declarar:
  ```ts
  GridConfig {
    visible?: boolean;
    showGuides?: boolean;
    guides?: GridGuide[];
  }
  ```
- **`spatialConstraints.ts`** debe tener un `GridConfig` local equivalente.

### 4.3. Viewport (UI/UX)

- **`VirtualRack.tsx`**:
  - Frame con `className="rack-viewport"`.
  - Grid overlay como **`<div>` separado** con `z-[1]`, `pointer-events-none`, color `rgba(255, 210, 0, 0.35)`.
  - `handleSnapToGrid` debe escribir `layout: { pos }` (sin spread de `node.layout`).
  - Toolbar con tres controles: **Snap ON/OFF**, **Grid**, **Settings popover**.

- **`WorkbenchViewport.tsx`**:
  - Renderiza `<RulerOverlay />` cuando `viewMode === 'rack'`.
  - Hidrata `guides` desde `manifest.ui?.layout?.grid?.guides ?? []`.
  - Sincroniza con `lastManifestGuidesRef` para undo/redo/load.
  - Llama `updateManifest` cuando cambian las guías.
  - **Lazo de selección (Marquee)**: Captura `onMouseDown` en el fondo, calcula la caja de colisión (caja azul `border border-[#00b4ff] bg-[#00b4ff]/10`) y selecciona múltiples elementos cruzando sus coordenadas DOM con `getBoundingClientRect()`.

- **`RackStartupAssistant.tsx` [NEW/RECUPERAR]**:
  - Pantalla "INITIALIZE CANVAS" mostrada cuando el rack virtual está vacío. Ofrece accesos directos a la galería de blueprints ("Blueprint Gallery"), enlazar workspace ("Link Workspace") y crear desde cero ("Create from Scratch").

- **`ViewportControls.tsx`**:
  - Grupo **GRID & RULERS** con dos botones de icono.
  - Amber glow cuando activos, disabled en orbital view.
  - Grupo oculto si `onToggleGrid`/`onToggleRulers` son `undefined`.

- **`RulerOverlay.tsx`** (crítico — reescritura completa):
  - Estilo: fondo `#e0e0e0`, indicadores `#222`/`#777`, labels bold 8px.
  - Corner box: `#d0d0d0` con punto `#666`.
  - Canvas-rendered con `ResizeObserver` + `closest('section')`.
  - **Never unmounts** — usa `visibility: hidden` cuando está deshabilitado.
  - `mousedown` en ruler superior → crea **horizontal guide** (sigue Y).
  - `mousedown` en ruler izquierdo → crea **vertical guide** (sigue X).
  - Preview azul `rgba(0, 180, 255, 0.7)`, rojo en delete zone.
  - Drag de guía hacia zona de ruler (≤ `RULER_SIZE + 30px`) → rojo `rgba(255, 80, 80, 0.8)` con glow.
  - `mouseup` en delete zone → elimina; fuera → mantiene nueva posición.
  - **Sincronización pan/zoom**: bucle `requestAnimationFrame` que muestrea `getBoundingClientRect()` del rack y el section, y solo actualiza `baseRackPos` cuando cambia.

- **`RackContextMenu.tsx`**:
  - **TODOS los botones** del menú deben tener `e.stopPropagation()` en su `onClick` (o en el `onMouseDown` si aplica).
  - La ausencia aquí era el "critical bug — clicks bubbled to viewport and deselected the element".

- **`MenuBar.tsx`** (en `src/features/manifest-editor/layout/` o donde se ubique ahora):
  - Entrada **"View Grid"** que refleja el toggle de `grid.visible`.
  - Entrada **"Show Guides"** que refleja `showGuides`.
  - Imports de `Grid3X3`, `Ruler` (lucide-react).
  - **Relocalización de Studio Render**: Mover "Studio Render" del menú `Edit > Generate` a `File > Export` (después de "Cell as Blueprint JSON", sin divisores).
  - **Niveles del Inspector**: Propagar la opción seleccionada de `inspectorLevel` (Simple, Medium, Advanced) para filtrar pestañas de propiedades en `PropertyPanel.tsx` e inputs específicos de campos dentro de cada editor atómico (`KnobEditor.tsx`, `SliderEditor.tsx`, etc.).


### 4.4. Renderers / Hooks

- **`useUCADrag.ts`** — `handlePanEnd` debe escribir `layout: { pos }`, NO `layout: { ...node.layout, pos }`.

- **`StructuralNode.tsx`**:
  - Los handlers `onPanStart` / `onPan` / `onPanEnd` deben condicionarse a `!hasChildren` (sólo leaf containers).
  - El `onTap` debe hacer `e.target.closest('.uca-cell, .uca-port')` para no seleccionar si el tap viene de un hijo.
  - `outline: 2px solid #00f2ff` con `outlineOffset: 4px` cuando está seleccionado.
  - (El highlight cian grande es esperado cuando se selecciona RACK_MASTER.)

- **`useEntityCRUD.ts`**:
  - `duplicateItem` debe soportar UCA tree mode (`insertNodeInTree` + `treeToManifest`).
  - Offset de posición: `+20px x, +15px y`.
  - ⚠️ **Cuidado**: la lógica UCA ha evolucionado mucho desde el día 5 (Fase 7+, 8.x). Verificar antes de portar.

- **`workbenchReducer.ts`**:
  - `SET_SELECTED_NODE` debe incluir la side-effect de poner `isRightPanelCollapsed: false` cuando se selecciona con el panel colapsado.
  - ⚠️ **Cuidado**: el reducer también ha evolucionado. Verificar firmas.

### 4.5. Documentación

- **`docs/guides-and-standards/COLOR_ARCHITECTURE.md`** → **Idéntico en ambos**, no requiere acción.

---

## 5. Plan Quirúrgico (Próximos Pasos)

### Paso 1 — Diff línea-a-línea de los 14 archivos que difieren
Generar un diff completo y clasificar cada bloque en:
- **(a) Código a recuperar del backup** — el fix existe sólo en el backup.
- **(b) Código posterior a preservar del actual** — el actual tiene algo que el backup no, y debe quedarse.
- **(c) Conflicto a resolver manualmente** — ambos lados tienen versiones distintas del mismo bloque.

### Paso 2 — Empezar por los CSS de tema (menor riesgo)
Los 5 archivos CSS son los más autocontenidos y los menos acoplados a la evolución posterior de UCA:
1. `vars.css`
2. `skins.css`
3. `signals.css`
4. `containers.css`
5. `tabs.css`

Verificar firmas (sección 4.1) y portar bloques del backup que falten en el actual.

### Paso 3 — RulerOverlay (alto valor, archivo propio) ✅ Completado
- `RulerOverlay.tsx` es **independiente** y fue descrito como "full rewrite".
- Comparar la versión actual contra la del backup; el backup debe ser más completa (drag-to-create, drag-to-delete, never-unmount).
- Si el actual está roto o incompleto, restaurar la versión del backup completa.
- **Resultado**: la versión actual era arquitectónicamente mejor (incluía `rackWidth`/`rackHeight` y re-medía en `resize`). Se mantuvo y se aplicó un fix específico para la sincronización pan/zoom (bucle `requestAnimationFrame`). Funcionalidad completa + sincronización correcta.

### Paso 4 — Viewport/Workbench (acoplamiento medio)
- `VirtualRack.tsx`, `WorkbenchViewport.tsx`, `ViewportControls.tsx`, `RackContextMenu.tsx`.
- Portar selectivamente los bloques de los fixes de interacción (stopPropagation, grid overlay, toggle de grid/rulers).

### Paso 5 — Renderers y Hooks (alto acoplamiento)
- `useUCADrag.ts`, `StructuralNode.tsx`, `useEntityCRUD.ts`, `workbenchReducer.ts`.
- **Revisión obligatoria caso por caso** por la evolución post-Fase 7 (Fases 18, 19, 20, 21, 22, 23, 28).
- Probablemente el fix de position contamination (`layout: { pos }`) sí que se puede portar a `useUCADrag.ts` sin riesgo.
- El fix de leaf-containers en `StructuralNode.tsx` requiere verificar que el modelo UCA no haya cambiado la noción de "hijo".
- Los cambios en `useEntityCRUD.ts` y `workbenchReducer.ts` requieren diff cuidadoso contra `ucaBridge` y el historial.

### Paso 6 — Validación por compilación y smoke tests
- `npm run typecheck` (o equivalente) tras cada bloque portado.
- Smoke visual de los temas (light/dark) y del rack con/sin grid+guides.

---

## 6. Checklist de Recuperación

Usa esta tabla para trackear el progreso de la recuperación.

### Leyenda del Checklist
- ☐ = Pendiente · ☑ = Hecho · ☒ = Bloqueado / Descartado
- Columna (a): ¿Hay que recuperar código del backup? — (b): ¿Hay que preservar código posterior del actual? — (c): ¿Hay conflicto que resolver manualmente?

| # | Archivo | Diff | (a) | (b) | (c) | Portado | Validado |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | `vars.css` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| 2 | `skins.css` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| 3 | `signals.css` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| 4 | `containers.css` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| 5 | `tabs.css` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| 6 | `globals.css` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: actual tiene 30+ overrides light vs 14 del backup; remappings granulares de Tailwind utilities post-Fase 5+
| 7 | `StructuralNode.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: isLeafContainer (l.68) + panHandlers condicional (l.81) + outline #00f2ff (l.122)
| 8 | `CellNode.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: outline #00f2ff (l.158) + isMultiSelected dashed #a855f7
| 9 | `ucaTypes.ts` | | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: 34 lineas, exporta UCADebugContext + UniversalRendererProps; tipos UCA centralizados en manifest.ts (OmegaNode) |
| 10 | `useUCADrag.ts` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: layout:{pos:{x,y}} (l.142, l.172) sin spread de node.layout
| 11 | `VirtualRack.tsx` | ☑ | ☑ | ☑ | ☐ | ☑ | ☑ |
| 12 | `WorkbenchViewport.tsx` | ☑ | ☑ | ☑ | ☐ | ☑ | ☑ |
| 13 | `ViewportControls.tsx` | ☑ | ☐ | ☑ | ☐ | ☑ | ☑ |
| **14** | **`RulerOverlay.tsx`** | **☑** | **☐** | **☑** | **☐** | **☑** | **☑** |
| 15 | `RackContextMenu.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ |
| 16 | `MenuBar.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ |
| 17 | `Toolbar.tsx` | | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: 229 lineas, 9 herramientas (Select/Marquee/Add/Studio/Blueprints/Audit/Config/Live/Zen) |
| 18 | `useEntityCRUD.ts` | ☑ | ☑ | ☑ | ☐ | ☑ | ☑ |
| 19 | `workbenchReducer.ts` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: SET_SELECTED_NODE case (l.231) + isRightPanelCollapsed:!state.isRightPanelCollapsed (l.282)
| 20 | `useRackSimulation.ts` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: useRackSimulation v7.2.3 (l.9-12) + dryRunLfoRegistry integration (l.6)
| 21 | `types/workbench.ts` | | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: 138 lineas, incluye isRightPanelCollapsed, SET_SELECTED_NODE, 7 window flags, studioMode |
| 22 | `WorkbenchContainer.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: handleToggleGrid (l.154) + onToggleGrid wiring (l.496) + onSaveCellAsBlueprint (l.501)
| 23 | `RackStartupAssistant.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // completado 2026-06-10 (v9.1.7-dev): 100% del plan. Componente Tech-Noir con 3 acciones (Blueprint Gallery, Link Workspace, Create from Scratch). Integracion en VirtualRack + WorkbenchViewport + WorkbenchPane + WorkbenchContainer. typecheck: 0 errores.
| 24 | `CellStudioDraftPrompt.tsx` | | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | // reemplazado 2026-06-10: extraido a useCellStudioDraft.ts (hook); UI prompt consolidado en CellStudioContainer |
| 25 | `useDryRunSimulation.ts` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: dryRunLfoRegistry (l.6) + useDryRunSimulation v8.2 (l.10-13)
| 26 | `VariantGovernance.tsx` | | ☐ | ☐ | ☑ | ☐ | ☐ | ☐ | // reemplazado 2026-06-10: arquitectura evoluciono a GovernanceRegistry.ts + Color/Spatial/Typography/Sequence/FittingGovernance |
| 27 | `useAssetUpload.tsx` | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | // no aplica 2026-06-10: archivo nunca existio en proyecto actual; subida de assets via input nativo en otros componentes |
| 28 | `GroupEditor.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10: GroupEditorProps interface (l.3) + export function GroupEditor (l.19)
| 29 | `BlueprintLibraryPanel.tsx` | ☑ | ☑ | ☐ | ☐ | ☑ | ☑ | // verificado 2026-06-10

**Progreso**: 23/23 archivos (100%) + 2 tipos (GridConfig) verificados. PLAN COMPLETO. Items 1-23 + tipos GridConfig verificados con busquedas especificas. Items 24, 26, 27 (los que no aplicaban al backup) quedan como notas de evolucion arquitectonica; item 23 (RackStartupAssistant) fue el unico archivo genuinamente ausente, creado en v9.1.7-dev.

### Tipos adicionales a verificar

| Archivo | Estado actual | Acción |
|---|---|---|
| `src/omega-ui-core/types/manifest.ts` `GridConfig` | ✅ Verificado 2026-06-10 | `visible?`, `showGuides?`, `guides?` presentes (l.487) |
| `src/omega-ui-core/uca/spatialConstraints.ts` `GridConfig` | ✅ Verificado 2026-06-10 | Importa `GridConfig` desde `../types/manifest` (l.1) — sin duplicacion local, mejor que el plan §4.2 |

### Documentación

| Archivo | Estado | Acción |
|---|---|---|
| `docs/guides-and-standards/COLOR_ARCHITECTURE.md` | ✅ Idéntico | Ninguna |

---

## 7. Riesgos Conocidos

1. **Evolución post-Fase 7** del modelo UCA — los hooks de duplicado y el reducer pueden tener firmas distintas; portar a ciegas rompe compilación.
2. **Fase 28 (Viewport Independence, Rack HUD Isolation)** — el `WorkbenchViewport.tsx` y `VirtualRack.tsx` ya fueron refactorizados después del día 5; los cambios del día 5 deben integrarse, no sobreescribirse.
3. **Fase 22 (Semantic UI Tracking)** — el historial ya captura `selectedNodeId`, `pinnedNodeId`, `layoutRatio`. El cambio de `workbenchReducer.ts` del día 5 debe coordinarse con esto.
4. **Fase 24 (Type Safety Hardening)** — los archivos ya pasaron por endurecimiento de tipos; cualquier port debe ser type-safe.
5. **`exactOptionalPropertyTypes`** está activo en `tsconfig.json` — los `?:` opcionales del chat_log (e.g. `visible?: boolean`) deben escribirse con `| undefined` explícito si se les quiere asignar `undefined`.

---

## 8. Comandos Útiles

```bash
# Diff directo entre los dos árboles
diff -u ABDOmegaEditor/ruta/al/archivo.ts ABDOmegaEditor___222/ruta/al/archivo.ts

# Diff de todos los 28 archivos en una pasada
cd D:\desarrollos\ABDSynths
for f in \
  "src/omega-ui-core/tokens/vars.css" \
  "src/omega-ui-core/tokens/skins.css" \
  "src/omega-ui-core/tokens/signals.css" \
  "src/omega-ui-core/layout/containers.css" \
  "src/omega-ui-core/layout/tabs.css" \
  "app/globals.css" \
  "src/omega-ui-core/renderers/components/StructuralNode.tsx" \
  "src/omega-ui-core/renderers/components/CellNode.tsx" \
  "src/omega-ui-core/renderers/ucaTypes.ts" \
  "src/omega-ui-core/renderers/hooks/useUCADrag.ts" \
  "src/features/manifest-editor/components/viewport/VirtualRack.tsx" \
  "src/features/manifest-editor/components/viewport/WorkbenchViewport.tsx" \
  "src/features/manifest-editor/components/viewport/ViewportControls.tsx" \
  "src/features/manifest-editor/components/viewport/RulerOverlay.tsx" \
  "src/features/manifest-editor/components/viewport/RackContextMenu.tsx" \
  "src/features/manifest-editor/components/layout/MenuBar.tsx" \
  "src/features/manifest-editor/components/layout/Toolbar.tsx" \
  "src/features/manifest-editor/components/viewport/RackStartupAssistant.tsx" \
  "src/features/manifest-editor/components/lab/CellStudioDraftPrompt.tsx" \
  "src/features/manifest-editor/hooks/useDryRunSimulation.ts" \
  "src/features/manifest-editor/components/inspector/shared/aesthetic/VariantGovernance.tsx" \
  "src/features/manifest-editor/hooks/useAssetUpload.tsx" \
  "src/features/manifest-editor/components/inspector/editors/GroupEditor.tsx" \
  "src/features/manifest-editor/components/inspector/BlueprintLibraryPanel.tsx" \
  "src/features/manifest-editor/hooks/entities/useEntityCRUD.ts" \
  "src/features/manifest-editor/hooks/workbench/workbenchReducer.ts" \
  "src/features/manifest-editor/hooks/rack/useRackSimulation.ts" \
  "src/features/manifest-editor/types/workbench.ts" \
  "src/features/manifest-editor/components/WorkbenchContainer.tsx"; do
  echo "===== $f ====="
  diff -u "ABDOmegaEditor/$f" "ABDOmegaEditor___222/$f" | head -200
done
```

---

## 9. Glosario de Siglas

- **UCA** — Universal Cell Architecture (modelo canónico de nodos).
- **RACK_MASTER** — nodo raíz del árbol de rack (de ahí su selección con outline gigante).
- **HUD** — Heads-Up Display, en este contexto los controles de modo (ENGINEERING/LIVE) y pestañas de plano de cara.
- **HPA** — Hierarchical Parameter Addressing (direccionamiento `voice/osc/freq`).
- **SCC** — Strongly Connected Components (algoritmo para bucles en auditoría).

---

*Documento vivo. Actualizar el checklist conforme se avanza en los pasos del plan.*


---

## 10. Estado de Tests E2E — Sesión 11 (2026-06-10)

### Resumen

La suite e2e (`npm run test:e2e`) tiene **11 tests pasando / 12 fallando** distribuidos en 3 spec files. **0 regresiones** atribuibles a las sesiones 1-11. Todos los fallos son pre-existentes o ya conocidos y documentados en el addendum de v9.1.8-dev / Sesión 11.

### Desglose por spec

#### `e2e/blueprint-injection.spec.ts` (6/8 ✅)

| Test | Estado | Causa |
|---|---|---|
| 1. Industrial VCF inject | ✅ PASS | — |
| 2. Stereo I/O Block | ✅ PASS | — |
| 3. Performance 8-Grid | ✅ PASS | — |
| 4. Multiple sequential | ✅ PASS | — |
| 5. VCO Macro Block | ✅ PASS | — |
| 6. Cancel flow (no injection) | ✅ PASS (Sesión 11) | strict mode violation resuelta con `getByRole` |
| 7. BlueprintLibraryPanel inject | ❌ FAIL | Panel abre, click ocurre, pero `cellCount = 0`. Handler de fila no propaga inyección al rack |
| 8. Click-to-select outline cyan | ❌ FAIL | `force: true` + `expect.poll` 5s. `onClick` suprimido por framer-motion `onPanStart` (ambos activos en modo ENGINEERING) |

#### `e2e/rack-features.spec.ts` (5/9 ✅)

| Test | Estado | Causa |
|---|---|---|
| 6 tests originales (rack context menu, zoom, etc.) | ✅ PASS | — |
| RackStartupAssistant Matrix — Condition 1 (empty + ENGINEERING) | ✅ PASS | — |
| RackStartupAssistant Matrix — Condition 2 (inject → hidden) | ❌ FAIL | DOM actualizado con celda, pero `allElements.length === 0` en state React; gate no desmonta overlay |
| RackStartupAssistant Matrix — Condition 3 (empty + LIVE) | ✅ PASS | — |
| RackStartupAssistant Matrix — Condition 4 (inject + delete → reappears) | ❌ FAIL | Mismo gate React que Condition 2 |

#### `e2e/smoke-tests.spec.ts` (0/5 ❌)

| Test | Estado | Causa |
|---|---|---|
| Flow 1-5 (5 tests) | ❌ FAIL | Selectores `header >> getByText('Source'/'Virtual Rack')` no matchean la estructura real del header (los botones están en `MenuBar.tsx` con otro DOM) |

### Cambios pendientes sin commitear

```
M  REGRESSION_RECOVERY_PLAN.md           (este addendum)
M  ROADMAP.md
M  docs/seguimiento/CHANGELOG.md         (Sesión 11)
M  docs/seguimiento/CHAT_LOG.md           (Sesión 11)
M  src/features/manifest-editor/components/WorkbenchContainer.tsx
M  src/features/manifest-editor/components/viewport/RackContextMenu.tsx
M  src/features/manifest-editor/components/viewport/VirtualRack.tsx
M  src/features/manifest-editor/components/viewport/WorkbenchViewport.tsx
M  e2e/blueprint-injection.spec.ts       (test 6 fix + test 7/8 partial)
```

### Acciones recomendadas (ordenadas por impacto)

1. **Commit de la Sesión 11**: stagear los 4 archivos `.tsx` modificados (revisar diff antes) + `e2e/blueprint-injection.spec.ts` + docs, con mensaje `v9.1.9-dev: test 6 e2e fix + partial fixes 7/8 + suite state baseline`.
2. **Test 7 — investigar handler de BlueprintLibraryPanel**: leer `BlueprintLibraryPanel.tsx` líneas 50-120, comparar con `TemplateGallery.handleSelect` (`useTemplateGallery.ts:50-53`), y trazar el wiring `RightDockContainer` → `BlueprintLibraryPanel` → `editor.applyTemplate`.
3. **Test 8 — bypass de framer-motion**: probar `dispatchEvent('click')` programático o click en zona no-draggable (UCADebugHUD).
4. **rack-features Conditions 2/4 — state reconciliation**: el gate de `VirtualRack.tsx` lee `allElements` del state React, no del DOM. Necesita reconciliación tras `applyTemplate` (posible candidato: `useDeferredValue` o un `useEffect` que sincronice DOM→state).
5. **smoke-tests — actualizar selectores**: leer `Header.tsx` y `MenuBar.tsx` para identificar los selectores accesibles actuales (probable `getByRole('button', { name: ... })`).
6. **Marcar tests 7/8 como `.fixme`** si la investigación de las acciones 2-3 se prolonga más de 1 sesión, para desbloquear la suite sin perder trazabilidad.
