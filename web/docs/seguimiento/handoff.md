# OMEGA Manifest Editor - Handoff Briefing (Era 9.0.0-dev)

Este briefing sirve como guía técnica para desarrolladores o agentes de IA que asuman el mantenimiento o desarrollo de este repositorio independiente.

*Última actualización: 11/06/2026 (v9.2.0-dev -- E2E Blueprint Injection Suite 8/8 PASS. Suite total 17/22 77%)*

> **Regression Recovery Plan**: 100% completado (23/23 archivos + 2 tipos GridConfig). Ver `REGRESSION_RECOVERY_PLAN.md`. Pendiente: smoke-tests.spec.ts (0/5 — selectores desactualizados).

---

## Estado de la Suite E2E (v9.2.0-dev)

| Spec | Pass/Total | Estado |
|------|:----------:|--------|
| `blueprint-injection.spec.ts` | **8/8** ✅ | 100% — Tests 1-8 pasando. Helper `injectBlueprint` refactorizado para BlueprintLibraryPanel. |
| `rack-features.spec.ts` | **9/9** ✅ | 100% — Incluye RackStartupAssistant Matrix 4/4. Arreglado indirectamente por helper refactor. |
| `smoke-tests.spec.ts` | **0/5** ❌ | Selectores desactualizados (header → MenuBar). Pendiente desde Sesión 11. |
| **Total** | **17/22** ✅ | **77%. 0 regresiones** atribuibles a Sesiones 1-12. |

### Arquitectura del Helper E2E (`e2e/helpers/blueprintInjection.ts`)
- Función `injectBlueprint(page, options?)`: Abre Toolbar → espera BlueprintLibraryPanel → click entrada blueprint → espera celda en rack.
- **Toggle secuencial-safe**: Detecta si el panel ya está abierto antes de togglarlo.
- **Timeout configurable**: `panelLoadTimeoutMs` (10s por defecto).
- **Independiente del modal antiguo**: No usa `TemplateGallery`. No tiene dependencias de selectores de modal.

### Tests Conocidos y su Estrategia
| Test | Estrategia |
|------|-----------|
| 1-5 (injection) | Helper `injectBlueprint` con diferentes blueprints + aserciones de estructura |
| 6 (cancel) | Toggle Toolbar → DockIconStrip, verificar rack no cambia |
| 7 (panel injection) | Helper con marcador `"Official Store"` para panel listo |
| 8 (selection outline) | `dispatchEvent(MouseEvent('click'))` para sortear framer-motion |

---

## Resumen del Proyecto y Arquitectura

El **OMEGA Manifest Editor** es una SPA reactiva desarrollada sobre Next.js 16 (App Router) y React 19. Su único propósito es la creación, visualización y edición interactiva de manifiestos de configuración de módulos `.acemm` para el motor modular **ABDOmega**.

La separación de la web principal garantiza ciclos de compilación sumamente rápidos y un despliegue aislado en Vercel en la URL oficial de producción [https://abd-omega-editor.vercel.app/](https://abd-omega-editor.vercel.app/) (apuntando al dominio de utilidad definitivo `manifests.ajabadia.es`).

### 🟢 Migración en Curso: Simplificación del Modelo (v9.0.0-dev — Fases 0-5 Completadas)

El proyecto está siendo migrado de un modelo legacy basado en UCA tree (`OmegaNode`, governance sections, blueprint injection pipeline) a un **modelo atómico simplificado** con componentes directamente posicionados y grupos de un solo nivel. El objetivo es eliminar ~170 archivos y ~19K LOC de infraestructura sobrediseñada.

**Nuevos tipos** (definidos en `src/omega-ui-core/types/rack.ts`):
- `ComponentNode` — componente atómico (knob, slider, switch, button, port, led, display, label)
- `GroupNode` — grupo plano con `children: ComponentNode[]`
- `RackManifest` — rack con `children: (ComponentNode | GroupNode)[]`

**Documentos clave**:
- `docs/specs-and-architecture/SIMPLIFIED_MODEL_PROPOSAL.md` — Propuesta completa, fases, interacciones
- `docs/specs-and-architecture/SIMPLIFIED_MODEL_PROPOSAL.md#5-editor-e-inspector` — Análisis detallado del impacto en el panel derecho

**Estado actual**: Fases 0-5 completadas + Group/Ungroup + Blueprint v2 + Type barrel. Lo que se ha creado:
| Fase | Qué |
|------|-----|
| 0 | Tipos base (`types/rack.ts`) |
| 1 | 8 React primitives (`renderers/primitives/`) |
| 2 | 10 editores (`inspector/editors/`) |
| 3 | Legacy marcado como deprecated |
| 4 | 4 blueprints migrados + utilidad de conversión |
| 5 | typecheck 0 errors, lint 0 errors |

**Pendiente** (no planificado en las 6 fases): Wiring de los nuevos componentes/editor al flujo activo de la app, y eliminación física de ~170 archivos legacy (~19K LOC).

### ViewportToolbar, Drag Fix, Marquee & Ruler Sync (v9.1.0-dev)

- **ViewportToolbar Always Visible**: Always shows in rack view (except LIVE mode). Icon-only buttons: Magnet (snap toggle), Settings (Eurorack grid panel with Scale px/HP, Spacing X/Y, HP presets 1-42). Alignment buttons disabled when <2 items selected.
- **Drag Position Bug Fix**: `VirtualRackProps.onUpdateItem` widened from `Partial<ManifestEntity>` to `HybridEntityUpdate` (= `Partial<OmegaNode> | Partial<ManifestEntity>`). Fixes silent position loss when `useUCADrag` sends `{ layout: { pos } }`.
- **Marquee Selection**: Photoshop-style click+drag rectangle on empty rack space. `screenToRackLocal()` accounts for CSS transform (`translate(pan) scale(zoom)` with `transformOrigin: center`). `findNodesInRect()` AABB intersection via DFS. Crosshair cursor, dashed cyan overlay with `transition: none`. `didMarqueeRef` prevents click-clearing after drag.
- **ViewportControls Cleanup**: Grid3X3 button and `gridVisible`/`onToggleGrid` props removed. Grid controls consolidated into ViewportToolbar.
- **RulerOverlay Pan/Zoom Sync (rAF loop)**: Reemplazado el helper matemático `rackOrigin()` por un bucle continuo con `requestAnimationFrame` que muestrea `getBoundingClientRect()` del rack (`.rack-viewport`) y de la `<section>` en cada frame. Solo dispara `setState` cuando hay cambio real (guard `!==`). Agnóstico a cómo se mueve el rack (pan libre vía rAF, botones discretos `onPan(±50, 0)`, zoom, resize). El bucle se cancela en unmount con `cancelAnimationFrame`. Resultado: las marcas de la regla, las guías y los previews permanecen **anclados al (0,0) real del rack** en cualquier nivel de zoom (80%, 100%, 160%) y durante cualquier secuencia de pan. Sin desfase de un frame al alternar entre pan libre y botones de paneo.
- **RulerOverlay IIFE → Pre-computed ReactNodes**: Replaced inline IIFE patterns with `creatingLine` and `guideElements` variables to fix TS2322 (`(() => Element) | null` not assignable to `ReactNode`).
- **Ruler Zoom Desync Fix**: Rack viewport CSS class changed from `transition-all duration-700` to `transition-[box-shadow] duration-500`. The 700ms CSS transform transition caused ruler ticks to desync from the rack during zoom — the ruler drew at the target position while the rack was still animating. Now zoom/pan updates are instant; only box-shadow transitions for live mode glow.

### ViewportToolbar Hardening & Drag Inertia Fix (v9.1.2-dev)

- **Drag Inertia Elimination (drag→pan migration)**: `useUCADrag.ts`, `StructuralNode.tsx`, `CellNode.tsx` migrados de framer-motion `onDrag*` (con spring residual incluso con `dragMomentum={false}`) a `onPan*` (pointer-based, sin momentum). El elemento aterriza exactamente donde el puntero se suelta, sin desvío proporcional a la velocidad. El backup `ABDOmegaEditor___222` ya usaba este patrón desde el día 5. JSDoc del hook documenta el por qué del cambio.
- **Atomic Batch Alignment**: `ViewportToolbar.applyPositionBatch` reescrito para evitar la condición de carrera que provocaba que solo el segundo item se moviese. Antes: `forEach` de `onUpdateItem` (cada uno dispatch un manifest update que re-walkea el tree y recalcula `treeToManifest`); React los baulaba y el último sobreescribía a los anteriores. Ahora: un solo `onUpdateManifest` con la forma funcional `(prev) => { applyBatchPositionsToTree(tree, newPositions); treeToManifest(nextTree); return newState }`. Tree recorrido una vez, todas las posiciones aplicadas atómicamente, proyección legacy recalculada una sola vez al final.
- **Pure Calculation Functions**: `computeAlignedPositions` y `computeDistributedPositions` son funciones puras que devuelven `Map<id, {x, y}>` sin side-effects, separando cálculo de aplicación.
- **`applyBatchPositionsToTree` (DFS puro)**: Clona el árbol tocando solo el `layout.pos` de los nodos en el map; preserva `size`, `children`, `style`, `bind`, `role`, `cellRef`.
- **RACK_MASTER Excluded from Alignment**: `isRackRootNode()` detecta el root (kind==='rack' + id en `RACK_ROOT_IDS = {'RACK_MASTER', 'root', 'MAIN_RACK', 'MAIN_RACK_ROOT'}`). `gatherPositions` filtra el root por id Y por nodo encontrado (defensa en profundidad). Detección dinámica, no por id solo, para compatibilidad con fixtures y tests.
- **`useEntityCRUD.updateItem` Normalization**: Eliminada la condición frágil `!('kind' in updates) && ('presentation' in updates || 'pos' in updates)` que fallaba para `{ layout: { pos } }` (pos anidado en layout). Ahora SIEMPRE normaliza vía `applyUpdatesToNode(nodeInTree, updates)` y extrae `layout/style/bind/role/cellRef` para pasarlo a `updateNodeInTree`. Un solo path, sin rama else frágil.
- **Alignment Debug Logging**: `window.__OMEGA_ALIGN_DEBUG__ = true` activa un log estructurado de `gatherPositions` con `selectedIds`, `accepted[]` (id/x/y/w/h/kind), y `skipped[]` con `reason` tipado (`rack-root-id` | `rack-root-node` | `not-found` | `invalid-pos`) + `detail` JSON. Más `Number.isFinite()` guard para que `Infinity`/`NaN` no envenenen `Math.min/max`.
- **Selection Counter**: Chip `Sel: N` en la toolbar con `title` que explica el multi-select con Ctrl+click. Reduce la confusión sobre por qué los botones de align no se habilitan.
- **Distribute Threshold**: Bajado de `>= 3` a `>= 2` (estándar en herramientas de diseño).
- **SVG Icons with `currentColor`**: 8 PNGs de `public/icons/align/` convertidos a SVG en `src/features/manifest-editor/components/viewport/AlignIcons.tsx` con `stroke="currentColor"` y `fill="currentColor"`. Heredan el color del botón automáticamente, sin filtro CSS. 8 PNGs eliminados; regla `[data-ui-theme="light"] .align-icon { filter: invert(1) }` eliminada de `app/globals.css`.
- **i18n a Inglés**: 8 tooltips de alineación + 6 labels del dropdown de grid + título del align-target toggle traducidos de español a inglés.
- **`UpdateManifestFn` Shared Type**: Exportado desde `ViewportToolbar.tsx`, consumido por `WorkbenchViewport.tsx` y `WorkbenchPane.tsx` para satisfacer `exactOptionalPropertyTypes` aceptando la forma funcional `(prev) => Partial<OMEGA_Manifest>` que `history.updateManifestWithHistory` produce.
- **Turbopack `nul` Crash Fix**: Archivo `nul` (Windows reserved device name) eliminado; `/nul` y `/nul.*` añadidos a `.gitignore` para evitar re-creación accidental.

### Group/Ungroup & Blueprint v2

- **Group/Ungroup**: `groupSelected(ids)` y `ungroupNode(groupId)` en `useEntityCRUD`. Ctrl+G / Ctrl+Shift+G. Context menu muestra Group cuando ≥2 seleccionados, Ungroup cuando right-click en group node.
- **Blueprint v2**: `BlueprintLibraryPanel` carga desde `/blueprints/v2/index.json` (GroupNode). `insertBlueprint()` en `useEntityCRUD` convierte children → OmegaNodes con ID regeneración.
- **Type Barrel**: `src/omega-ui-core/types/index.ts` re-exporta blueprints, manifest, rack, validation. `ComponentType` collision manejada con alias `RackComponentType`.

---

## Integraciones Críticas y Canales de Datos

1.  **File System Access API (Local Pickers)**:
    *   **Implementación**: [useManifestTransfer.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/src/features/manifest-editor/hooks/io/useManifestTransfer.ts).
    *   Permite al usuario vincular una carpeta local mediante `window.showDirectoryPicker` para leer y guardar directamente los manifiestos `.acemm` sin intermediación de servidores remotos.
2.  **SSE Watchdog (Sincronización de Host)**:
    *   **Script**: [omega-watchdog.mjs](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/omega-watchdog.mjs).
    *   Un servidor local Node.js ligero que escucha cambios en el sistema de archivos local y actualiza en caliente el editor mediante Server-Sent Events (SSE).
3.  **UI Core (`omega-ui-core`)**:
    *   Ubicado en `src/omega-ui-core/`. Es la biblioteca de diseño analógico compartida que define la apariencia de Knobs, Jacks, Sliders e iluminaciones LED, garantizando consistencia absoluta con el renderizador del sintetizador host.

---

## Comandos Clave del Ciclo de Vida

*   **Entorno de Desarrollo**:
    ```bash
    npm run dev
    ```
    Inicia el servidor local en [http://localhost:3000](http://localhost:3000).
*   **Auditoría y Certificación Completa**:
    ```bash
    npm run full-audit
    ```
    Limpia caché, valida tipos con TypeScript y ejecuta ESLint y auditorías estructurales antes de desplegar.
*   **Comprobación de Tipos Estricta**:
    ```bash
    npm run typecheck
    ```
    Ejecuta el linter de tipos de TypeScript (`tsc --noEmit`).
*   **Lanzar Watchdog SSE**:
    ```bash
    node omega-watchdog.mjs [ruta_de_los_modulos]
    ```

---

## Consideraciones y Directivas Técnicas

*   **Restricciones de Tipos Strict**:
    *   `exactOptionalPropertyTypes` está habilitado en `tsconfig.json`. Todas las propiedades opcionales en Props o interfaces deben tiparse explícitamente agregando `| undefined` si pueden omitirse (ej. `prop?: type | undefined`).
    *   `verbatimModuleSyntax` está activo. En los archivos de test de Playwright (o cualquier entorno de testing), los tipos deben ser importados de forma explícita con type-only syntax (ej: `import type { Page } from '@playwright/test'` en lugar de `import { Page }`).
*   **Tipos Experimentales**:
    *   Debido a que `showDirectoryPicker` y las APIs asociadas no son nativas de la librería estándar `dom` de TS, se realizan castings controlados `(handle as any)` en el flujo de interacción de archivos.
*   **Gobernanza .agent**:
    *   El directorio `.agent` en la raíz contiene las reglas adaptadas del estándar de calidad de `ABDSuite`. Úsalas para guiar a los agentes de IA en las buenas prácticas del proyecto.
*   **Estandarización Estética e Historial Selectivo**:
    *   **Modales**: Todas las ventanas modales de la aplicación deben ceñirse a las dimensiones unificadas de `max-w-7xl` para ancho y `h-full max-h-[850px]` para alto.
    *   **Logs & Live Loop**: La terminal de logs corre de manera asilada en su propio panel del `RightDockContainer.tsx` (con ancho dinámico de 260px) activada desde el manillar lateral de la derecha. El `SimulationStatusBadge` (`LIVE LOOP`) se renderiza de forma centralizada en el `Header.tsx` principal.
    *   **Undo/Redo**: Para evitar ruido en la pila de historial, los cambios de estado de UI pura (como transiciones de paneles, zoom, split) están excluidos de las operaciones semánticas de Undo/Redo. Solo mutaciones de datos del rack son registradas.
    *   **Layout y Multi-Pane Split**: El editor soporta una cuadrícula flexible de 1 a 4 paneles (`primary`, `primary_bottom`, `secondary`, `secondary_bottom`). Cada panel muestra permanentemente las 4 vistas atómicas (`Orbital`, `Rack`, `Source`, `History`), y permite comparaciones lado a lado de la misma vista. Las columnas se redimensionan horizontalmente y las filas de forma independiente mediante splitters específicos (`primarySplitRatio` y `secondarySplitRatio`).
    *   **Independencia de Viewports**: El estado de zoom y pan se gestiona a nivel de pestaña individual en cada panel (`useViewport` instanciado localmente dentro de `WorkbenchPane.tsx`). Los cambios se sincronizan a la memoria de la sesión mediante el callback `onCaptureViewState`.
    *   **Aislamiento del Rack HUD**: En la vista de Rack (`VirtualRack.tsx`), los estilos de escala (`zoom`) y traslación (`pan`) se aplican de forma exclusiva al chasis del rack (`RACK_FRAME`), previniendo que afecte a la posición y escala de los botones de modo `ENGINEERING / LIVE` y del menú de planos de cara (`MAIN`, `VOICE`, etc.).
    *   **Gobernanza del Menú Ventana (Window)**: El menú de cabecera `Window` ofrece accesibilidad completa a todos los paneles del dock derecho. Además, permite desplegar un submenú dinámico para cada sección de propiedades del Rack, con indicadores de verificación (`Check`) sincronizados bidireccionalmente.
    *   **Exportación de renders de Studio**: El generador de renders de alta definición (`MockupModal.tsx`) utiliza `showSaveFilePicker()` para guardar el archivo PNG. Se ha implementado `skipFonts: true` para evitar congelamientos causados por bloqueos de CORS.

### Tema Light y Aislamiento del Rack
*   **Sistema de Temas Dual**: La aplicación soporta dark mode (por defecto) y light mode, controlado por `data-ui-theme` en `<html>`.
    *   `vars.css`: Definiciones base (`:root`) para dark; `[data-ui-theme="light"]` overridea todos los tokens `--wb-*`, `--primitive-*`, `--omega-*`.
    *   `globals.css`: Body gradient, `--color-surface`, `--color-outline`, Tailwind class remapping para light.
    *   `skins.css` / `containers.css` / `tabs.css`: Overrides específicos por componente para light.
*   **Aislamiento del Rack**: Los componentes rack (knobs, sliders, terminal, scope, LED, ports) **siempre** se renderizan en dark mode independientemente del tema UI.
    *   La clase `.rack-viewport` se aplica al rack frame en `VirtualRack.tsx`.
    *   `vars.css` fuerza tokens dark dentro de `.rack-viewport`.
    *   `globals.css` sección de reset previene que clases Tailwind se filtren al rack.

### Grid y Guías (Photoshop-Style)
*   **Grid Visual**: Overlay amarillo (`rgba(255,210,0,0.35)`) renderizado como div separado (`z-[1]`) dentro del rack frame, no como `backgroundImage` (quedaba detrás de los hijos).
    *   `grid.visible`: Controla overlay visual (toggle independiente).
    *   `grid.enabled`: Controla snap al grid.
    *   Configurable spacing X/Y via popover en toolbar.
*   **RulerOverlay**: Reglas estilo Photoshop en los bordes del viewport (no dentro del rack).
    *   Renderizado en `WorkbenchViewport.tsx` a nivel de sección.
    *   Fondo light `#e0e0e0` con indicadores dark `#222`/`#777`.
    *   Nunca se desmonta (usa `visibility: hidden` cuando está oculto).
*   **Creación de Guías**: `mousedown` en regla superior → guía horizontal; `mousedown` en regla izquierda → guía vertical. Línea preview azul (roja en zona de eliminación).
*   **Eliminación de Guías**: Arrastrar guía hacia zona de regla (`RULER_SIZE + 30px`), se pone roja; `mouseup` en zona de eliminación la borra.
*   **Persistencia**: Guías almacenadas en `manifest.ui.layout.grid.guides` (`GridGuide[]`), sincronizadas bidireccionalmente con undo/redo/load.
*   **Visibilidad**: Solo en vista Rack. Botones Grid/Rulers ocultos en orbital.

### LIVE Mode & Viewport Toolbar (Era 8.4.3)
*   **LIVE Mode Full Behavior**: LIVE mode now functionally differs from ENGINEERING mode:
    - Drag disabled in live mode (`useUCADrag` pan handlers return early).
    - Context menu blocked in live mode.
    - SignalInjector gated to live mode only.
    - `isLiveMode` propagated via `UCADebugContext` and `CellRenderer.renderCellHTML` options.
    - Grid/rulers hidden on enter, restored on exit via ref.
    - Right panel collapsed on enter, restored on exit.
    - ViewportToolbar hidden in LIVE mode.
    - Floating left toolbar hidden in LIVE mode (only shows in rack + ENGINEERING).
    - Selection outlines, debug HUD, overlays all hidden — clean "synthesizer" look.
    - Marquee selection and rack background deselection blocked.
    - Right panel auto-expand on selection blocked.
*   **Knob Rotation**: `KnobDragOverlay` in `CellNode.tsx` — transparent overlay with `ns-resize` cursor; vertical drag maps to 0–1 value via `onUpdateRuntimeValue` → `useRackSimulation.updateValue`.
*   **ViewportToolbar**: Dark industrial bar (`#111`, 28px) above rulers with:
    - 6 alignment buttons (Left/Center-H/Right/Top/Center-V/Bottom).
    - 2 distribution buttons (H/V) using DOM `getBoundingClientRect()` for positions.
    - Align-to toggle (Selection vs Canvas).
    - Snap ON/OFF toggle + Grid toggle with spacing settings popover.
*   **Multi-Selection**: Ctrl+click or Shift+click selects multiple nodes. Purple dashed outline + glow feedback.
*   **Marquee Selection**: Click+drag rectangle at section level. `onClickCapture` prevents VirtualRack from clearing multi-selection.
*   **Rulers Scale with Zoom**: Tick intervals = `TICK_MINOR * zoom`. Labels show actual rack coordinates offset by `pan.x`/`pan.y`. 0 at corner box (`RULER_SIZE = 22px`).

### Context Menu y Interacción
*   **Context Menu Fix**: `e.stopPropagation()` en todos los botones del `RackContextMenu` — previene que clicks se propaguen al viewport y deselecten el elemento.
*   **Duplicar con UCA**: `duplicateItem` soporta modo UCA tree (`insertNodeInTree` + `treeToManifest`) con offset `+20px x, +15px y`.
*   **Selección auto-expande panel**: `SET_SELECTED_NODE` en `workbenchReducer.ts` expande el panel derecho si estaba colapsado (excepto en LIVE mode).
*   **Contaminación de posición**: Los writes de layout ahora son solo `{ pos }` en lugar de `{ ...node.layout, pos }` — previene que propiedades expandidas de template contaminen el raw tree.
*   **Drag solo en hojas**: `StructuralNode` solo aplica pan handlers a contenedores sin hijos; `onTap` usa `.closest()` para ignorar taps sobre hijos.

*   **Cell Philosophy & Laboratorio Aislado**:
    *   **Modelo de Datos Canónico**: Las celdas se dividen bajo el dominio en `PrimitiveNode`, `CompositeCell` y `StructuralModule` (`src/types/cell-types.ts`) para separar lógica de `OmegaNode` legacy.
    *   **Cell Studio Stepper**: Activado mediante el parámetro URL `?mode=stepper`, guía secuencialmente en el diseño y parametrización de celdas (Compose, Behavior, Style, Review).
    *   **Desacoplamiento de Lógica**: Orquestado por `useCellStudioState`, `useCellStudioMode` y `useCellStudioDraft`.
    *   **Acceso Unificado**: "Universal Cell Laboratory" abre nativamente `CellStudioContainer` (`setStudioMode(true)` en el hook modularizado `useWorkbenchModals`). Se retiraron overrides bloqueantes en `app/[locale]/page.tsx`.
*   **Complejidad Dinámica y Experiencia de Usuario (UX)**:
    *   **Inspector Level Governance**: El editor soporta 3 niveles de complejidad (`Simple`, `Medium`, `Advanced`) controlados desde el menú `View > Inspector Level`. El `PropertyPanel` utiliza este estado para mostrar/ocultar dinámicamente secciones (`TieredSection`) técnicas (ej. Diagnósticos UCA o lógicas de Binding) garantizando una curva de aprendizaje suave.
    *   **Startup Assistant (Empty State)**: Cuando el `VirtualRack` no contiene elementos (`allElements.length === 0`), se renderiza un asistente con diseño *Glassmorphism* para facilitar acciones rápidas como inyectar blueprints o enlazar directorios locales.
    *   **Menús Contextuales del Rack**: Clic derecho sobre módulos en el rack despliega un menú contextual para acciones en caliente (`Edit Properties`, `Duplicate`, `Delete`, `Alinear a cuadrícula`).
    *   **Grid Snapping & Free Drag**: El sistema soporta un modo de cuadrícula continua (botón global ON/OFF) y un modo de alineación puntual de un solo uso. La resolución del grid está unificada con la especificación mecánica de Eurorack (`1 HP ≈ 15px`) y es configurable desde la sección *Physical Emulation Profile*. Los nodos secundarios pueden arrastrarse libremente sin mover sus contenedores padre.
    *   **Atajos en el MenuBar**: Se incluyen hints visuales (`Ctrl+S`, etc.) en la barra de menú.
*   **Estructura de Archivos y Monolith Splitting (Era 8.3.2)**:
    *   Se realizó una campaña de división de archivos monolíticos (>150 líneas) en 5 rondas, extrayendo 20 archivos nuevos.
    *   **Objetivo**: Reducir la complejidad cognitiva de archivos individuales y mejorar la mantenibilidad a largo plazo.
    *   **Archivos reducidos**: `useDocumentOrchestrator` (722→202), `RightDockContainer` (701→363), `CellStudioContainer` (602→312), `CellRenderer.ts` (560→0→directorio), `BlueprintLibraryPanel` (421→336), `VirtualRack` (408→283), `MenuBar` (380→291), `AssetSelector` (373→277), `LayersPanel` (366→193), `StyleEditorModal` (321→232).
    *   **Archivos evaluados y dejados como están**: `WorkbenchContainer.tsx` (612—orquestador con closures acopladas), `PropertyPanel.tsx` (393—orquestador puro), `SourceView.tsx` (271—efectos Monaco acoplados).
    *   **DRY aplicado**: El patrón de toggles (Eye/EyeOff, Lock/Unlock, Trash2) se repetía idéntico en 3 categorías de `LayersPanel`; ahora es un único componente `LayerItem`. El VFS building de `AssetSelector` se encapsuló en `useAssetVFS`. La navegación por teclado de `VirtualRack` se encapsuló en `useRackKeyboardNav`.
    *   **Convención de barrel**: `CellRenderer.ts` se convirtió en directorio `CellRenderer/` con `index.ts` barrel, manteniendo imports existentes (`@/omega-ui-core/renderers/CellRenderer`).
    *   **Subdirectorios por componente**: Los archivos extraídos se colocan en subdirectorios junto al original (ej. `MenuBar/MenuItem.tsx`, `BlueprintLibrary/useBlueprintCatalog.ts`).
    *   **Total**: 20 archivos nuevos, 10 originales reducidos, `tsc --noEmit` 0 errores.
