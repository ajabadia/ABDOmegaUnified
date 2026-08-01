# OMEGA Manifest Editor — Registro de Progreso (Era 9.9.3)

> **Última auditoría:** 2026-06-18 · **Último commit:** `active`

---

## 📊 Health Dashboard

| Métrica | Resultado |
|:--------|:---------:|
| **TypeScript** | `0 errors` ✅ |
| **Jest** | `825/825 tests` · `46 suites` · `51 snapshots` ✅ |
| **ESLint** | `0 problems (0 errors, 0 warnings)` ✅ |
| **Next build** | `Success` — static + SSR routes ✅ |
| **E2E** | `50/52 passing` (2 pre-existing blueprint-store failures) |
| **P10 E2E audit** | Keyboard-only browser test ✅ (MenuBar, Toolbar, Dock, Footer all navigable) |
| **P11 tests** | 35 unit + 22 E2E passing ✅ |
| **P12 verification** | Subtree recursive scaling, grid snap, ratio locks & transaction safety verified ✅ |

---

## 📈 Hitos Completados

### P1–P12 Roadmap

| Prioridad | Feature | Versión | Estado |
|:---------:|---------|:-------:|:------:|
| **P1** | 🍞 **Toast Notification System** | v9.3.3 | ✅ Completado |
| **P2** | 🔍 **Command Palette (Ctrl+K)** | v9.4.0 | ✅ Completado |
| **P3** | 📊 **Status Bar (dirty/validación)** | v9.8.0 | ✅ Completado |
| **P4** | 🎓 **Onboarding Walkthrough** | v9.8.0 | ✅ Completado |
| **P5** | 🖼️ **Mini-Map del Rack** | v9.3.3 | ✅ Completado |
| **P6** | ⏪ **Undo Timeline Visual** | v9.9.0 | ✅ Completado |
| **P7** | 🎨 **Temas Visuales (Amber/Cyberpunk/High Contrast)** | v9.8.1 | ✅ Completado |
| **P8** | 🔧 **Floating Toolbar Customizable** | v9.9.0 | ✅ Completado |
| **P9** | 📐 **Resizable Panels** | v9.9.0 | ✅ Completado |
| **P10** | ♿ **Accesibilidad WCAG AA** | v9.9.2 | ✅ Completado |
| **P11** | 🔌 **Visual Connection Editor (SynthEdit-style)** | v9.9.2 | ✅ Completado |
| **P12** | 📐 **Element Corner Resizing Tool (Scaling Tool)** | v9.9.3 | ✅ Completado |

---

### Era 9.9.3 — Element Corner Resizing Tool (P12)

| Feature | Detalle |
|:--------|:--------|
| **Corner Handles & Interactive HUD** | Renders 4 corner resize handles (NW, NE, SW, SE) with double-click reset to default dimensions, showing a real-time HUD with pixel, HP measurements, and locked aspect ratio indicator `[🔒]`. |
| **Shift/Ctrl Aspect Snapping Math** | Mouse drags support snapping to grid with `Ctrl`, aspect ratio locking with `Shift`, and dual-axis snapping with proportional secondary recalculation when both modifier keys are pressed. |
| **Subtree Recursive Scaling** | Resizing a parent container scales all descendant controls' offsets, dimensions, and label font-sizes proportionally and synchronously without lag. |
| **Undo Transaction Grouping** | Wraps resizing operations in `startTransaction` on handle press and `commitTransaction` on release, preventing command history pollution and keeping changes undoable in a single step. |
| **A11y Keyboard Resizing Shortcuts** | `T` toggles transform mode. `Ctrl + Arrows` resizes focused element/group by grid or 10px increments, and `Ctrl + Shift + Arrows` scales elements proportionally. |

### Era 9.9.2 — Visual Connection Editor (P11) & WCAG AA (P10)

| Área / Componente | Tests | Estado / Detalle |
|:---|:---:|:---|
| **ConnectionOverlay.tsx** (SVG overlay) | 35 unit ✅ + 22 E2E ✅ | SVG connection overlay with custom curves, connectors, drag handles, and animation. |
| **A11y Focus & Landmarks** | ✅ | Skip-to-content links, `:focus-visible` ring outlines, landmark roles (banner, contentinfo, complementary, status), live regions (`aria-live="polite"`), compliant contrast ratios (4.5:1 text / 3:1 non-text). |
| **Keyboard Navigation Audits** | ✅ | Keyboard support with arrows, Escape, Home/End for MenuBar, Toolbar, LayersPanel (`role="tree"`), RackMiniMap (`role="grid"`), and full modal focus trapping. |

### Era 9.9.1 — UI Cleanup

| Acción | Archivos |
|:-------|:---------|
| ❌ **Audit button** eliminado de floating toolbar | `Toolbar.tsx`, `toolbarDefinitions.tsx` |
| ❌ **5 ShortcutBadge duplicados** eliminados del footer | `WorkbenchFooter.tsx` |
| ❌ **Engine info overlay** eliminado de Orbital view | `NodeCanvas.tsx` |
| 🔀 **Compliance Report** movido de Help a Window | `MenuBar.tsx` |

### Era 9.9.x — Resizable Panels, Toolbar Customizable, Undo Timeline

| Feature | Archivos | Tests |
|:--------|:---------|:-----:|
| **Resizable Panels (P9)** | `RightDockContainer.tsx` — `PanelGroup`/`Panel`/`PanelResizeHandle` para 7 paneles. `localStorage` persistencia (`omega_dock_panel_sizes`). | ✅ |
| **Floating Toolbar Customizable (P8)** | `useToolbarCustomization` hook, `toolbarDefinitions.tsx` (11 botones), popover drag-and-drop + visibilidad + reset. `localStorage` (`omega_toolbar_config`). | ✅ |
| **Undo Timeline Visual (P6)** | `UndoTimelinePopover` extendido con batch history (hide/lock/group). Sección "Batch" coloreada por variante. | ✅ 47 tests |

### Era 9.8.x — Status Bar, Onboarding, Temas Visuales

| Feature | Detalle |
|:--------|:--------|
| **Status Bar (P3)** | `WorkbenchFooter` — indicador Modified/Saved con timestamp, conteo errores/warnings, estado watchdog, herramienta activa. |
| **Onboarding Walkthrough (P4)** | Tour interactivo 7 pasos, auto-open en primera visita, highlight ring animado. Accesible desde Command Palette. 45 tests total en WorkbenchFooter. |
| **3 Temas Visuales (P7)** | `[data-ui-theme="amber"]`, `[data-ui-theme="cyberpunk"]`, `[data-ui-theme="high-contrast"]` — cada uno con CSS variables completas. `ThemeSelector` dropdown reemplaza `ThemeToggle`. |

### Era 9.7.x — Alignment Shortcuts & Shortcuts Audit

- **Collision Resolution**: Ctrl+Shift+L/H/R/B priorizan alignment cuando ≥2 items. Colisiones con panel toggles resueltas.
- **Ctrl+Alt+E — Distribute Evenly Both Axes**: Distribución grid en ambos ejes simultáneamente.
- **Shortcuts Audit**: 49/49 documentados e implementados. 4 faltantes añadidos (arrow keys, Enter/Escape ghost).
- **Ctrl+Shift+A**: Movido de Help > deprecated a Window como toggle legítimo.
- **MenuBar Priority Badges**: Badges ámbar + tooltip en alignment items cuando multi-selección activa.
- **E2E**: 50/52 passed. 4 layers-panel-filters tests reparados.

### Era 9.6.x — Visual Modulation Matrix, Virtual Scrolling, Shortcuts

| Feature | Versión | Detalle |
|:--------|:-------:|:--------|
| **Visual Modulation Matrix** | v9.6.0 | SVG drag-and-drop, conexiones bezier color-coded, ghost preview, scroll-wheel amount. |
| **Virtual Scrolling LayersPanel** | v9.6.0 | `react-window@2.0.0-dev.1`. Container-level DnD. 9 TS fixes. |
| **Ctrl+Shift+E CellStudio Shortcut** | v9.6.1 | `useWorkbenchShortcuts.ts`. 19 unit tests. |
| **LayersPanel TS Fix** | v9.6.1 | `boolean \| undefined` → `!!()` coercion. |

### Era 9.5.x — Component Refactors

| Componente | Tests | Descripción |
|:-----------|:-----:|:------------|
| **DockIconBar** | 30 | Unifica DockIconStrip + DockRackSectionToolbar |
| **DockPanelHeader** | 10 | Variants default/subtle |
| **ToolbarIconButton** | 31 | size + colorVariant props, 11/11 botones migrados |
| **ShortcutBadge** | — | Extraído de 9 instancias inline |
| **ModalCloseButton** | — | 10 botones inline → componente |
| **ModalActionButton** | — | 7 botones acción secundaria → componente |

### Era 9.4.x — Command Palette

- Ctrl+K palette: búsqueda fuzzy, navegación ↑↓→Esc, 35 tests.
- Ctrl+K badge en footer.

### Era 9.3.x — Toast, Mini-Map, Bug Fixes

| Feature | Detalle | Tests |
|:--------|:--------|:-----:|
| **Toast Notification System (P1)** | 4 variantes (info, success, warn, error). `ToastProvider`, `useToast`, `addLog` bridge. | ✅ |
| **Mini-Map del Rack (P5)** | Flotante/arrastrable, filtros por tipo, locked indicator, snap a bordes, persistencia localStorage + URL params, 60 tests. | ✅ 60 |
| **Alt+Click Ghost Preview** | BlueprintLibraryPanel con ghost preview mode. | ✅ |
| **Blueprint injection fix** | applyTemplate() directo en lugar de ghost mode. | ✅ |

### Últimos Cambios (12/06/2026 — Sesión 14 — v9.3.1-dev)

- **GhostPreviewOverlay.tsx**: Añadido `whitespace-nowrap` a la etiqueta verde de confirmación de inyección para evitar que el texto se divida verticalmente y solape con las instrucciones secundarias en layouts estrechos.
- **Toolbar.tsx**:
  - Se eliminó la visualización de elementos deshabilitados (como Universal Cell Studio, Group, Ungroup) cuando no cumplen las condiciones de activación, ocultándolos dinámicamente para liberar espacio en pantalla.
  - Implementado algoritmo de auto-distribución multi-columna en rejilla (Grid CSS) que responde dinámicamente a la altura disponible de la pantalla (`window.innerHeight`), con un límite máximo de **3 columnas** para no invadir el canvas; si se supera el límite de altura con 3 columnas, la barra se estira verticalmente hacia abajo.
  - Los divisores horizontales se agrupan, limpian y eliminan en modo multi-columna para preservar una visual estética y compacta.
  - El menú de inserción rápida de primitivas (Flyout) se reposicionó de forma relativa a la derecha de la barra (`left-full ml-1.5`) para evitar solapamientos con las nuevas columnas dinámicas.
  - **Lógica de Desagrupación (Ungroup) Mejorada**: Alineada con el menú contextual de `VirtualRack`. El botón Desagrupar ahora se activa tanto si seleccionas el contenedor del grupo como si seleccionas un elemento hijo que pertenece a un grupo (usando `findParentInTree` y resolviendo su ID en caliente).
  - **Nuevos Iconos Intuitivos**: Actualizados los iconos de "Group" y "Ungroup" de `BoxSelect`/`Maximize` a los iconos modernos de `Group` y `Ungroup` de `lucide-react` tanto en el Toolbar como en el menú contextual (`RackContextMenu.tsx`).
- **E2E y Tipados**: Corregido una declaración de variable no utilizada (`root` en `blueprint-store.spec.ts`) y las firmas de callbacks en los evaluate de Playwright (`omegaFixtures.ts`) asegurando compilación TypeScript 100% limpia (`tsc --noEmit` sin warnings).

### Últimos Cambios (11/06/2026 — Sesión 13 — v9.3.0-dev)

- **Layers Grouping and Duplication**:
  - Multi-selection support (Ctrl/Shift) para grouping y ungrouping.
  - Comandos contextuales: Group Selected, Group Down, Ungroup, Recursive Duplication, Save as Blueprint.
  - Traduciendo coordenadas absolutas a nivel de jerarquía en el árbol UCA para evaluar colisiones de manera consistente.
  - Colisiones informativas (borde en rojo) pero no restrictivas, desactivándose para elementos del mismo grupo.

### Últimos Cambios (11/06/2026 — Sesión 12 — v9.2.0-dev)

- **E2E Blueprint Injection Suite — 8/8 PASS**: Suite completa de inyección de blueprints funcionando al 100%.
- **Test 3 (Performance 8-Grid container count)**: Aserción corregida de `>= 3` a `>= 1`. El V2 de Performance 8-Grid es plano (8 knobs directos), sin contenedores anidados. El blueprint v2 usa formato GroupNode plano.
- **Test 4 (Multiple sequential injections)**: El helper `injectBlueprint` ahora detecta si el panel `BlueprintLibraryPanel` ya está abierto antes de togglarlo. Las inyecciones secuenciales funcionan correctamente.
- **Test 6 (Cancel flow)**: Reescrito para usar `BlueprintLibraryPanel` en lugar del antiguo `TemplateGallery` modal. El flujo abre desde la Toolbar y cierra desde el DockIconStrip, verificando que el estado del rack no cambia.
- **Test 7 (BlueprintLibraryPanel injection)**: Marcador de panel cambiado de `input[placeholder="Search blueprints..."]` al botón de pestaña `button:has-text("Official Store")`, que es más estable.
- **Test 8 (Outline cyan)**: Click bypass via `el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))` en lugar de `click({ force: true })`. El evento sintético `MouseEvent('click')` sortea el gesture detector `onPanStart` de framer-motion que interceptaba el `onClick`.
- **Código muerto eliminado**: Función `openGalleryFromToolbar` eliminada (ya no se usaba tras el refactor del flujo de galería). Header actualizado.
- **Refactor del helper `injectBlueprint`** (`e2e/helpers/blueprintInjection.ts`): Flujo completamente nuevo — Toolbar → panel lateral → pestaña "Official Store" → entrada blueprint → esperar celda en rack.
- **Toggle secuencial-safe**: Detecta si el panel ya está abierto antes de togglarlo.
- **Efecto colateral — RackStartupAssistant Matrix 4/4 PASS**: Conditions 2 y 4 de `RackStartupAssistant Matrix` (`e2e/rack-features.spec.ts`) ahora pasan porque usaban el mismo helper `injectBlueprint`.

### Últimos Cambios (10/06/2026 — Sesión 11 / Sesión 7 / v9.1.9-dev)

- **Cell Studio Draft Recovery System**: Autoguardado dinámico en `sessionStorage` mediante el hook `useCellStudioDraft.ts`. Al iniciar la interfaz, el modal `CellStudioDraftPrompt.tsx` ofrece al usuario la opción de restaurar el borrador previo o iniciar un borrador de cero de forma interactiva.
- **Unique Child Keys in Renderers**: Integradas claves React combinadas `key={`${child.id}-${index}`}` en `StructuralNode.tsx` y `CellNode.tsx` para evitar colisiones de keys y asegurar estabilidad en el renderizado del Rack.
- **Cell Studio Modular Refactor**: Rediseñado `CellStudioContainer.tsx` para delegar la interfaz en subcomponentes atómicos especializados (`CellStudioPreviewStrip`, `CellStudioToolbar`, `CellStudioContentArea`, `CellStudioAssetOverlay`) y centralizar el estado mediante `useCellStudioState.ts`.
- **RackStartupAssistant Visibility and State Dismissal**: Corregido en `VirtualRack.tsx` para verificar `isEmptyManifest` analizando la existencia real de componentes y contenedores. Al seleccionar "Create from Scratch", el asistente escribe la directiva en el estado local `isStartupDismissed` para ocultarse permanentemente y no bloquear el canvas vacío.
- **E2E Cancel Flow Fix**: Reemplazado matching ambiguo por roles estrictos de aria, haciendo que la inyección test 6 sea robusta.

### Últimos Cambios (10/06/2026 — Sesión 6 — v9.2.0-dev)

- **MenuBar.tsx**: Relocalizado "Studio Render" a `File > Export` y retirado de `Edit`.
- **Propagación de Niveles**: Propagado `inspectorLevel` desde la barra de menú a través del Dock de React hasta `PropertyPanel` y `ComponentEditor`.
- **Filtrado Dinámico**:
  - `PropertyPanel` filtra las pestañas mostradas en el panel de propiedades (Simple oculta diseño/lógica/archivos, Advanced revela diagnóstico).
  - Los 8 editores atómicos ocultan variantes, colores, bindings y rangos detallados según el nivel configurado.
- **Seguridad de Tipos**: Corregidas firmas de props para cumplir de manera estricta con `exactOptionalPropertyTypes: true` de TypeScript.

### Últimos Cambios (10/06/2026 — Sesión 5)

- **Vars CSS Alignment**: Alineación de tokens con layouts de visualización en light theme, y aislamiento de `.rack-viewport` para mantener componentes oscuros en el canvas de rack.
- **Turbopack `nul` Crash**: Archivo `nul` (Windows reserved name) eliminado; `/nul.*` añadido a `.gitignore`.

### Últimos Cambios (10/06/2026 — Sesión 4)

- **Drag Inertia (drag→pan migration)**:
  - `src/omega-ui-core/renderers/hooks/useUCADrag.ts`: handlers renombrados `handleDragStart/End` → `handlePanStart/End`. Eliminada la captura de `info.point`.
  - `src/omega-ui-core/renderers/components/StructuralNode.tsx` & `CellNode.tsx`: Reemplazados handlers de arrastre de framer-motion con handlers de pan, sumando el `dragOffset` al `left`/`top` del style para evitar springs inerciales al soltar.
- **Atomic Batch Alignment**:
  - `src/features/manifest-editor/components/viewport/ViewportToolbar.tsx`:
    - `applyAlignment` y `applyDistribution` reemplazadas por computación pura.
    - Nueva `applyPositionBatch` invoca `onUpdateManifest` una sola vez para evitar colisiones y carreras React.
    - Helper `isAlignDebug()` y traces de debugging mejorados.
- **useEntityCRUD Normalization**: `updateItem` normaliza siempre vía `applyUpdatesToNode` para evitar la pérdida de propiedades anidadas de layout.
- **i18n + SVG Icons**:
  - 8 PNGs de `public/icons/align/` convertidos a componentes SVG en `AlignIcons.tsx` con `currentColor`.
  - Tooltips de `ViewportToolbar` unificados al inglés.
- **RACK_MASTER Exclusion**: Excluidos `RACK_MASTER` y root IDs de operaciones de alineación global.

### Últimos Cambios (10/06/2026 — Sesión 3)

- **CSS Simplification (vars.css)**: `vars.css` simplificado para evitar duplicidad de dark theme, consolidando variables y soporte de aislamiento del rack.
- **Group/Ungroup & Context Menu**:
  - Context menu extendido con opciones de agrupamiento.
  - Desvío del focus en selección múltiple de `VirtualRack.tsx`.
  - Implementación de `groupSelected(ids)` y `ungroupNode(groupId)` en `useEntityCRUD.ts`.
- **V2 Blueprint Loading**: BlueprintLibraryPanel carga templates en formato de nodo de grupo de V2.
- **Right Panel Toggle Fix**: Los paneles laterales se abren y cierran de manera independiente en el dock.

### Últimos Cambios (08/06/2026 — Sesión 2)

- **Eliminación Física de legacy/**: Limpieza de imports obsoletos y remediación en 36 archivos. TSC 100% verde sin referencias legacy.
- **Seguridad**: Sanitización de paths en sub-rutas dinámicas, saneamiento XSS en renderers, eliminación de logging de claves API.
- **CellNode Wiring**: Primitivas React reemplazan el render de HTML strings en el rack.
- **ComponentEditor**: Conectado directamente a la sección esencial de propiedades.
- **TypeScript & ESLint Cleanup**: Habilitados flags estrictos de compilador. Eliminados ~200 imports y variables muertas.

### Recuperación Post-Regresión (10/06/2026)

- Sincronización completa con el plan de recuperación. Re-implementación de CSS variables unificadas (`vars.css`, `skins.css`, `signals.css`, `containers.css`, `tabs.css`).
- Fix de contaminación de coordenadas absolutas en `VirtualRack.tsx` y `RackContextMenu.tsx`.

### Phase R — Roadmap Original Refinements

- **R1a — Indicadores Visuales LayersPanel**: `NODE_TYPE_COLORS`, `childCount` badge, `getNodeIcon()`, `filterProgress` bar.
- **R1b — Ghost Preview Drag & Drop**: `dragGhost` overlay, `AnimatePresence`, glow indicators.
- **R1c — Filtros por Propiedades**: `propertySearchTerm`, `showAuditIssues`, `showTemplates`.
- **R2 — Simulaciones Extendidas**: 11 tipos de onda, SimulationScope, ModulationLines, persistencia.
- **R3 — Grupos → Blueprints**: Parámetros expuestos, versioning, nested groups, BlueprintPromptDialog.

### Tech Debt & ESLint Cleanup

- ESLint: 45 errors → 0 (Commit `dd10c59`).
- ESLint: 52 warnings → 0 (Commit `9a39a9d`).
- `as any` reemplazados con `as unknown as T` en ~15 archivos.
- `rules-of-hooks` fix (BlueprintPromptDialog).
- `exhaustive-deps` fixes (RulerOverlay, useWorkbenchModals).

---

*Registro actualizado: 2026-06-18*
