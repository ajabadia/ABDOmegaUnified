# Guía de Arquitectura — OMEGA Manifest Editor

> **Versión**: 0.1.0 · **ERA**: 7.2.3  
> **Stack**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript 5  
> **Propósito**: Editor visual para diseñar, parametrizar y certificar manifiestos de módulos del ecosistema de síntesis modular OMEGA (formato `.acemm`).

---

## Índice

1. [Visión General](#1-visión-general)
2. [Estructura del Repositorio](#2-estructura-del-repositorio)
3. [Arquitectura en Capas](#3-arquitectura-en-capas)
4. [El Modelo de Datos (OMEGA Manifest)](#4-el-modelo-de-datos-omega-manifest)
5. [El Núcleo UI: `omega-ui-core`](#5-el-núcleo-ui-omega-ui-core)
6. [El Feature Principal: `manifest-editor`](#6-el-feature-principal-manifest-editor)
7. [Servicios](#7-servicios)
8. [Flujo de Datos](#8-flujo-de-datos)
9. [Sistema de Temas y Estilos](#9-sistema-de-temas-y-estilos)
10. [Convenciones y Patrones](#10-convenciones-y-patrones)
11. [Testing](#11-testing)
12. [Dónde Empezar](#12-dónde-empezar)

---

## 1. Visión General

El **OMEGA Manifest Editor** es una SPA (Single Page Application) construida con Next.js 16 App Router. Corre completamente en el navegador y permite:

- **Diseño visual de racks**: ubicar, escalar y maquetar knobs, jacks, sliders, displays en un canvas interactivo con grid de 5px y guías.
- **Matriz de modulación visual**: conexiones SVG drag-and-drop con curvas Bezier, coloreadas por tipo de señal.
- **Cell Studio**: editor aislado de celdas con capas, recetas de comportamiento y previsualización.
- **Blueprints**: galería de plantillas, empaquetado `.acepack` e inyección posicional.
- **Validación y certificación**: contra esquemas JSON ERA 7.x, pipeline WASM de integridad, panel de compliance.
- **Multi-documento**: edición simultánea de múltiples archivos con tabs independientes.
- **Persistencia**: File System Access API, `localStorage`, watchdog con hot-reload.
- **Historial semántico**: undo/redo con ramificación, línea de tiempo visual, batch operations.

---

## 2. Estructura del Repositorio

```
ABDOmegaEditor/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Páginas localizadas (next-intl)
│   │   ├── layout.tsx            # Layout con i18n
│   │   └── page.tsx              # Página principal: WorkbenchContainer
│   ├── api/                      # API routes (audio, contacto)
│   ├── globals.css               # Estilos globales + variables de tema
│   ├── layout.tsx                # Root layout (fuentes, HTML shell)
│   └── page.tsx                  # Redirige a /[locale]
├── src/
│   ├── features/
│   │   └── manifest-editor/      # ★ Feature principal (el editor)
│   ├── omega-ui-core/            # ★ Sistema de diseño canónico + tipos
│   ├── services/                 # ★ Servicios (singletons)
│   ├── components/ui/            # Componentes UI compartidos
│   ├── hooks/                    # Hooks compartidos
│   ├── types/                    # Re-export hacia omega-ui-core
│   ├── lib/                      # Utilidades generales
│   ├── constants/                # Constantes del feature
│   ├── i18n/                     # next-intl routing y request
│   ├── data/                     # Instrumentos, calibración, esquemas JSON
│   └── middleware.ts             # next-intl middleware
├── e2e/                          # Playwright E2E tests
├── scripts/                      # Auditorías, watchdog, generación de gráficos
└── docs/                         # ADRs, planes, reportes, especificaciones
```

### 2.1 Mapa de Archivos Clave

| Archivo | Rol |
|---|---|
| `app/[locale]/page.tsx` | Entry point de la aplicación, renderiza `<WorkbenchContainer>` |
| `app/[locale]/layout.tsx` | Layout localizado con `next-intl` |
| `app/globals.css` | Variables CSS de 5 temas, estilos base |
| `next.config.ts` | Config Next.js + plugin next-intl |
| `tsconfig.json` | Strict TS con `exactOptionalPropertyTypes`, `verbatimModuleSyntax` |
| `src/middleware.ts` | Detección de locale |

---

## 3. Arquitectura en Capas

```
┌──────────────────────────────────────────────────────────┐
│                    App Router (app/)                      │
│  [locale]/page.tsx → WorkbenchContainer                  │
├──────────────────────────────────────────────────────────┤
│              manifest-editor (features/)                  │
│  Componentes │ Hooks │ Types │ Constants │ Utils          │
├──────────────────────────────────────────────────────────┤
│              omega-ui-core (shared)                       │
│  Tipos canónicos │ UCA pipeline │ Renderers │ CSS tokens  │
├──────────────────────────────────────────────────────────┤
│              services (singletons)                        │
│  WASM RPC  │  Historial  │  Persistencia  │  Validación   │
├──────────────────────────────────────────────────────────┤
│           Plataforma (Next.js / React / Browser)         │
└──────────────────────────────────────────────────────────┘
```

**Principio**: `omega-ui-core` es la capa canónica y no conoce a `manifest-editor`. Los tipos fluyen hacia arriba (servicios y feature importan de `omega-ui-core`, no al revés). Los servicios son singletons independientes. El feature orquesta todo.

**Regla de dependencias** (aplicada en ERA 7.2.3):
- `omega-ui-core/` → **no importa nada** de `features/` ni `services/`
- `services/` → importa tipos de `omega-ui-core/`, **nunca** de `features/`
- `features/manifest-editor/` → importa de `omega-ui-core/` y `services/`

---

## 4. El Modelo de Datos (OMEGA Manifest)

Definido en `src/omega-ui-core/types/manifest.ts` (~627 líneas). Es la **fuente de verdad única** para todas las estructuras de datos.

### 4.1 Tipos Principales

| Tipo | Descripción |
|---|---|
| `OMEGA_Manifest` | Documento raíz: metadata, módulos, assets, blueprints, modulaciones |
| `ManifestEntity` | Una entidad dentro del manifiesto (módulo) |
| `OmegaNode` | Nodo genérico del árbol UCA — la unidad fundamental de render |
| `OmegaStyleNode` | Propiedades estéticas de un nodo (color, fuente, bordes, variante) |
| `OMEGA_Contract` | Contrato formal del manifiesto para validación WASM |
| `BlueprintDefinition` | Definición de blueprint reutilizable |
| `OMEGA_Modulation` | Conexión de modulación origen→destino |
| `OMEGA_Asset` | Recurso multimedia (imagen, filmstrip, SVG) |
| `CellTemplate` | Plantilla de celda para el Cell Studio |
| `UCA_Port` | Puerto de señal universal (dirección, tipo de señal) |
| `Attachment` | Elemento secundario anclado a un nodo (label, led, display) |

### 4.2 Layout Containers

| Tipo | Descripción |
|---|---|
| `LayoutContainer` | Contenedor con modo de layout (`absolute`, `stack-v`, `stack-h`), padding, gap |
| `Position` | Coordenadas `{x, y}` |
| `Dimensions` | Ancho y alto (`width`, `height`) |

### 4.3 Governance

| Tipo | Descripción |
|---|---|
| `HardwareGovernance` | Tornillos, rieles, variante de hardware |
| `LightingGovernance` | Sombras, intensidad ambiental, desenfoque |
| `FaceplateGovernance` | Asset o color del faceplate |

---

## 5. El Núcleo UI: `omega-ui-core`

Ubicado en `src/omega-ui-core/`, es un **paquete canónico compartido** que contiene el sistema de diseño, los tipos, el pipeline de compilación UCA y los renderers visuales.

### 5.1 Estructura

```
omega-ui-core/
├── types/               # Interfaces canónicas (manifest, blueprint, rack, validation, audit, history)
├── constants/           # Design tokens en TypeScript + storage keys canónicas
├── utils/               # Utilidades (idManagement, color, style, validators)
├── uca/                 # Universal Cell Architecture — pipeline de compilación
│   ├── ucaBridge.ts     # manifestToTree / treeToManifest / applyOverrides
│   ├── treeUtils.ts     # Manipulación del árbol (mover, encontrar, mergear)
│   ├── layoutResolver.ts # Cálculo de posiciones absolutas (stack-v, stack-h, absolute)
│   ├── spatialConstraints.ts # Tamaños de nodo, constraints
│   ├── behaviorResolver.ts  # Resolución de comportamientos
│   ├── blueprintResolver.ts # Compilación de blueprints a árbol
│   ├── ucaSemantics.ts  # Resolución semántica de nodos
│   └── ucaInjection.ts  # Inyección de blueprints en el árbol
├── renderers/           # Renderers visuales React
│   ├── UniversalRenderer.tsx  # Orquestador recursivo
│   ├── KnobRenderer.ts       # Perilla
│   ├── SliderRenderer.ts     # Fader
│   ├── LedRenderer.ts        # LED
│   ├── PortRenderer.ts       # Jack / Puerto
│   ├── DisplayRenderer.ts    # Display numérico
│   ├── SwitchRenderer.ts     # Switch
│   ├── SelectRenderer.ts     # Selector
│   ├── ContainerRenderer.ts  # Contenedor layout
│   ├── CellRenderer.ts       # Celda con attachments
│   ├── ...                   # ~24 renderers en total
│   └── components/           # StructuralNode, CellNode, UCADebugHUD
├── utils/               # Utilidades
│   ├── ColorResolver.ts      # Resolución de colores por tema
│   ├── StyleResolver.ts      # Motor de estilos (core → distill)
│   ├── manifestValidator.ts  # Validación contra esquema JSON
│   ├── blueprintValidator.ts # Validación de blueprints
│   ├── circularityAuditor.ts # Detección de circularidad en modulación
│   ├── distillForJUCE.ts     # Destilación para exportación JUCE
│   └── ... (22 utilidades)
├── primitives/          # CSS de primitivas visuales (controls, indicators, visuals)
├── layout/              # CSS de layout (cells, containers, screws, splash, tabs)
├── tokens/              # CSS tokens (vars, signals, skins)
├── hooks/               # useDesignTokens
└── index.ts             # Barrel export público
```

### 5.2 El Pipeline UCA (Universal Cell Architecture)

El flujo de compilación de un manifiesto a árbol renderizable:

```
OMEGA_Manifest
    ↓
ucaBridge.manifestToTree()  ← Convierte el manifiesto a árbol OmegaNode
    ↓
resolveNodeSemantics()      ← Resuelve semánticas (catalog, comportamientos)
    ↓
resolveLayout()             ← Calcula posiciones absolutas bottom-up
    ↓
UniversalRenderer           ← Renderiza recursivamente el árbol
    ├── StructuralNode      ← Nodos estructurales (containers, groups)
    ├── CellNode            ← Nodos de control (knobs, sliders, etc.)
    └── Individual Renderers ← KnobRenderer, LedRenderer, etc.
```

### 5.3 El UniversalRenderer

En `src/omega-ui-core/renderers/UniversalRenderer.tsx`. Es un componente React recursivo que:

1. Resuelve semántica del nodo (`resolveNodeSemantics`)
2. Resuelve layout (`resolveLayout`) — obtiene posición absoluta
3. Si el nodo es estructural → renderiza `<StructuralNode>` que itera sus hijos
4. Si el nodo es celda → renderiza `<CellNode>` que delega al renderer específico
5. Renderiza debug HUD si está habilitado

---

## 6. El Feature Principal: `manifest-editor`

Ubicado en `src/features/manifest-editor/`. Es la aplicación completa del editor. Sigue una estructura por **carpetas técnicas** (components, hooks, types, utils, constants, services).

### 6.1 Componentes

```
components/
├── layout/             # Header, MenuBar, Toolbar, CommandPalette, Footer, Logs
├── viewport/           # WorkbenchViewport, VirtualRack, NodeCanvas, MiniMap, GhostPreview
├── rack/               # RenderedRackTree, ModulationLines, BindingOverlay, HUD
├── inspector/          # RightDockContainer, LayersPanel, PropertyPanel, CompliancePanel, HistoryPanel
│   └── dock/           # DockIconBar, DockPanelHeader
├── lab/                # CellStudio (contenedor, toolbar, content area, preview)
├── modulation/         # VisualModulationMatrix
├── workspace/          # WorkbenchRenderPane, SplitDivider
├── modals/             # EditorModals
├── gallery/            # TemplateGallery
├── shared/             # OnboardingWalkthrough, WorkbenchDropOverlay, HiddenFileHandlers, toast
├── audit/              # Paneles de auditoría
├── preview/            # Previsualizaciones
├── primitives/         # Componentes primitivos del feature
└── viewport/           # ViewWrapper, ViewportToolbar
```

#### 6.1.1 WorkbenchContainer — El Orquestador Principal

En `components/WorkbenchContainer.tsx`. Es el componente raíz del editor. Recibe todas las props de su hook homónimo `useWorkbenchContainer` y distribuye el estado a los componentes hijos: Header, Toolbar, CommandPalette, WorkbenchViewport, RightDockContainer, CellStudio, etc.

#### 6.1.2 WorkbenchViewport — El Área de Trabajo

En `components/viewport/WorkbenchViewport.tsx`. Gestiona:

- 4 modos de vista: `orbital`, `rack`, `source`, `history`
- Navegación: zoom, pan, reset, fit
- Selección: marquee, individual, múltiple (ctrl/shift)
- Guías, rulers, mini-map
- Coordina VirtualRack, NodeCanvas, RulerOverlay, HistoryPanel

#### 6.1.3 RenderedRackTree — El Árbol Renderizado

En `components/rack/RenderedRackTree.tsx`. Toma el manifiesto, filtra nodos ocultos, y delega en `UniversalRenderer` para renderizar el árbol UCA completo.

### 6.2 Hooks — La Capa de Estado

~66 hooks en `hooks/`. No hay store global — el estado se compone mediante hooks.

#### Jerarquía de hooks

```
useWorkbenchContainer  ← Hook principal (~724 líneas, compone todos los demás)
├── useWorkbenchState        ← Estado UI del workbench (tabs, paneles, herramientas)
├── useManifestEditor        ← Orquestador del dominio
│   ├── useDocumentOrchestrator  ← Máquina de estados multi-documento
│   │   ├── orchestratorReducer  ← Reducer puro de transiciones
│   │   ├── useSessionPersistence ← Persistencia localStorage
│   │   ├── useDocumentDirtyWatcher ← Detección cambios no guardados
│   │   ├── useDocumentTransactions ← Transacciones undo/redo
│   │   └── useHistoricalRestore   ← Restauración histórica
│   ├── useEntityManager      ← CRUD de entidades del manifiesto
│   ├── useAuditEngine        ← Motor de auditoría
│   ├── useFileOps            ← File System Access API
│   ├── useSimulationBridge   ← Puente de simulación en vivo
│   ├── useDeployment         ← Despliegue WASM
│   ├── useBlueprintInjection ← Inyección de blueprints
│   ├── useHistoryActions     ← Acciones de historial
│   └── useClipboardActions   ← Portapapeles de transformaciones
├── useAlignment         ← Alineación y distribución de nodos
├── useGhostPreview      ← Previsualización fantasma (Alt+Click)
├── useAudit             ← Estado de auditoría
├── useWatchdog          ← Watchdog SSE
├── useDynamicFonts      ← Carga dinámica de fuentes
├── useFileDrop          ← Drag & drop de archivos
├── useRackSections      ← Secciones del rack
├── useEntityCrud        ← CRUD genérico
├── useExportOperations  ← Exportación
├── useBatchHistory      ← Historial batch (hide, lock, group)
├── useCellBlueprint     ← Blueprints de celda
├── useGroupBlueprint    ← Blueprints de grupo
├── useWorkbenchFileOperations ← Operaciones de archivo
└── useWorkbenchShortcuts      ← Atajos de teclado
    ├── useLayerShortcuts      ← Atajos de capas
    ├── useLayerDragDrop       ← Drag & drop de capas
    ├── useLayerKeyboardNavigation ← Navegación por teclado
    └── useViewportMarquee     ← Selección marquee
```

### 6.3 Tipos del Feature

En `types/`:

| Archivo | Contenido |
|---|---|
| `document.ts` | `DocumentState`, `OrchestratorState`, `OrchestratorAction` — la máquina de estados |
| `history.ts` | **Re-export** desde `omega-ui-core/types/history` — tipos del historial |
| `workbench.ts` | Estado del workbench UI |
| `diagnostics.ts` | **Re-export** desde `omega-ui-core/types/audit` — diagnósticos y auditoría |
| `diff.ts` | Diferencias semánticas |

### 6.4 Constantes

En `constants/`:

| Archivo | Contenido |
|---|---|
| `defaults.ts` | `DEFAULT_MANIFEST`, `normalizeManifest()` |
| `storage.ts` | **Re-export** desde `omega-ui-core/constants/storage` — claves de localStorage |
| `templates.ts` | Plantillas de módulos |
| `toolbarDefinitions.tsx` | Definiciones de botones de toolbar |
| `toolbarGroups.ts` | Grupos de toolbar |
| `workbench.ts` | Constantes del workbench |

---

## 7. Servicios

En `src/services/`. Son **singletons** (instancias exportadas) que proveen lógica de dominio transversal.

| Servicio | Archivo | Responsabilidad |
|---|---|---|
| `HistoryService` | `historyService.ts` | Undo/redo con branching, coalescing, max 50 entradas. Tipos en `omega-ui-core/types/history` |
| `PersistenceService` | `persistenceService.ts` | Persistencia en localStorage del grafo canónico |
| `WasmRuntime` | `wasmRuntime.ts` | Puente WASM — delta batching a 60Hz, reconciliación, deployment |
| `OmegaRPCBridge` | `rpc/omegaRPCBridge.ts` | Canal RPC tipado al runtime WASM |
| `ReconciliationService` | `reconciliationService.ts` | Detección y resolución de divergencias estado UI↔engine |
| `ObservabilityService` | `observabilityService.ts` | Telemetría y tracking de eventos |
| `IntegrityService` | `integrityService.ts` | Pipeline WASM de integridad, verifyBindings() |
| `AuditService` | `auditService.ts` | Auditoría estructural de manifiestos. Tipos en `omega-ui-core/types/audit` |
| `ValidationService` | `validationService.ts` | Validación de esquemas |
| `ClipboardService` | `clipboardService.ts` | Copiar/pegar transformaciones. Usa `omega-ui-core/constants/storage` y `omega-ui-core/utils/idManagement` |
| `CadExportService` | `cadExportService.ts` | Exportación CAD |
| `SchemaValidator` | `validation/schemaValidator.ts` | Validación Ajv contra schema JSON |
| `IndustrialRules` | `validation/industrialRules.ts` | Reglas de validación industrial |

### 7.1 WasmRuntime — El Puente de Tiempo Real

En `wasmRuntime.ts` (~475 líneas). Gestiona:

- **Delta batching**: bufferiza cambios de parámetros y los envía en lotes cada 16ms (60Hz) vía `OmegaRPCBridge`
- **Reconciliación**: compara estado UI vs engine, detecta divergencias, resuelve conflictos
- **Materialización**: despliega el manifiesto como programa DSP
- **Verificación de bindings**: valida que las conexiones del manifiesto sean válidas contra el contrato WASM

### 7.2 HistoryService — Historial Semántico

En `historyService.ts` (~127 líneas). Características:

- Push de entries con tipo semántico (`CONTENT_CHANGE`, `SELECTION`, `SNAPSHOT`, `BATCH`, etc.)
- **Coalescing**: eventos UI de alta frecuencia se fusionan si ocurren en <1500ms
- **Branching**: al hacer push, se limpia la pila de future (redo)
- Límite de 50 entradas con desplazamiento FIFO
- Tracking vía observabilityService

### 7.3 PersistenceService — Persistencia Local

En `persistenceService.ts`. Guarda el estado canónico en `localStorage` con metadatos (schemaVersion, correlationId, syncHash).

---

## 8. Flujo de Datos

### 8.1 Flujo Principal: Interacción → Render

```
Usuario: hace clic en un knob, arrastra un slider, pulsa Ctrl+Z
    ↓
Handler en el componente React
    ↓
Llama a función en useWorkbenchContainer
    ↓
useManifestEditor.updateManifest() / useEntityManager
    ↓
orchestratorReducer → nuevo DocumentState inmutable
    ↓
useDocumentTransactions: start → mutate → commit
    ↓
historyService.push(entry)
    ↓
React re-renderiza el árbol de componentes
    ↓
RenderedRackTree recibe nuevo manifest prop
    ↓
UniversalRenderer compara props → renderiza diferencias
```

### 8.2 Flujo de Simulación en Vivo

```
Usuario manipula un control
    ↓
useSimulationBridge recibe el cambio
    ↓
WasmRuntime.setParameter(id, value)
    ↓
Delta buffer acumula el cambio
    ↓
flushDeltas() cada 16ms
    ↓
OmegaRPCBridge.applyDeltaBatch(deltas)
    ↓
Engine WASM procesa y responde
    ↓
Reconciliación opcional para verificar consistencia
```

### 8.3 Flujo de Persistencia

```
useDocumentOrchestrator detecta cambio
    ↓
useSessionPersistence → localStorage.setItem('omega_canonical_session', ...)
    ↓
(File System Access API) → Escribe .acemm directamente al disco
    ↓
Watchdog (SSE) detecta cambio → hot-reload
```

### 8.4 Flujo del Cell Studio

```
Usuario abre Cell Studio (Ctrl+Shift+E)
    ↓
CellStudioContainer carga cellTemplate
    ↓
LayerRecipeEditor permite editar capas y recetas
    ↓
CellStudioPreviewStrip muestra preview en vivo
    ↓
Al guardar → blueprintResolver compila la celda
    ↓
ucaBridge.manifestToTree() integra en el árbol principal
```

---

## 9. Sistema de Temas y Estilos

### 9.1 Temas Soportados

| Tema | CSS Class | Descripción |
|---|---|---|
| Dark | `theme-dark` | Default, fondo oscuro, acentos cian |
| Light | `theme-light` | Fondo claro, texto oscuro |
| Amber | `theme-amber` | Tono cálido ámbar |
| Cyberpunk | `theme-cyberpunk` | Neón, alto contraste |
| High Contrast | `theme-high-contrast` | Máxima legibilidad |

### 9.2 Variables CSS

Definidas en `app/globals.css`. Cada tema declara:

- `--wb-primary`, `--wb-bg`, `--wb-surface`, `--wb-outline`, `--wb-text`
- `--primary-rgb`, `--wb-bloom`, `--wb-accent`
- `--primitive-*`, `--omega-*`
- `--signal-audio`, `--signal-cv`, `--signal-gate`, `--signal-midi`

### 9.3 Design Tokens

En `src/omega-ui-core/constants/design-tokens.ts`. Objeto TypeScript con los mismos valores que las variables CSS, usados para cálculos en JS.

### 9.4 Convención de Capas

```
globals.css               → Variables de tema + estilos base
omega-ui-core/tokens/     → Tokens canónicos (vars, signals, skins)
omega-ui-core/primitives/ → CSS de componentes visuales (knobs, leds, etc.)
omega-ui-core/layout/     → CSS de layout (containers, cells, screws)
Tailwind                  → Solo para layout del workspace, paneles, HUD
```

---

## 10. Convenciones y Patrones

### 10.1 TypeScript

- **`strict: true`** + **`exactOptionalPropertyTypes`** — `?` y `| undefined` no son intercambiables
- **`verbatimModuleSyntax: true`** — obligatorio usar `import type` para tipos
- **`noUnusedLocals`** y **`noUnusedParameters`** activos
- Path alias: `@/` → `src/` y raíz

### 10.2 Anotaciones JSDoc

Cada archivo tiene un bloque JSDoc con:

```typescript
/**
 * @purpose Descripción en español
 * @purpose_en Descripción en inglés
 * @refactorable true/false
 * @classification UI Component | Custom Hook | Business Service | Type Definition | Helper Utility
 * @complexity Low | Medium | High
 * @fingerprint exports:N,imports:N,sig:<hash>
 * @lastUpdated <ISO timestamp>
 */
```

### 10.3 Estructura de Archivos

- **Componentes**: PascalCase, archivo individual (ej. `KnobRenderer.tsx`)
- **Hooks**: camelCase con prefijo `use` (ej. `useWorkbenchContainer.ts`)
- **Servicios**: camelCase (ej. `persistenceService.ts`)
- **Constantes**: UPPER_SNAKE_CASE o camelCase según contexto
- **Tipos**: PascalCase, interfaces sin prefijo `I`

### 10.4 Manejo de Estado

- Sin store global (Redux/Zustand). Estado compuesto por hooks.
- `useReducer` para máquinas de estado complejas (`orchestratorReducer`).
- Hooks especializados separan responsabilidades (~66 hooks).
- El hook `useWorkbenchContainer` compone ~30 sub-hooks.

### 10.5 Testing

- Tests unitarios: `*.test.ts` junto al source, ejecutados con `tsx`
- Tests E2E: Playwright en `e2e/`
- Tests de estrés RPC: `rpcStress.test.ts`, `validatorStress.test.ts`
- `npm test` ejecuta los tests unitarios listados explícitamente en `package.json`

### 10.6 Auditoría Estructural

- `npm run arch-audit` — Architectural Guard (script Node.js)
- `npm run full-audit` — Certificación completa 6 fases

---

## 11. Testing

```bash
# Tests unitarios
npm test

# Tests E2E
npm run test:e2e
npm run test:e2e:ui

# Auditoría estructural
npm run arch-audit

# Certificación completa
npm run full-audit

# TypeScript strict check
npm run typecheck

# ESLint
npm run lint
```

**Cobertura**: ~825 tests unitarios (46 suites) + 51 snapshots + suite E2E.

---

## 12. Dónde Empezar

### Para entender el modelo de datos

1. **`src/omega-ui-core/types/manifest.ts`** — Todos los tipos canónicos del sistema
2. **`src/features/manifest-editor/types/document.ts`** — La máquina de estados del editor
3. **`src/omega-ui-core/types/history.ts`** — El sistema de historial (fuente canónica; `features/manifest-editor/types/history.ts` re-exporta)

### Para entender el renderizado

1. **`src/omega-ui-core/renderers/UniversalRenderer.tsx`** — El orquestador recursivo
2. **`src/omega-ui-core/uca/layoutResolver.ts`** — Cómo se posicionan los nodos
3. **`src/omega-ui-core/uca/ucaBridge.ts`** — Cómo se compila un manifiesto a árbol

### Para entender el flujo de interacción

1. **`app/[locale]/page.tsx`** → Entry point
2. **`src/features/manifest-editor/components/WorkbenchContainer.tsx`** → El shell principal
3. **`src/features/manifest-editor/hooks/useWorkbenchContainer.ts`** → Toda la lógica orquestada
4. **`src/features/manifest-editor/hooks/useManifestEditor.ts`** → Sub-orquestador del dominio
5. **`src/features/manifest-editor/hooks/useDocumentOrchestrator.ts`** + **`orchestratorReducer.ts`** → Máquina de estados

### Para añadir un nuevo componente visual

1. Crea el renderer en `src/omega-ui-core/renderers/` siguiendo el patrón de los existentes
2. Añádelo al `cellRendererMap.ts` si es un tipo de control
3. Integra el estado/manejo en el feature manifest-editor si es necesario

### Para añadir un tipo o constante canónica

1. Si el tipo es transversal (usado por servicios y feature), colócalo en `src/omega-ui-core/types/`
2. Si es una constante de almacenamiento, colócala en `src/omega-ui-core/constants/storage.ts`
3. Si es una utilidad transversal, colócala en `src/omega-ui-core/utils/`
4. Crea un re-export `@deprecated` en la ubicación anterior del feature apuntando a `omega-ui-core`
5. Migra los imports de los consumidores gradualmente hacia `@/omega-ui-core/...`

### Para añadir un servicio

1. Crea el servicio como clase singleton en `src/services/`
2. Impleméntalo con el patrón de los existentes (`observabilityService` es el más simple)
3. Conéctalo desde los hooks si es necesario

### Para modificar el modelo de datos

1. Cambia las interfaces en `src/omega-ui-core/types/manifest.ts`
2. Actualiza `normalizeManifest()` en `src/features/manifest-editor/constants/defaults.ts`
3. Actualiza validadores y resolvers según corresponda
