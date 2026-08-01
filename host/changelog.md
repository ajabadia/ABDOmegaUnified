# 📝 OMEGA Changelog

Este archivo registra todos los cambios significativos, mejoras y correcciones del sintetizador OMEGA.

## [Build #717] - 2026-08-01 — "Migración de comentarios :: a REM dentro de bloques en .bat"

### Refactor
- **Comentarios `::` indentadas migradas a `REM`** en los 2 `.bat` que tenían `::` dentro de bloques parenthesized:
    - `host/scripts/build_plugins.bat` — 7 líneas (L24 Priority 2, L47 Determine Compiler, L54 Determine Output Directory, L60 Compile to WASM, L61 Added -fno-exceptions, L67 Era 7 Extract Contract, L73 AOT Optimization).
    - `host/lint.bat` — 2 líneas (L29, L43 "Added --checks").
- Las cabeceras top-level de sección (`:: OMEGA...`, `:: 1. Check for Clang`, etc.) se conservan como `::` (seguras a nivel top-level).

### Validation
- Evidencia empírica con cmd.exe real (bats mínimos): las `::` dentro de bloques **no fallaron** en casos simples (if/for/goto) — el footgun documentado de `::` es sutil (interacción con `goto` y re-parseo de labels), por lo que la migración es **preventiva/buena práctica**, no un fix de bug observado. `REM` es la forma canónica segura dentro de bloques.
- Escáner `check_bat_parens.mjs`: **0 issues** en el repo completo (15 `.bat`) y sin `::` indentadas restantes en ningún `.bat` real.

## [Build #716] - 2026-08-01 — "Validación del escáner de paréntesis en build_auto.bat"

### Added
- **`host/build_auto.bat` integra `scripts/check_bat_parens.mjs` como paso 0 (fail-fast)**: antes de localizar CMake, verifica que `node` exista y ejecuta el escáner; si algún `.bat` del repo tiene el bug de paréntesis (#714), el build se aborta con `[ERROR] check_bat_parens.mjs detecto parentesis sin escapar...`. Previene regresiones futuras en scripts `.bat`.

### Validation
- Bloque probado end-to-end con cmd.exe real: repo limpio → `[OK] Scripts .bat validados.` exit 0; con un `.bat` roto temporal (`(emsdk)`) → `[ERROR] ... abortando build.` exit 1.
- El bloque insertado pasa el escáner (0 issues) y preserva CRLF.

## [Build #715] - 2026-08-01 — "Auditoría preventiva: paréntesis sin escapar en .bat"

### Audit
- Se revisaron los **15 `.bat` del proyecto** (build_auto.bat, sync_omega_ui.bat, build_plugins.bat, start.bat, start_synth.bat, scripts/build_wasm.bat, web/start.bat, web/omega-audit.bat, web/scripts/*.bat, host/*.bat) buscando el patrón que rompía build_wasm.bat (#714): paréntesis sin escapar dentro de bloques `if (...)`/`for ... do (...)`/`else (` multilínea.
- **Método:** escáner diagnóstico `scripts/check_bat_parens.mjs` — stack de paréntesis consciente de bloques multilínea (ignora regiones `%...%` y escapes `^x`; flaggea cualquier `)` sin escapar dentro de bloque multilínea con contenido sobrante; excluye patrones legítimos `) else (` y `) do (`).
- **Resultado: 0 archivos afectados** — el único infractor era build_wasm.bat (corregido en #714). No se aplicaron fixes preventivos porque no existen otros patrones peligrosos. El escáner se conserva como diagnóstico reutilizable.

### Validation
- Evidencia empírica contra cmd.exe real (5 bats mínimos): `(emsdk).` dentro de bloque → `No se esperaba . en este momento` (fail); `^(emsdk^)` → OK; `%ProgramFiles(x86)%` dentro de bloque `else` → OK (las regiones `%var%` están exentas); paréntesis en `echo` top-level → OK; `for /f ... in (...) do (` dentro de bloque `if` → OK (exit 0).
- El patrón FOR de `build_auto.bat` L18 (`in (...) do (`) queda validado como sintaxis correcta.
- Code review: metodología empírica correcta, conclusión válida (sin fixes que aplicar).

## [Build #714] - 2026-08-01 — "Fix build_wasm.bat: pipeline WASM validado tras la limpieza"

### Fixed
- **`scripts/build_wasm.bat` no se podía ejecutar bajo cmd.exe** — fallaba con `No se esperaba . en este momento` justo tras `[1/4]` (verificación de `em++`). Causa raíz aislada por bisectiva empírica con bats mínimos: **paréntesis sin escapar `(emsdk)` dentro del bloque `if (...)` multilínea** — en cmd.exe el `)` de `(emsdk)` cierra el bloque prematuramente y el `.` sobrante rompe el parser. No era el CRLF ni la redirección `>nul 2>nul`.
- **Fix: escape canónico `^(emsdk^)`** en la línea 18 del script.
- **Finales de línea normalizados a CRLF** (el archivo estaba LF-only — 0 CR / 37 LF), convención correcta para `.bat` en Windows.

### Validation
- **Pipeline WASM validado definitivamente** con emsdk activo (`/c/emsdk`, Emscripten **6.0.4**): `build_wasm.bat` corre completo `[1/4]`→`[4/4]`, **exit 0**.
- Los 3 módulos se recompilaron con la toolchain moderna y quedaron regenerados **hoy (2026-08-01)** con cabecera `\0asm` válida: `midi_in.wasm` **864 B**, `midi_trigger.wasm` **1718 B**, `omega_lab_monitor.wasm` **3837 B** (vs 1630/2610/4981 de la build de mayo — menores por la optimización de Emscripten 6.x, sin errores visibles de SIDE_MODULE).
- `engine/bindings/wasm_compat.h` presente (2143 B) — el `-include` del script resuelve.

## [Build #713] - 2026-08-01 — "Limpieza del espejo muerto engine/src"

### Refactor
- **`engine/src/` eliminado** (87 archivos): era un espejo muerto y divergido de `host/src/Core` + `host/src/Engine` (los `.cpp` de Modular/Modulation/Voice tienen gemelos en `host/src/Engine/*`). No tenía CMakeLists raíz, ni build dir, ni era referenciado desde `host/`. **Backup completo antes de borrar**: `$TEMP/omega_engine_backup_20260801` (90 archivos, 476K).
- **Conservados los 3 archivos que `scripts/build_wasm.bat` necesita**: `engine/include/Core/Ace/OmegaConstants.h`, `engine/include/Core/Ace/OmegaContract.h` (macros de contrato ACE `OMEGA_PARAM`/`OMEGA_PORT`) y `engine/bindings/wasm_compat.h` (compatibilidad Emscripten).

### Validation
- Auto-contención verificada: los 3 headers solo incluyen `<stdint.h>`, headers estándar y `emscripten/emscripten.h` (SDK Emscripten) — **ningún include relativo apunta al `engine/src/` eliminado**, el pipeline WASM no se rompe.
- `build_wasm.bat` validado: resuelve `-I"engine\include"` e `-include "engine\bindings\wasm_compat.h"` (rutas existentes).
- README actualizado: el árbol de 3 cajas ya no lista `src/` y la descripción de `include/` refleja el contenido real (constantes + macros de contrato ACE).
- Code review aprobado.

## [Build #712] - 2026-08-01 — "CMake DRY: single source of truth en args de build"

### Refactor
- **`host/src/Plugin/CMakeLists.txt`**: los argumentos del stage script (`-DUI_SRC`, `-DCORE_SRC`, `-DSTAGE_DIR`, `-DZIP_OUT`, `-P`) se repetían entre el `execute_process` (tiempo de configure — requerido por el chicken-and-egg de `juce_add_binary_data`) y el `add_custom_command` (tiempo de build). Extraídos a una variable de lista única **`OMEGA_UI_STAGE_ARGS`**; ambas invocaciones usan ahora `COMMAND "${CMAKE_COMMAND}" ${OMEGA_UI_STAGE_ARGS}`. Cualquier cambio de rutas/script se hace en un solo punto.
- **`host/src/Tests/CMakeLists.txt`**: dependencias comunes de los 3 targets Catch2 (`omega_core` + `Catch2::Catch2WithMain`) extraídas a **`OMEGA_TEST_COMMON_DEPS`**.
- **`host/src/Core/CMakeLists.txt`**: define compartido `JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1` (usado por `omega_core` y `omega-schema-tool`) extraído a **`OMEGA_JUCE_SETTINGS_DEFINE`**.

### Validation
- Reconfiguración CMake **exit 0** (el staging del zip embebido se regenera en configure sin cambios de comportamiento).
- Code review: expansión de listas correcta en `target_link_libraries`/`execute_process`/`add_custom_command`, defines PRIVATE preservados, sin colisiones de scope ni problemas de orden.

## [Build #711] - 2026-08-01 — "Self-Contained: UI embebida en el exe"

### Added
- **UI embebida en el standalone (Fase 6.1)**: el exe ya no lee la interfaz de una ruta de disco obsoleta (`d:\\desarrollos\\ABDOmega\\ui`). Ahora los archivos runtime se **embeben dentro del binario**:
    - **`host/src/Plugin/ui_stage.cmake`** (nuevo): etapa `index.html`, `bundle.js`, `css/` (incluidas las imágenes co-locadas `oak_wood.jpg`, `power_bus.png`, `rail_*.png`), `assets/`, los CSS de `omega-ui-core` y los 9 fonts referenciados → empaqueta un ZIP (**87 entradas, 1.83 MB**).
    - **`host/src/Plugin/CMakeLists.txt`**: `add_custom_command` regenera el zip ante cualquier cambio de UI (GLOB `CONFIGURE_DEPENDS`) + `juce_add_binary_data(omega_ui_embedded NAMESPACE UiData)`.
    - **`host/src/UI/Editor/OmegaWebViewComponent.h`**: el resource provider ahora sirve cada request desde un `juce::ZipFile` sobre los bytes embebidos (`getEmbeddedUiZip`, lazy static, con mutex estático por el multithreading de WebView2 y lookup case-insensitive `getEntry(path, true)`), con `getWebMimeType` ampliado (html/js/css/json/png/svg/jpg/woff2/ttf).
    - El enfoque es el **mismo `juce_add_binary_data` de los proyectos ABD clásicos** (imágenes como binarios dentro del exe) — solo que empaquetadas en un zip único en vez de un símbolo por imagen, por ser el patrón recomendado por JUCE para `WebBrowserComponent`.

### Fixed
- **Ruta hardcodeada eliminada**: `OmegaWebViewComponent.h` apuntaba a `d:\\desarrollos\\ABDOmega\\ui` (no existe).
- Bugs de build resueltos: comillas internas en `-D` de CMake → argumento entero entre comillas; `file(COPY)` fallaba con `..` en los paths en Windows → `REALPATH` canónico en `ui_stage.cmake`; `../ui` resolvía a `src/UI` (código C++) por case-insensitivity de Windows → `../../ui`.
- **Link fix**: el include de `UiData.h` movido a scope global (los símbolos viven en `::UiData`); dentro de `Omega::UI` habría roto el enlazado.

### Validation
- Build Release **exit 0** — `OMEGA Synth.exe` regenerado con `omega_ui_embedded.lib` embebido.
- Smoke test runtime: el standalone **arranca y se mantiene vivo** (~149 MB, sin crash) con la UI servida desde memoria.
- Cobertura del zip verificada: fuentes absolutas (`/fonts/...`) e imágenes `./*.jpg` co-locadas en `css/` resuelven correctamente.
- Revisión: 4 rondas de code review (mutex, case-insensitive, include scope, rutas CMake) — sin issues pendientes.

## [Build #710] - 2026-07-31 — "Aseptic Refactoring: Fase 6 — Bundle Regenerado"

### Refactor (Plan de refactorización de archivos grandes — `REFACTORING_PLAN.md`)
- **Fases 1-3 completadas**: `module_renderer.ts` dividido en 7 módulos bajo `Renderers/` (templates, ValueFormatters, TelemetrySync, Visualizers, ControlUIUpdater, FontInjector + orquestador); `module_manager.ts` reducido a orquestador con `RackRouter`/`ModuleInstantiator`/`ModuleHeaderBuilder` extraídos y ruta legacy (Era 6) eliminada; `ModulePatchbayMatrix.ts` dividido en `patchbay/matrixLayout`, `matrixTemplates`, `matrixEvents`.
- **Fase 6 — `host/ui/bundle.js` regenerado** desde las fuentes TS refactorizadas (esbuild, mismo comando de `build_auto.bat`):
    - **Tamaño real: 180.7 KB / 4.610 líneas** (desde **213 KB / 5.170** — ~32 KB menos).
    - Eliminado código muerto del bundle: `renderModuleItem`, `renderContractError`, `getCanonicalId` → **0 coincidencias**.
    - Ya no referencia `module_renderer.ts` (archivo eliminado en Fase 1) e incluye todos los módulos nuevos del refactor.

### Fixed
- **`OMEGA_BUILD_ID` horneado correctamente**: `build_auto.bat` L62 usaba `--define:OMEGA_BUILD_ID="%build_no%"` (identificador libre), que esbuild **no** aplica a property accesses como `window.OMEGA_BUILD_ID` — el bundle caía siempre en `"DEV"`. Corregido a ruta con puntos `--define:window.OMEGA_BUILD_ID=\"%build_no%\"`: esbuild reemplaza el access y ahora el bundle contiene `const buildId = "710";` (verificado: 0 refs a `window.OMEGA_BUILD_ID`, 0 fallback `|| "DEV"`).

### Added
- **Smoke test de aridad** (`host/ui/tests/bundle-arity.smoke.test.ts`): carga el **bundle real** en jsdom y verifica end-to-end que `ModuleRenderer(content, options)` se instancia vía detección `Factory.length <= 2` (discriminador DOM: `.module-panel` dentro de `.module-content`). **4/4 tests**.
- **Tests Catch2 para funciones puras C++** (Fase 5): `AceManifestParser` (18), `AceContractExporter` (7), `RpcPresetController`/`valueTreeToVar` (6) — **31 tests verdes** en build Release.

### Validation
- `npx tsc --noEmit` exit 0 · vitest **6/6 files, 143/143 tests** · smoke test aridad **4/4** · tests Catch2 C++ **31/31**.

## [Build #421] - 2026-04-11
### OMEGA Era 5.2 - Radical Aseptic Consolidation

**Added:**
- **Control Cells Architecture**: Vertical stacking of attachments (LEDs, Displays) and main components across Rack and Modal.
- **Premium Telemetry**: High-fidelity 60Hz UI updates with filament-like LED decay effect for organic visual feedback.
- **Living YAML**: Persistence of dynamic HP scaling via `updateManifestHP` RPC call, allowing manifests to self-regulate.
- **Hybrid Displays**: Automatic context-based label/value formatting (e.g., "OMNI", "CH 01") in cell displays.

**Fixed:**
- **The Great Purge**: Removed all legacy Era 4 routing, jack fallbacks, and hardcoded logic from the UI engine.
- **Modal Sync**: Unified the visual and technical standard between the Front Rack and the Configuration Modal.
- **Hardcode Purge**: Eliminated remaining hardcoded system references in favor of the role-based YAML registry.

## [2.8.0] - 2026-04-11 (Build 420) - "Aseptic Essence Restoration"
### Added
- **OMEGA Essence Restoration (Phase 32)**:
    - **Technical Configuration Modal**: Re-implemented `isPair` logic for intelligent parameter grouping (e.g., dual-range controls).
    - **Visual Precision**: Restored signal-type badges (CV, MIDI, AUDIO) and `patch-param-row` styles in the Patching Sanctuary.
    - **Dynamic Metadata Discovery**: C++ `AceCatalog` now extracts and serves module descriptions directly from YAML manifests to the WebUI Browser.
- **Aseptic Hardcode Purge**:
    - Purged legacy `addStandardMidiSources` from `SemanticBrokerService.cpp`.
    - Modulation matrix is now 100% dynamic; `MIDI_IN` ports appear only when the module is explicitly loaded in the rack.
### Improved
- **Build System Stabilization**: Resolved WAMR linker errors (`wasm_trap_delete`) through environment sanitization and clean build orchestration.
- **UI Responsiveness**: Optimized `loadMetadata` triggers for zero-latency port updates.

## [2.7.0] - 2026-04-10 (Build 385) - "Semantic Bridge"
### Added
- **Smart Visibility (Semantic Bridge)**: Unified parameter and port discovery in UI.
- **Automatic Routing**: Parameters of type `list`, `number`, and `text` are now automatically routed to the **General** configuration tab.
- **Port Filtering**: Configuration-heavy ports (e.g., `midi_channel`) are promoted to the General tab and hidden from the Patching tab to ensure UI hygiene.
- **Project Governance**: Formalized standard in `docs/OMEGA_Vision.md` and `DOCUMENTACION/OFICIAL/ACE_SPEC_1_0.md`.


## [2.6.0] - 2026-04-09 (Build 363) - "Aseptic Rack Stabilization"
### Added
- **Metadata-Driven Rack Routing (Phase 27)**:
    - Implemented aseptic routing logic in `ModuleManager` that prioritizes manifest metadata over stale preset state.
    - Added global fallback to **Upper Rack** for all unclassified modules.
    - Established hierarchy: **State > Manifest > Semantic Fallback > Global Default (Upper)**.
- **Ultra-Clean UI Aesthetics**:
    - Purged all visual 'jack' (port) icons from the modular renderer for a minimalist professional look.
    - Synchronized `display-unit` selectors for robust horizontal alignment.
### Improved
- **Metadata Propagation**: Resolved a property leak in `resolveDescriptor` that was stripping `rack` and `panelClass` from ACE components.
- **Diagnostics**: Enhanced console logging for real-time routing source identification (`State` vs `Manifest`).
- **Vision Document**: Finalized Section 1.1 in `docs/OMEGA_Vision.md` detailing the rack routing algorithm.

## [2.5.0] - 2026-04-08 (Build 298) - "Patchbay Hub Evolution"
### Added
- **Global Patchbay Hub (Phase 24.F)**:
    - Decoupled the Patchbay Matrix from the physical rack, establishing it as a system-level utility.
    - Implemented a premium **Glassmorphism** aesthetic using `backdrop-filter` and semi-transparent layering.
    - Added a dedicated **[MATRIX]** trigger in the Top Navigation bar and **Edit** menu.
- **Aseptic Rack Guard**:
    - Implemented a structural filter in `ModuleManager` to prevent infrastructure components (Hub) from appearing in the synthesis rack.
- **Dynamic Slot Expansion**:
    - Resolved the "Matrix Full" bug when initializing the first mod slot in an empty matrix.
    - Enabled seamless 0-to-16 slot growth driven by user interaction.

## [2.4.0] - 2026-04-07 (Build 271) - "Aseptic Sync"
### Added
- **Patchbay Dynamic Slot Sync (Phase 24.E)**:
    - Implemented proactive slot-count synchronization in the WebUI. The Patchbay Hub now re-queries the engine limits every time it is toggled, ensuring instant parity with "Edit > Preferences" changes.
    - Added high-fidelity diagnostic logging to `SystemSettingsManager.cpp` to verify parameter persistence and boundary clamping.
- **Engine Traceability**:
    - Centralized `maxPatchbaySlots` verification in the C++ core to prevent desync between on-disk YAML and runtime ValueTree state.
### Improved
- **UI Responsiveness**: Optimized the `toggleWorkspace` flow to prevent stale rendering of the modulation grid.
- **Nomenclature Audit**: Completed 100% purge of legacy "Modulation Matrix" labels in favor of "Patchbay Hub".
### Added
- **Hyper-ACE Super-Modularity (Phase 23)**:
    - **Dynamic Manifest Discovery**: Expanded `AceCatalog` to support directory-based scanning of `.yaml` manifests. Modules are now fully decoupled from the binary core.
    - **Metadata-Driven UI**: Implemented a generic `ModuleRenderer` in the WebUI that interprets `uiLayout` (grid/columns/gap) and `style` metadata directly from the C++ backend.
    - **Juno DCO Manifest**: Migrated the flagship Juno DCO to a standalone manifest (`juno_dco.yaml`), proving the "Super-Modular" vision.
- **Nomenclature Migration**:
    - **Patchbay-Matrix**: Systemic renaming of the "Modulation Matrix" to "Patchbay-Matrix" across all layers (C++, RPC, TypeScript, YAML).
### Improved
- **RPC Protocol Expansion**: Updated `RpcModulationController` and `RpcPresetController` to serve complex UI metadata during component discovery.
- **ValueTree Flattening**: Refactored `RpcPresetController` to correctly handle the new `patchbayMatrix` semantic tag.

## [2.2.1] - 2026-04-06 (Build 270)
### Added
- **Aseptic Rack Identity (Phase 22)**:
    - **Aseptic Normalization**: Purged `OmegaPresetNormalizer` of all hardcoded auxiliary injections. The engine is now 100% data-driven.
    - **Auto-Heal Session State**: Added validation to `PresetService::deserializePreset` to drop corrupted empty states from standalone session restores.
    - **Manual Reset UI**: Added "New Preset" under FILE menu with confirmation prompt and custom naming support.
- **Structural Integrity**:
    - Removed legacy "empty lower rack" alarm from `module_manager.ts`. OMEGA now supports utility-only setups (Matrix + Trigger) without triggering emergency visuals.
### Improved
- **UI/Engine Synchronization**: Optimized `forceRepaint` calls to ensure perfect state parity during boot and manual resets.

## [2.1.0] - 2026-04-06
### Added
- **OMEGA 2.0 Modular Stabilization (Phase 18)**:
    - **Deep Interface Recovery**: Reconciled Core, Engine, and DSP layers with the 2.0 contract.
    - **Automated ACE Catalog Loading**: Implemented `loadFromDirectory` for component catalogs.
    - **State Management Hardening**: Added robust YAML serialization to `PresetService`.
    - **UI Bridge Sync**: Added `forceRepaint` to ensure instant UI/Engine state parity.
### Fixed
- **MSVC Regression Restoration**: Fixed `juce::MemoryBlock` API usage and namespace qualification errors.
- **Master FX Integration**: Sincronized `Delay` DSP with `juce::AudioBuffer` for the master signal path.

## [2.0.0] - 2026-04-02
### Added
- **OMEGA Semantic Era (Phase 17)**:
    - **Aseptic Modular Architecture**: Transitioned to a fully manifest-driven system where modules are self-describing and the engine is zero-coupled from the UI.
    - **Semantic Broker Service**: New central C++ registry that scans active presets to build a real-time inventory of module capabilities and ports.
    - **Module Manifests**: Implemented `ModuleManifest` contract for LFO, OSC, Filter, EG, and MIDI modules, declaring I/O ports and visual telemetry mapping.
    - **Semantic UI Probing**:
        - **Oscilloscope (Universal Probe)**: Dynamic discovery of all visualizable ports; no more hardcoded indices.
        - **MIDI Probe**: Precision monitoring of any MIDI-capable module output or global traffic.
        - **Mod Matrix (Hierarchical)**: Automatic grouping by module instance (e.g., LFO-1, LFO-2) for professional, organized routing.
    - **Governance**: Hardened agent skills (`zero-core-errors`, `documentation-manager`) to enforce the new "Social Contract of Manifests".

### Fixed
- **UI Consistency**: Eliminated "Ghost Modules" from selectors; the WebUI now strictly reflects the active DSP state.
- **Build Integrity (Build #162)**: Resolved redefinition and type conversion errors in the Semantic Broker and RPC controllers.

## [1.9.6] - 2026-04-01
### Added
- **Modulation Matrix 2.0 (Phase 4)**:
    - **32-Slot High-Fidelity Grid**: Expanded modulation routing from 16 to 32 slots with bipolar depth control.
    - **"Via" Secondary Modulation**: Implemented secondary depth modulation (e.g., LFO -> Cutoff controlled by ModWheel).
    - **Real-Time Matrix Compiler**: New graph-based compiler that translates Matrix slots into low-level DSP routes on preset load.
    - **Dynamic Metadata Resolution**: WebUI now fetches available modulation sources and targets dynamically from the engine via RPC.
    - **RpcModulationController**: Dedicated bridge for real-time matrix manipulation without audio interruptions.

## [1.9.5] - 2026-04-01
### Added
- **Modular ADSR Engine (Case 401)**: Implemented sample-accurate ADSR generator with POD-compatible state mapping for high-fidelity voice architecture integration.
- **Dynamic Source Filtering**: Standardized A/B source selectors to strictly display active synthesis/FX modules in the current preset.

### Fixed
- **Oscilloscope Stabilization (Build #142)**:
    - Resolved `ResizeObserver` loop errors by implementsing `requestAnimationFrame` throttled resize logic.
    - Corrected UI rendering regression (compressed line) by enforcing `flex: 1` and a `4:3` aspect ratio on the visualizer container.
    - Restored full modal synchronization with the "Advanced Wave Analyzer" using the existing static HTML definition.

## [1.9.4] - 2026-03-31
### Added
- **WebUI Architecture Hardening (Phase 13.5)**:
    - **Fully Declarative Rendering**: Purged all legacy fallback classes (`ModuleJuno`, `ModuleDelay`, etc.). The WebUI is now 100% data-driven via `module_descriptors.js`.
    - **TypeScript Foundation**: Transitioned core bridge infrastructure (`metadata_store.ts`, `module_renderer.ts`, `module_manager.ts`, `module_descriptors.ts`) to TypeScript with formal interface definitions.
    - **Single Source of Truth (SOT)**: C++ `ParameterMetadataRegistry` is now the absolute authority for UI ranges, labels, and types, served via RPC.
    - **Modular Layout Expansion**: Added universal descriptors for ADSR (EG-STANDARD-001), VCA (VCA-STANDARD-001), LFO (LFO-STANDARD-001) and Korg/Prophecy components.

### Improved
- **Build System Hygiene**: Consolidated build scripts into `build_auto.bat` and cleaned up repo-level `.gitignore` and legacy artifacts.
- **Verification Pipeline**: Established Build #95 as the stable production-ready baseline.

## [1.9.2] - 2026-03-31
### Added
- **Architectural Hardening Milestone (Build #91)**:
    - **Metadata SOT (Single Source of Truth)**: Expanded `ParameterMetadataRegistry` with rich descriptors (`valueType`, `uiControl`, `category`, `options`, `ccNumber`).
    - **Bridge Decomposition**: Refactored monolithic `OmegaUiBridge` into specialized controllers (`RpcPresetController`, `RpcTelemetryController`, `RpcSystemController`, `RpcMetadataController`, `RpcInputController`).
    - **Data-Driven Validation**: Refactored `AceValidator` to be engine-agnostic and driven by catalog families and preset engine metadata.
    - **Oscilloscope Restoration**: Fixed data contract mismatch in the telemetry stream by wrapping history buffers in structured objects (`{ history, latest }`).
    - **Schema Standardization**: Unified parameter naming between ValueTrees and DSP structs (e.g., `hpfPos` -> `hpfPosition`, `vcfKybd` -> `vcfKeyTracking`).

### Fixed
- **Build Regressions**: Resolved `yaml-cpp` include path issues and `juce::var` type conversion ambiguities during RPC refactoring.
- **Telemetry Loop**: Fixed syntax errors in `RpcTelemetryController` history fetch loop.
 
## [1.9.1] - 2026-03-30
### Added
- **Phase 11: Modular Core Stabilization**:
    - Standardized `voiceArch` identifier across C++, YAML and WebUI.
    - Implemented **Recursive Collection Flattening** in `OmegaUiBridge`, ensuring modular racks render correctly.
    - Automated metadata synchronization using `system_settings.yaml`.

## [1.7.0] - 2026-03-30
### Added
- **Smart Focus Diagnostic System (Phase 7)**:
    - Universal "Eye" icons (👁️) across all synthesis and FX modules.
    - Context-aware oscilloscope routing with visual `focus-flash` feedback.
    - Standardized `ModuleJunoBase` toolbar for consistent multi-module interaction patterns.
- **MIDI 2.0 Hybrid Support (Phase 10)**:
    - Integration of JUCE 8 `universal_midi_packets` (UMP) with runtime auto-detection.
    - High-resolution processing for 16-bit velocity and 32-bit controller values.
    - Native fallback to MIDI 1.0 byte-stream adapters for absolute backward compatibility.

### Fixed & Hardened
- **Ghost LFO Suppression**: Eliminated hardcoded 5Hz PWM modulation in `OscillatorPoolJunoDco.h`. PWM is now strictly parameter-driven.
- **DSP Signal Purity**:
    - Implemented hardware-style bypass for the Chorus module when set to "Off" (CPU-efficient).
    - Restricted "Resonance Compensation" to the Juno IR3109 filter model, preventing gain artifacts in other filter types.
- **UI/UX Refinement**:
    - Converted VCF tactical sliders to high-fidelity rotary knobs for a premium aesthetic.
    - Implemented "ON/BYPASS" toggle logic for the Delay module with real-time state sync.

## [1.6.1] - 2026-03-27
### Fixed
- **ValueTree Serialization**: Resolved `std::string` type mismatches in `OmegaPreset` and implemented robust `juce::var` wrapping.
- **Linker Stability**: Fixed unresolved external symbols in `OmegaPreset` (`addLayer`) and `PresetRepository` (`getPresetPath`).
- **DSP Core Synchronization**: Corrected `VirtualAnalogEngine` inheritance from `ISynthesisEngine` and synchronized `renderNextBlock` signatures.
- **Bridge Reliability**: Fixed obsolete member access in `OmegaUiBridge` (migrated `id` to `getUuid()`).

### Improved
- **Configuration Engine**: Centralized `EngineConfig` and `VoiceConfig` structures to prevent redefinition errors and ensure atomic swap safety.
- **Header Integrity**: Standardized includes and guards across `omega_core` and `omega_dsp`.

## [1.6.0] - 2026-03-26
### Added
- **VA/ACE MVP 0.1 Milestone**:
    - **Atomic Snapshot Engine**: Implementation of `EngineConfig` and atomic swap mechanism for sample-accurate, lock-free preset switching.
    - **Flagship Presets**: Created `Juno_Pad.yaml`, `MS20_Bass.yaml`, and `Hybrid_Pad.yaml` using high-fidelity ACE components.
    - **Korg MS-20 Fidelity**: Added `OSC-VA-002` (VCO) to the ACE catalog.
- **Unified Validation Layer**:
    - `AceValidator` fully migrated to `juce::ValueTree` API for robust preset repair and fallback handling.

### Improved
- **Architectural Decoupling**: Segregated `EngineTypes.h` and `EngineConfig.h` to eliminate circular dependencies between the service and DSP layers.

## [1.5.0] - 2026-03-26
### Added
- **PerformanceMonitor Utility**: Lightweight, lock-free profiling for the audio thread using atomics and high-resolution ticks.
- **Service Layer Specification**: New official documentation in `DOCUMENTACION/OFICIAL/service_layer_spec.md`.
- **Instrumentation**: Benchmarking hooks in `VirtualAnalogEngine` and `ModulationRuntime` for real-time latency tracking.

### Improved
- **Architectural Decoupling (2-Week Surgical Plan)**:
    - **EngineConfigManager**: Centralized engine configuration and parameter mapping facade.
    - **PresetService**: Orchestrated preset lifecycle management, separating file I/O from the synthesis core.
    - **OmegaAudioProcessor Refactor**: Reduced plugin wrapper complexity by ~40% through service delegation.
- **Real-Time Safety & Performance**:
    - **Lock-Free Input**: `OmegaInput` now uses fixed-size event buffers, eliminating heap allocations in the process block.
    - **ValueTree Serialization**: `OmegaUiBridge` refactored to use the new `ValueTree`-based `OmegaPreset` API, ensuring consistent state across the stack.

## [1.4.1] - 2026-03-26

## [1.4.0] - 2026-03-24
### Added
- **Dual-Rack Modular Architecture (Phase 8)**:
    - Rediseño de la WebUI a un sistema de doble rack (Superior: utilidades, Inferior: síntesis).
    - Módulos auto-inyectables con estética estandarizada y acentos neón.
    - Área de trabajo expandida a **1600x750px** para visualización multimodular sin scroll.
- **MIDI Trigger Module (Phase 9)**:
    - Nuevo componente interactivo para disparo de notas MIDI desde la UI (Nota/Octava/Push).
    - Implementada cola MIDI thread-safe en el motor DSP para inyección síncrona en el `processBlock`.
- **Generic Modulation Telemetry**:
    - Implementación de `ModuleOscilloscope` basado en Canvas con soporte para polling dinámico vía RPC.
    - Soporte para visualización en tiempo real de LFOs y señales de control internas.

## [1.3.0] - 2026-03-24
### Added
- **Universal Metadata Architecture (Phase 6)**:
    - Implementación de `ParameterMetadataRegistry` en C++ como única fuente de verdad para descriptores de parámetros.
    - Nuevo handler RPC `getMetadata` para servir rangos, unidades y nombres dinámicamente a la WebUI.
    - Refactor de `OmegaAudioProcessor` y `Midi1InputAdapter` para consumir el registro centralizado.
- **Dynamic WebUI Configuration**:
    - Los módulos `ModuleJuno`, `ModuleJP`, `ModuleKorg` y `ModuleSpaceEcho` ahora son auto-configurables.
    - Inyección automática de límites (`min`, `max`, `step`) y etiquetas desde los metadatos del motor.
- **System Stability (Build #33)**:
    - Unificación de namespaces a `Omega`.
    - Resolución de conflictos en el bridge relacionados con `juce::Identifier` y `std::string`.
    - Garantizada la seguridad lock-free en el acceso a metadatos durante el processBlock.

## [1.2.1] - 2026-03-24
### Added
- **Visual Diagnostic Console**:
    - Primera línea de consola con **Build #** y **Timestamp** real del ejecutable.
    - Mapeo visual de **Bridge Keys** para depuración de funciones nativas expuestas.
    - Registro de **RAW Response** antes del procesamiento de JS.
- **Bridge Resilience (Mock Fallback)**:
    - Implementado sistema de **Mocks** en `omega_rpc.js` que se activa automáticamente si el puente devuelve `undefined`.
    - Garantizado que la UI de presets y estado inicial sea funcional incluso sin conexión estable con el motor.
- **RPC v2 Protocol**:
    - Implementación refinada con soporte para detección de puente y logs extendidos.

## [1.2.0] - 2026-03-24
### Added
- **JUCE 8 Bridge Modernization**:
    - Migración total de `evaluateJavascript` a **Native Functions with Completion Handlers** (Promises).
    - Eliminado el polling de callbacks; comunicación bidireccional instantánea y asíncrona.
- **Premium UI Enhancements**:
    - **Splash Screen Stabilization**: Introducida duración mínima de 3 segundos con fade-out al finalizar la sincronización del bridge.
    - **Top Menu Bar**: Estructura profesional con menús **FILE**, **EDIT** y **HELP**.
    - **About Modal**: Ventana informativa con estética "glassmorphism", créditos y metadata del sintetizador.
    - **Full Modular Rack**: El rack ahora carga por defecto el sintetizador completo (DCO, VCF, JP Filter, Korg VCF y Space Echo).
- **Git-for-Sounds (Sprint 6)**:
    - Integración de `Core::Preset::PresetRepository` en el `OmegaAudioProcessor`.
    - Sistema de versionado con **Snapshots**, **History** y **Checkout** funcional vía RPC.
    - Soporte para creación de ramas (Branching) y persistencia en formato YAML.
- **Integrated Preset Browser**:
    - Nuevo panel lateral en la WebUI para navegación de archivos de preset (`.yaml`).
    - Visualización dinámica de la línea de tiempo de versiones (History) para cada sonido.
    - Interfaz reactiva para guardar capturas (Snapshots) con autor y descripción.
- **System Stability**:
    - Handler de **Exit** robusto ejecutado en el **Message Thread** para cierre limpio de la aplicación Standalone.
    - Consola de debug conmutable (Show/Hide) integrada en el menú Help.

## [1.1.1] - 2026-03-22
### Added
- **OmegaUiBridge Refinement**:
    - Implementación completa del protocolo **JSON-RPC v1** para comunicación High-Fidelity.
    - Handlers robustos para `getState`, `setParam`, `listAceComponents`, `loadPreset` y `savePreset`.
    - Arquitectura desacoplada mediante **Callbacks** para la carga de presets en el `OmegaAudioProcessor`.
    - Sistema de notificaciones asíncronas para cambios de parámetros desde el motor DSP.
- **MS-20 ESP (External Signal Processor)**: Implementación completa con filtros Bandpass, Pitch Tracker y Envelope Follower.
- **MS-20 High-Fidelity**:
    - Envolvente **ENV1** con fases especializadas de **Delay** y **Hold**.
    - **Ring Modulation** entre VCO1 y VCO2.
    - **PWM Modulable** para el oscilador base.
- **Prophecy MOSS Part 2 (Z1 Territory)**: 
    - Modelos físicos de viento (**Brass/Reed**) refinados con no-linealidades cúbicas.
    - Nuevo oscilador **Noise + Resonant Comb** (`OSC-PM-009`) para texturas industriales.
    - Modelado físico de **Electric Piano** (`OSC-EP-001`) y **Organ** (`OSC-OR-001`).
    - **Multi-table Waveshapers** y **Variable Phase Modulation (VPM)**.
    - **Resonant Filter Bank** de 6 picos y **Envolventes Multi-etapa** de 5 niveles.
    - **Arpeggiador Prophecy** programable y **LFOs especializados** (Random Smooth/Step).
- **JP-8080 Elite Suite**:
    - **Feedback Oscillator** (`OSC-PM-010`): Sierra con realimentación de fase controlada por peine.
    - **Cross-Modulation (X-MOD)**: Ruteo de audio-rate entre osciladores para FM exponencial.
    - **JP-Formant Filter**: Modulador vocal basado en el banco de filtros del JP-8080.
    - **Motion Control**: Sistema de grabación y reproducción de gestos de parámetros a audio-rate.
- **Expression & Mapping**: Integración de **Vector Control** (X/Y) y **Ribbon** en el sistema de macros `ProphecyMacroContext`.
- **Space Echo RE-201 (FX-DL-002)**: Emulación de alta fidelidad con 3 cabezales de cinta (ratios 1.0 : 1.9 : 2.9), saturación magnética y spring reverb tank.

## [1.1.0] - 2026-03-20
### Improved
- **Modular Envelopes (Case 401)**: Dynamic, sample-accurate ADSR state management integrated into the voice signal path.
- **Build System**: Stabilized via `build_auto.bat` (CMake/Ninja) with automatic build tracking (**Build #142**).
- **Decoupling**: Reducción de la dependencia de JUCE en `omega_core`.

## [1.0.0] - 2026-03-18
### Added
- **Juno Engine**: Implementación fiel de DCO (con drift y timer jitter) y filtro IR3109.
- **JP-808X Family**: Supersaw optimizada y filtro JP.
- **Modulation Graph**: Sistema de ruteo de audio-rate basado en grafos (Toposort).
- **ACE Registry**: Catálogo modular de componentes emulados.
- **OmegaPreset**: Sistema de serialización YAML robusto.

---
*Mantenido automáticamente por el `documentation-manager` skill.*
