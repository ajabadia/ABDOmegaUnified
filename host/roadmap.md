# OMEGA Era 6 UI Industrialization Roadmap

## Current Objective: Transition from "Patch-based" to "Architectural" Resiliency
Establish a robust, strictly-typed, and centralized UI framework that aligns with the "Aseptic" principles of OMEGA Build #500+.

---

## ✅ Refactoring Plan — Estado (2026-07-31)

> Progreso del plan de refactorización de archivos grandes (`REFACTORING_PLAN.md` en la raíz del proyecto).

| Fase | Estado | Resumen |
|---|---|---|
| 1 — `module_renderer.ts` | ✅ | Dividido en 7 módulos bajo `ui/src/Renderers/` (templates, ValueFormatters, TelemetrySync, Visualizers, ControlUIUpdater, FontInjector) |
| 2 — `module_manager.ts` | ✅ | Orquestador + `RackRouter`/`ModuleInstantiator`/`ModuleHeaderBuilder`; ruta legacy Era 6 eliminada |
| 3 — `ModulePatchbayMatrix.ts` | ✅ | Dividido en `ui/src/Components/patchbay/` (matrixLayout, matrixTemplates, matrixEvents) |
| 4 — Archivos grandes del editor web | ⬜ | Pendiente (extracción de helpers en `web/src/features/manifest-editor`) |
| 5 — Funciones puras C++ | ✅ | Tests Catch2 creados (`src/Tests/`): AceManifestParser (18), AceContractExporter (7), RpcPresetController (6) — 31/31 verdes |
| 6 — `bundle.js` regenerado | ✅ | **180.7 KB / 4.610 líneas** (desde 213 KB / 5.170); código muerto eliminado; `OMEGA_BUILD_ID` ahora se hornea (`--define:window.OMEGA_BUILD_ID` en `build_auto.bat` L62) |

---

## Phase 1: Structural Integrity (High Priority)

- [x] **Centralized Schema Normalization**: Move manifest synthesis (layout/items generation) to `SchemaStore.ts`.

- [x] **Formal Module Registry**: Implement `ui/ModuleRegistry.ts` to manage module class mapping.

### 1.3 Strict Typing Enforcement
- **Goal**: Achieve zero-lint/zero-error status in `ui/` directory.
- **Action**: Replace `any` and `@ts-ignore` with formal interfaces (`ModuleDescriptor`, `ModuleOptions`, `ModuleInstance`).

---

## Phase 2: Flow & Persistence Stabilization

### 2.1 Instance Identity Alignment [x]
- **Goal**: Standardize the use of `instanceId` (e.g., `osc_va_1`) across all UI layers.
- **Action**: Ensure `setParameter` always targets the unique instance path and the `RuntimeStore` correctly routes updates back.
- **Status**: Completed. Contract violations in `ModuleRenderer` and `script.js` resolved.

### 2.2 Telemetry Pipeline Hardening [x]
- **Goal**: Formalize automated telemetry pin subscription when a module is rendered.
- **Action**: Map `items` with `look: 'led' | 'meter'` directly to `subscribeTelemetry` calls.
- **Status**: Completed. `ModuleRenderer` now auto-subscribes during `init()`.

### 2.3 Delayed Refresh Issue [x]
- **Goal**: Resolve UI lag/missing modules when adding via browser.
- **Action**: 
    - Implement a render queue in `ModuleManager.ts` to prevent dropped state updates.
    - Consolidate `SchemaStore` to ensure latest contracts are always available.
- **Status**: Completed. UI now reactively catches up with backend state bursts.

---

## Phase 3: Industrial Features (Backlog)

- [x] **Selective Removal**: Implementation of module deletion from the rack via UI context menus.
- [x] **Rack Reordering**: Move modules left/right via the "RACK" tab in the Module Config modal.
- [x] **Visual Theme Persistence**: Save and restore theme overrides per module instance.

## [x] **Phase 4: OMEGA Manifest Designer (Editor)**
    - [x] Refactor existing editor to use SchemaStore.
    - [x] Enforce Era 6.3 validation.
    - [x] Add support for `disabled` and `readOnly` fields in the UI preview.
    - [x] Standardize normative families and roles.

### 4.1 Schema-Driven Form Generation
- **Goal**: Create a web-based (React/TS) tool to edit `.yaml` manifests.
- **Action**: Use `module-schema-6.json` as the source of truth for all fields and validations.

### 4.2 System Awareness & Intelligence
- **Goal**: Implement specialized handling for `system.*` pins.
- **Action**: 
    - Add IntelliSense for normative pins.
    - Enforce read-only status for "Host Injected" roles.
    - Flag legacy fields (`engine`, `direction`, `hp`) for migration to Era 6.3.

### 4.3 Direct Repo Integration [x]
- **Goal**: Allow the editor to scan `Resources/modules` and validate all manifests in bulk.
- **Action**:
    - [x] Implement File System Access API for directory scanning (via `scanRepo` IPC).
    - [x] Add "Repo Health" dashboard to the editor (`RepoDashboard.tsx`).
- **IMPORTANT**: Review [visión editor de manifiestos.md](file:///d:/desarrollos/ABDOmega/DOCUMENTACION/visi%C3%B3n%20editor%20de%20manifiestos.md#L14133) (VEM-1612) for detailed System Awareness specs.

---
## [x] **Phase 5: WASM Bridge Hardening**

### 5.1 System Pin Mapping for WASM [x]
- **Goal**: Allow WASM modules to access `system.audio.*` buffers natively.
- **Action**:
    - [x] Implement `omega_get_system_buffer` host import in `WasmHostInterface.cpp`.
    - [x] Update `WasmModuleService` to bind these imports to the global bus pool.

### 5.2 WASM Registry Sync [x]
- **Goal**: Automate registry generation for WASM modules via export scanning.
- **Action**:
    - [x] Integrate `wasm-objdump` or similar logic into the `WasmHeartbeat` component (Implemented via `handleAsepticHealing` upgrade).

---
## Phase 6: Era 7 Industrialization (In Progress)

### 6.1 PatchDocument & RuntimeCompiler (C++) [x]
- **Goal**: Establish the "Source of Truth" (SOT) and binary pipeline.
- **Action**:
    - [x] Implement `PatchDocument` as the unified state container.
    - [x] Create `RuntimeCompiler` for atomic, lock-free engine snapshots.
    - [x] Deploy `RuntimeStore` (reborn `EngineConfigManager`) for state arbitration.

### 6.2 Numeric Authority & Handshake (UI/RPC) [/]
- **Goal**: Eliminate "Bridge not ready" errors and string-lookup overhead.
- **Action**:
    - [x] Implement **Era 7 Handshake** (`ensureReady`) in `omega_rpc.ts`.
    - [x] Export canonical IDs to TypeScript (`schema_ids.ts`).
    - [/] Migrate all UI modules to the numeric `instanceId` + `paramId` contract.

### 6.3 Era 7 Manifest Designer Evolution
- **Goal**: Transform the editor into a synthesis IDE.
- **Action**:
    - [ ] Implement **Numeric Authority Linter**: Predict and display `ParamId` and `PortId`.
    - [ ] Add **Dry-run Compilation**: Simulate Era 7 snapshots directly in the editor workbench.
    - [ ] Automate **Contract Export**: Export `PatchIdentifiers.h` and `schema_ids.ts` on manifest save.

---

## Phase 7: Visual Parity — `omega-ui-core` (Pending)

> **Diagnóstico**: OMEGA tiene un sistema de diseño CSS excelente (`controls.css`, `themes/industrial/*.css`, `skins.css`, `vars.css`) que **nadie consume correctamente**. `ModuleRenderer.ts` renderiza con `innerHTML` y estilos inline. El editor de ABDSynthsWeb renderiza con Tailwind inline. Ambos ignoran las clases CSS preparadas.

### 7.0 Decisiones Estratégicas

| Decisión | Resolución |
|---|---|
| **Fuente de verdad visual** | **ABDSynthsWeb** (editor). Tiene hot-reload para iterar en segundos. Los cambios estéticos siempre empiezan ahí. |
| **Formato del paquete compartido** | Directorio `omega-ui-core/` con CSS puro + tokens. Cero lógica JS/TS. |
| **Mecanismo de sincronización** | Script `sync_omega_ui.bat` (robocopy). Integrado en `build_auto.bat`. |
| **Controles PNG legacy** | Se mantienen en OMEGA como fallback (botones, switches). No van a `omega-ui-core`. |
| **Display variants (OLED/LCD/LED)** | Se portan al paquete compartido. Son profesionales y el editor debería usarlos. |
| **¿Refactorizar `ModuleRenderer` a React?** | No. Es vanilla TS dentro de WebView JUCE. Pero debe usar clases CSS semánticas en vez de inline styles. |

### 7.1 Crear `omega-ui-core/` — Paquete CSS Compartido
- **Goal**: Una única fuente de verdad para todos los estilos visuales de módulos.
- **Ubicación canónica**: `ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/`
- **Copia en OMEGA**: `ABDOmega/ui/omega-ui-core/` (vía sync script)
- **Contenido**:
    ```
    omega-ui-core/
    ├── index.css              # Entry point (@import de todo)
    ├── tokens.css             # --wb-*, --signal-*, --omega-*
    ├── skins.css              # .skin-industrial, .skin-carbon, .skin-glass, .skin-minimal
    ├── containers.css         # .layout-container, .container-label-pill, variantes
    ├── screws.css             # .module-screw + pseudo-elementos
    ├── tabs.css               # .module-tabs, .tab-btn
    ├── effects.css            # .cyan-bloom, .orange-bloom, CRT
    ├── primitives/
    │   ├── knobs.css          # .knob-container.size-{A|B|C|D}.color-{cyan|red|...}
    │   ├── sliders.css        # .slider-wrapper.slider-{v|h}.size-*.color-*
    │   ├── leds.css           # .led.size-*.color-*
    │   ├── ports.css          # .port-socket, .port-inner, .port-led
    │   ├── displays.css       # .mini-display.variant-{A|B|C} (OLED/LCD/LED)
    │   ├── switches.css       # .switch-container (nuevo, portado de Switch.tsx)
    │   ├── steppers.css       # .stepper-btn + variantes push/button
    │   ├── selects.css        # .industrial-select-wrapper
    │   └── labels.css         # .cell-label
    └── SPEC.md                # Contrato formal de clases CSS
    ```
- **Action**:
    - [ ] Extraer tokens de `vars.css` → `omega-ui-core/tokens.css`
    - [ ] Mover skins de `skins.css` → `omega-ui-core/skins.css`
    - [ ] Consolidar `themes/industrial/*.css` → `omega-ui-core/primitives/` (sin prefijo `.theme-industrial`)
    - [ ] Crear `containers.css`, `screws.css`, `tabs.css` desde las definiciones inline actuales
    - [ ] Escribir `SPEC.md` con el contrato de clases

### 7.2 Visual Parity Contract
- **Goal**: Documento formal que liste cada primitiva con sus variantes y las clases CSS canónicas.
- **Contrato de clases**:
    ```
    KNOB:      .knob-container.size-{A|B|C|D}.color-{cyan|red|orange|green|white}
                └── .knob-cap
                └── .knob-marker

    SLIDER:    .slider-wrapper.slider-{v|h}.size-{A|B|C|D}.color-{cyan|red|...}
                └── .slider-rail-active
                └── .slider-cap

    LED:       .led.size-{A|B|C|D}.color-{cyan|red|orange|green|white}

    PORT:      .port-socket.size-{A|B|C|D}
                └── .port-inner
                    └── .port-led

    DISPLAY:   .mini-display.variant-{A|B|C}
                └── .display-btn.minus
                └── .display-value
                └── .display-btn.plus

    SWITCH:    .switch-container.size-{A|B|C|D}.color-{...}

    SCREW:     .module-screw.{top-left|top-right|bottom-left|bottom-right}

    SKIN:      .skin-{industrial|carbon|glass|minimal}
    CONTAINER: .layout-container.variant-{inset|header|panel|section|minimal}
                └── .container-label-pill
    ```
- **Action**:
    - [ ] Crear `SPEC.md` con tablas de primitiva × variante × clase CSS
    - [ ] Validar que ambos renderers generan el DOM esperado

### 7.3 Refactorizar `ModuleRenderer.ts` (ABDOmega)
- **Goal**: Que el renderer use clases de `omega-ui-core` en vez de inline styles.
- **Action**:
    - [ ] `renderKnob()` → emitir `class="knob-container size-B color-cyan"`, sin `style="..."`
    - [ ] `renderSlider()` → emitir `class="slider-wrapper slider-v size-B color-cyan"`
    - [ ] `renderLed()` → emitir `class="led size-B color-cyan"`, solo `style` para opacity dinámica
    - [ ] `renderPort()` → emitir `class="port-socket size-B"` + `class="port-inner"` + `class="port-led"`
    - [ ] Screws → de inline a `class="module-screw top-left"`
    - [ ] Containers → de inline variant styles a `class="layout-container variant-inset"`
    - [ ] Actualizar `index.html` para importar `omega-ui-core/index.css`

### 7.4 Refactorizar Primitivas TSX (ABDSynthsWeb)
> **NOTA**: Estos cambios se ejecutan en ABDSynthsWeb.
- **Goal**: Que las primitivas React emitan las mismas clases CSS que `ModuleRenderer.ts`.
- **Action**:
    - [ ] `Knob.tsx` → `className="knob-container size-B color-cyan"` en vez de Tailwind inline
    - [ ] `Slider.tsx` → `className="slider-wrapper slider-v size-B color-cyan"`
    - [ ] `Led.tsx` → `className="led size-B color-cyan"` + `style` solo para opacity
    - [ ] `Port.tsx` → `className="port-socket size-B"` + subelementos con clases
    - [ ] `Display.tsx` → `className="mini-display variant-A"`
    - [ ] `Switch.tsx` → `className="switch-container size-B color-cyan"`
    - [ ] `Select.tsx` → `className="industrial-select-wrapper"`
    - [ ] `RackScrews.tsx` → `className="module-screw top-left"`
    - [ ] `RackContainer.tsx` → mover `getVariantStyles()` a `containers.css`
    - [ ] `VirtualRack.tsx` → mover `getSkinConfig()` inline styles a `skins.css`
    - [ ] `globals.css` → eliminar skins/tokens duplicados, importar `omega-ui-core/index.css`

### 7.5 Script de Sincronización
- **Dirección**: Estrictamente **unidireccional** (ABDSynthsWeb → ABDOmega). Nunca al revés.
- **Salvaguarda**: El script debe inyectar en cada archivo copiado un header:
    ```css
    /* ═══════════════════════════════════════════════════════════════
       DO NOT EDIT — Synced from ABDSynthsWeb/omega-ui-core
       Any changes here will be OVERWRITTEN by sync_omega_ui.bat
       Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
       ═══════════════════════════════════════════════════════════════ */
    ```
- **Action**:
    - [x] Crear `sync_omega_ui.bat` en ABDOmega (robocopy + header injection)
    - [ ] Integrar llamada al inicio de `build_auto.bat`
- **Ref**: El VPC (`docs/VISUAL_PARITY_CONTRACT.md`) cubre la fase 7.2. Se moverá a `omega-ui-core/SPEC.md` al crear el paquete.

---

## Phase 8: Attachment Rendering Parity (Pending)

> Ambos renderers soportan attachments (labels, leds, displays posicionados relativamente a un control principal). Pero usan rutas de código completamente distintas y reglas de posicionamiento incompatibles.

### 8.1 Unificar Reglas de Posicionamiento
- **Goal**: Que un attachment `{ position: "top", offsetX: 5 }` produzca el mismo resultado visual en ambos motores.
- **Action**:
    - [ ] Documentar en `SPEC.md` las reglas de posicionamiento (top/bottom/left/right + offsets)
    - [ ] Crear `omega-ui-core/attachments.css` con las clases `.attachment-stack.stack-{top|bottom|left|right}`
    - [ ] Verificar que `renderAttachmentGroup()` (OMEGA) y el sistema de `attachments` de `RackEntity.tsx` producen el mismo layout

### 8.2 Test de Paridad Visual
- **Goal**: Validar visualmente que un `.acemm` se ve igual en ambos motores.
- **Action**:
    - [ ] Crear un manifiesto de referencia (`test_parity.acemm`) con todas las primitivas y variantes
    - [ ] Capturar screenshots de ambos motores lado a lado
    - [ ] Documentar discrepancias y resolverlas

---

*Last Updated: 2026-07-31 — Refactoring Plan Fases 1-3, 5, 6 completadas; bundle regenerado (180.7 KB). Phase 7 (omega-ui-core) & Phase 8 (Attachment Parity) added. Era 7.2.3 Visual Unification Cycle.*
