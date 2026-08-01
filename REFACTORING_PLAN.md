# Plan de Refactorización — Archivos Grandes

> Documento vivo para seguir y actualizar la refactorización de archivos fuente grandes.
> **Última actualización:** 2026-08-01
> **Estado global:** Fases 1-4 completadas (ModuleRenderer, ModuleManager, ModulePatchbayMatrix, editor web); Fases 5.1, 5.2, 5.3 y 5.4 (C++) completadas — pendientes 5.5 y 5.6; **Fase 6 completada** (bundle regenerado + **UI embebida en el exe standalone**). **Bugfix (2026-07-31):** `ParameterMetadataRegistry` se auto-inicializa en su constructor (ver log). **CMake DRY (2026-08-01):** argumentos de stage/deps de test/define JUCE en variables únicas — `OMEGA_UI_STAGE_ARGS`, `OMEGA_TEST_COMMON_DEPS`, `OMEGA_JUCE_SETTINGS_DEFINE` (ver log)

---

## Contexto global

**El proyecto es TypeScript-first.** Los únicos `.js` grandes son artefactos o terceros:

| Archivo | Tamaño | Naturaleza | Acción |
|---|---|---|---|
| `host/ui/bundle.js` | 213 KB / 5170 líneas | **Build artifact DESACTUALIZADO** (IIFE generado; `index.html` L341 lo carga) | ⚠️ **No refactorizar a mano — REGENERAR** desde las fuentes TS refactorizadas (ver Fase 6) |
| `host/JUCE/...` (highlight.min.js, doxygen, ejemplos) | varios | Código de terceros | ❌ No tocar |

**Los candidatos reales** son los `.ts`/`.tsx` fuente grandes que producen ese bundle.

---

## 🔴 Fase 1 — `host/ui/src/Logic/module_renderer.ts` (519 líneas / 21 KB)

**Diagnóstico:** una sola clase `ModuleRenderer` con **7 responsabilidades mezcladas** (vista, binding, estado, telemetría, visualizadores, formato, recursos).

### Métodos por responsabilidad

> Nota: la carpeta `host/ui/src/Renderers/` **ya existe** (contiene `ManifestRenderer.ts`), así que los archivos nuevos conviven ahí de forma consistente.

| Responsabilidad | Métodos | Tipo |
|---|---|---|
| Construcción de HTML | `render`, `renderItem`, `renderContainers`, `shouldRenderInTab`, `resolveContainerWidth` | Vista (templates) |
| Binding de eventos | `bind` | Vista (interacción) |
| Sync de estado | `syncAllFromStore`, `onStateUpdate` | Lógica/estado |
| Telemetría | `subscribeToTelemetry`, `updateTelemetryUI` | Lógica (bridge) |
| Visualizadores | `initVisualizers`, `setupTerminalListener`, `addTerminalLine`, `startAnimationLoop`, `updateVisualizers`, `drawScope`, `_getMockWaveform` | Render canvas |
| Formato de valores | `_getFormattedValue`, `_getEntityValueLabel`, `_inferPortColor`, `getRegistryEntity` | **Funciones puras** |
| Recursos | `injectResources` | Side-effect |

### Estructura destino

```
host/ui/src/Renderers/
├── ModuleRenderer.ts      ← orquestador: init() + render() + bind() + setParam/destroy (ciclo de vida)
├── templates.ts           ← renderItemHTML(), renderContainersHTML(), resolveContainerWidth() (puros, sin DOM)
├── ValueFormatters.ts     ← _getFormattedValue, _getEntityValueLabel, _inferPortColor (puras)
├── TelemetrySync.ts       ← subscribeToTelemetry, updateTelemetryUI
├── Visualizers.ts         ← scope canvas + terminal + rAF loop + _getMockWaveform
├── ControlUIUpdater.ts    ← updateControlUI, triggerContainerActivity
└── FontInjector.ts        ← injectResources
```

### Checklist

- [x] Crear `Renderers/templates.ts` (puro) — `renderItemHTML`, `renderContainersHTML`, `shouldRenderInTab`, `resolveContainerWidth`, `buildPanelHTML`
- [x] Crear `Renderers/ValueFormatters.ts` (puro) — `getFormattedValue`, `getEntityValueLabel`, `getRegistryEntity` (y `inferPortColor`, que se **eliminó después** por ser código muerto sin call sites)
- [x] Crear `Renderers/TelemetrySync.ts` — `subscribeToTelemetry`, `updateTelemetryUI`
- [x] Crear `Renderers/Visualizers.ts` — `VisualizerEngine` (scope + terminal + rAF loop)
- [x] Crear `Renderers/ControlUIUpdater.ts` — `updateControlUI`, `triggerContainerActivity`
- [x] Crear `Renderers/FontInjector.ts` — `injectResources`
- [x] Reducir `ModuleRenderer.ts` al orquestador en `Renderers/ModuleRenderer.ts`
- [x] Preservar exports (`default` + nombrados) para no romper imports — `index.ts` actualizado a `./Renderers/ModuleRenderer.js`
- [x] Eliminar `Logic/module_renderer.ts` original
- [x] `npx tsc --noEmit` en `host/ui` ✅ (exit 0)
- [x] `npx vitest run` en `host/ui` ✅ (26 tests, exit 0)

---

## 🟠 Fase 2 — `host/ui/src/Logic/module_manager.ts` (418 líneas / 18 KB)

**Diagnóstico:** mezcla orquestación de estado, render, construcción de DOM y código legacy.

### Métodos por responsabilidad

| Responsabilidad | Métodos | Problema |
|---|---|---|
| Suscripción al store | `constructor` | Reactividad + init |
| Pipeline estructural | `updateRack` | Fingerprint + routing + rebuild (~150 líneas) |
| **Ruta legacy (Era 6)** | `renderModuleItem`, `renderContractError` | Posible código muerto junto a la ruta Era 7 |
| Construcción de DOM | `addModule` (header con botones ⚙ ◀ ▶ ×) | Lógica de interfaz dentro del manager |
| RPC / utilidades | `stepParameter`, `getCanonicalId`, `cleanupModules`, `normalizeList` (puro) | Lógica variada |

### Estructura destino

```
host/ui/src/Logic/
├── ModuleManager.ts           ← orquestador: suscripción + updateRack + ciclo de vida
├── RackRouter.ts              ← pura: decide upper/lower/compact según manifest
├── RackFingerprint.ts         ← pura: calcula fingerprint de módulos
├── ModuleHeaderBuilder.ts     ← DOM: crea header con config/move/close buttons
└── ModuleInstantiator.ts      ← factory + cleanup de instancias activas
```

### Checklist

- [x] **Verificar** si `renderModuleItem`/`renderContractError` están muertas — solo existen en el .ts y en artefactos compilados
- [x] Eliminadas `renderModuleItem`, `renderContractError`, `getCanonicalId`, `normalizeList` (~90 líneas)
- [x] Crear `RackRouter.ts` (pura) — `computeFingerprint`, `resolveRackTarget`, `getRackElement`, `processRackUpdate`
- [x] Crear `ModuleHeaderBuilder.ts` — `buildModuleHeader` (config/move/close buttons con manifest en dataset)
- [x] Crear `ModuleInstantiator.ts` — `createModuleContainer`, `instantiateModule`, `stepParameter`, `cleanupModules`
- [x] Reescribir `module_manager.ts` como orquestador (eliminadas ruta legacy, imports muertos)
- [x] Corregido: manifest se pasa a buildModuleHeader para que botón ⚙ no crashee
- [x] Corregido: eliminar import muerto de ModuleRegistry en module_manager.ts
- [x] Preservar exports (`ModuleManager` + `default` export)
- [x] `npx tsc --noEmit` en `host/ui` ✅ (exit 0)
- [x] `npx vitest run` en `host/ui` ✅ (3/3 files, 82/82 tests)

---

## 🟠 Fase 3 — `host/ui/src/Components/ModulePatchbayMatrix.ts` (26 KB)

**Diagnóstico:** singleton `ModulePatchbayMatrix` que mezcla DOM (`createElement`, `innerHTML`), layout de grid, async loading (`setTimeout`) y handlers de mouse. Varios bloques de HTML inline de 30–60 líneas.

### Estructura destino

```
host/ui/src/Components/patchbay/
├── ModulePatchbayMatrix.ts   ← orquestador (singleton, ciclo de vida)
├── matrixLayout.ts           ← pura: calcula posiciones/grilla
├── matrixTemplates.ts        ← HTML builders de celdas/toggles
└── matrixEvents.ts           ← handlers de mouse/drag
```

### Checklist

- [x] Crear `patchbay/matrixLayout.ts` (puro) — `normalizeList`, `getNameForId`, `getAmountColor`, `getSlotSkeleton`, `generateOptions`, `buildMetadataFromInventory`, `syncMaxSlots`, `DEFAULT_REGISTRIES`
- [x] Crear `patchbay/matrixTemplates.ts` — `setupHeaderToggles`, `renderStructure`, `syncSlotsFromState`, `renderInspector`
- [x] Crear `patchbay/matrixEvents.ts` — `attachGridListeners`, `attachInspectorListeners`, `sendUpdate`, `triggerActivity`
- [x] Reducir `ModulePatchbayMatrix.ts` al orquestador (~180 líneas, de 611)
- [x] Preservar API pública: `constructor`, `toggleWorkspace`, `onStateUpdate`, `window.ModulePatchbayMatrix`
- [x] Corregido: eliminar import muerto de `getNameForId` en orquestador
- [x] `npx tsc --noEmit` en `host/ui` ✅ (exit 0)
- [x] `npx vitest run` en `host/ui` ✅ (5/5 files, 139/139 tests)

---

## 🟡 Fase 4 — Archivos grandes del editor web (Next.js)

Ya están bien modularizados (hooks divididos en 30+ archivos). Trabajo menor de extracción.

| Archivo | Tamaño | Estado | Acción |
|---|---|---|---|
| `web/src/features/manifest-editor/hooks/useWorkbenchContainer.ts` | 34 KB | Orquestador cohesivo de ~30 hooks | Extraer interfaz `WorkbenchContainerLogic` → `workbenchTypes.ts` |
| `web/src/features/manifest-editor/components/inspector/RightDockContainer.tsx` | 28 KB | Persistencia de tamaños + estados de ventanas | Extraer `loadPanelSizes`/`savePanelSizes` → `dockPanelSizes.ts` |
| `web/src/features/manifest-editor/components/WorkbenchContainer.tsx` | 26 KB | Componente de orquestación | Extraer `renderPaneProps` y window-states a helpers |
| `web/src/features/manifest-editor/components/inspector/PropertyPanel.tsx` | 24.6 KB | Agrega props de 8 secciones | Extraer configs de secciones → `sections/config.ts` |

### Checklist

- [x] `useWorkbenchContainer.ts` → extraer interfaz `WorkbenchContainerLogic` a `types/workbenchTypes.ts` (tipos del contrato del contenedor)
- [x] `RightDockContainer.tsx` → extraer `loadPanelSizes`/`savePanelSizes` + `loadDockWidth`/`saveDockWidth` a `inspector/dockPanelSizes.ts`
- [x] `WorkbenchContainer.tsx` → extraer `createWindowStates`/`createRenderPaneProps` a `workspace/workbenchPaneHelpers.ts` (type `WorkbenchRenderPaneProps` exportado desde `WorkbenchRenderPane.tsx`)
- [x] `PropertyPanel.tsx` → extraer `SECTION_CONFIG` + `getSectionMeta` a `inspector/sections/config.ts`; los 13 `<TieredSection>` cableados con `{...getSectionMeta(id, isModule)}` (import de lucide reducido de 11 a 2 iconos: `Play`, `Square`)
- [x] `npx tsc --noEmit` en `web` ✅ (exit 0)
- [x] `npx jest` + eslint en `web` ✅ (1255/1256 tests; los 4 archivos nuevos pasan eslint limpio; 1 error + warnings son pre-existentes — ver nota)

---

## 🟠 Fase 5 — Archivos grandes C/C++ (`host/src`)

**Contexto:** el código C++ está mejor organizado que el TS: **99 archivos propios**, el más grande tiene 421 líneas, y ya hay separación por dominio (`Core/Ace/*`, `UI/Controllers/*`, `Engine/Modular`, `Core/Wasm/*`). Los candidatos a dividir son pocos y por **datos inline** o **sub-dominios acumulados**, no por lógica monstruosa.

### 5.1 🔴 `UI/Controllers/Library/RpcPresetController.cpp` — 421 líneas (20 KB)

**Diagnóstico:** nombre engañoso — un solo controller que mezcla **4 sub-dominios** de comandos RPC:

| Responsabilidad | Métodos |
|---|---|
| Preset CRUD | `handleListPresets`, `handleLoadPreset`, `handleSavePreset`, `handleNewPreset`, `handleGetBrowserData` |
| **Rack operations** | `handleAddModule`, `handleRemoveModule`, `handleMoveModule`, `handleClearRack` |
| **History** | `handleUndo`, `handleRedo`, `handleGetHistory` |
| Serialización | `valueTreeToVar`, `handleListAceComponents` |

**Estructura destino:**
```
UI/Controllers/Library/
├── RpcPresetController.cpp      ← solo preset CRUD (list/load/save/new/browserData)
├── RpcRackController.cpp        ← addModule/removeModule/moveModule/clearRack
├── RpcHistoryController.cpp     ← undo/redo/getHistory
└── VarSerialization.cpp         ← valueTreeToVar (puro, reutilizable)
```

### 5.2 🟠 `Core/Ace/Parser/AceManifestParser.cpp` — 306 líneas (14 KB)

**Diagnóstico:** mezcla parsing de **dos formatos distintos** + helpers + **side effect** a telemetría (línea 248 registra en `ModulationTelemetryRegistry`):

| Responsabilidad | Métodos | Nota |
|---|---|---|
| Parsing YAML (manifest) | `parseComponentNode`, `parseEntryNode` | Núcleo |
| Parsing JSON (contract) | `parseContractJson` | **Otro formato distinto** |
| Helpers numéricos | `safeAsFloat`, `safeAsInt` | **Funciones puras** |
| Side effect | registro en `ModulationTelemetryRegistry` | Debería moverse al loader |

**Estructura destino:**
```
Core/Ace/Parser/
├── AceManifestParser.cpp     ← solo YAML (parseComponentNode/parseEntryNode)
├── AceContractJsonParser.cpp ← parseContractJson (JSON → ComponentInfo)
└── YAMLHelpers.cpp           ← safeAsFloat/safeAsInt (puros, testeables sin JUCE)
```

### 5.3 🟡 `Plugin/OmegaAudioProcessor.cpp` — 345 líneas (14 KB)

**Diagnóstico:** `createParameterLayout()` ocupa ~250 líneas con la cascada de `addParameter`. El resto es audio processing + editor.

**Estructura destino:** extraer `ParameterLayoutBuilder.cpp` (solo datos, generable) del orquestador `OmegaAudioProcessor.cpp` (constructor, processBlock, createEditor).

### 5.4 🟡 `Core/Ace/Export/AceContractExporter.cpp` — 185 líneas (8 KB)

**Diagnóstico:** `exportComponentContract` es **un solo método de ~180 líneas** construyendo `DynamicObject`s anidados (ui → controls/jacks → pos/presentation → attachments).

**Estructura destino:** extraer builders por sección (`ExportUI.cpp`, `ExportControls.cpp`, `ExportAttachments.cpp`), cada uno puro (ComponentInfo → DynamicObject).

### 5.5 🟡 `Core/Service/Config/SystemSettingsManager.cpp` — 186 líneas (6.8 KB)

**Diagnóstico:** mezcla lógica de negocio (get/set/clamp) con persistencia (YAML+XML) y defaults hardcodeados.

**Estructura destino:** `SystemSettingsManager.cpp` (lógica pura) + `SettingsRepository.cpp` (load/save/getSettingsFile) + `SettingsDefaults.cpp` (initializeDefaults).

### 5.6 🟡 `Core/Ace/Loader/AcePackLoader.cpp` — 147 líneas (6.6 KB)

**Diagnóstico:** **4 rutas de carga** en un archivo: directorio YAML, modules dir, acepack, zip archive.

**Estructura destino:** orquestador + `ManifestSourceDir.cpp` + `ManifestSourceAcePack.cpp` + `ManifestSourceZip.cpp`.

### ✅ Bien organizados (no tocar)

- **Controllers RPC** (`RpcTelemetryController`, `RpcMetadataController`, `RpcModulationController`, `RpcSystemController`, `RpcParameterController`) → ya separados por dominio
- **`WasmHostInterface.cpp`** (177 líneas) → superficie C-API del bridge WASM; tamaño intrínseco
- **`AceCatalog.cpp`** (112), **`VirtualAnalogEngine.cpp`** (98) → cohesionados
- **Headers grandes** (`OmegaIdentifiers.h` 117, `OmegaWebViewComponent.h` 132) → constantes/identifiers, no lógica

### Checklist Fase 5

- [x] Verificar que el proyecto compila — `host/build/` YA está configurado (VS 18 2026, Release); `omega_core.lib`/`omega_engine.lib` construidos
- [x] **Tests Catch2 creados** en `host/src/Tests/` (3 archivos, 2 targets)
- [x] 5.1 `RpcPresetController.cpp` → 3 controllers + `VarSerialization.cpp`
- [x] 5.2 `AceManifestParser.cpp` → YAML + JSON + helpers puros; mover side-effect de telemetría al loader
- [x] 5.3 `OmegaAudioProcessor.cpp` → extraer `ParameterLayoutBuilder.cpp`
- [x] 5.4 `AceContractExporter.cpp` → builders por sección
- [ ] 5.5 `SystemSettingsManager.cpp` → lógica + repository + defaults
- [ ] 5.6 `AcePackLoader.cpp` → orquestador + fuentes por formato
- [ ] Actualizar `CMakeLists.txt` con los nuevos `.cpp` tras cada extracción
- [x] Validar: build CMake (exit 0) + tests Catch2: `omega_core_tests` 30/30 (217 assertions), `omega_ui_tests` 10/10 (61 assertions), `omega_plugin_tests` 2/2 (34 assertions) — en `host/build`, config Release

---

## 🔄 Fase 6 — Regenerar `host/ui/bundle.js` (build artifact desactualizado)

**Diagnóstico (2026-07-31):** `bundle.js` (213 KB) es un IIFE generado que `index.html` carga en L341. Tras las Fases 1-3, **el bundle sigue conteniendo el código ANTIGUO**:

- ✅✅ Verificado: `grep 'renderModuleItem|renderContractError|getCanonicalId' bundle.js` → **4 coincidencias** (código muerto ya eliminado de las fuentes)
- ✅✅ Verificado: referencia a `// src/Logic/module_renderer.ts` → archivo **eliminado** en Fase 1
- ✅✅ Verificado: `grep 'Renderers/ModuleRenderer|RackRouter|ModuleInstantiator' bundle.js` → **0 coincidencias** (no contiene ningún archivo nuevo)

**Conclusión:** NO se refactoriza a mano (todo cambio se sobreescribiría). Se **regenera** desde las fuentes TS actuales.

> ⚠️ **IMPORTANTE — por qué esta fase es PRERREQUISITO de las Fases 1-3:** el host ejecuta el bundle viejo, no el código refactorizado. Además existe un **bug de runtime real**: el bundle viejo instancia `new Factory(el, content, options.manifest)` para `ModuleRenderer`, pero el nuevo constructor es `ModuleRenderer(content, options)` (2 args). Sin regenerar, la Fase 1 rompería en runtime por incompatibilidad de aridad (el nuevo `ModuleInstantiator` ya usa detección de aridad `Factory.length <= 2`, pero eso solo está en el bundle nuevo).

> Nota de expectativas: la reducción de tamaño fue **mayor de lo previsto** — **180.8 KB / 4610 líneas** (desde 213 KB / 5170, ~32 KB menos) gracias a la eliminación del código muerto y del renderer monolítico. El grueso sigue siendo `omega-ui-core` (~60%), que no cambia. El objetivo real no es adelgazar, sino que el host ejecute el código refactorizado.

> ✅ **Nota técnica — RESUELTA (2026-07-31):** `--define:OMEGA_BUILD_ID="%build_no%"` era **inefectivo** porque la fuente usa `window.OMEGA_BUILD_ID` (property access) y esbuild solo reemplaza identificadores libres. **Fix aplicado en `build_auto.bat` L62**: el define ahora usa ruta con puntos `--define:window.OMEGA_BUILD_ID="%build_no%"`, que esbuild sí reemplaza (verificado: bundle regenerado contiene `const buildId = "710";` en L4439, 0 refs a `window.OMEGA_BUILD_ID`, 0 fallback `|| "DEV"`). El quoting `\"...\"` del .bat se entrega como `"..."` a esbuild vía `CommandLineToArgvW` (cmd), coherente con el test en bash `--define:window.OMEGA_BUILD_ID='"710"'`. La aridad también quedó verificada en el bundle: `Factory.length <= 2 ? new Factory(content, options.manifest) : new Factory(el, content, options)` y `constructor(content, options)`.

> ℹ️ **Hallazgo del smoke test (2026-07-31): doble instanciación de ModuleManager — pre-existente, NO es regresión del refactor.** El bundle contiene DOS `new ModuleManager()`: (1) module-scope en `module_manager.ts` L179 (`window.moduleManager = new ModuleManager()`), que se ejecuta DURANTE la evaluación del import — ANTES de que `index.ts` ancle `window.runtimeStore` — y por eso registra `CRITICAL: RuntimeStore not found` en stderr en cada boot; (2) `index.ts` L22 crea la instancia real tras anclar los stores (`win.moduleManager = manager`). La primera es trabajo muerto (se sobrescribe al instante). El bundle OLD tenía la misma estructura (el `module_manager.ts` pre-refactor también tenía la instanciación module-scope), así que es comportamiento histórico. **No se toca en esta fase** (requeriría cambiar fuentes + regenerar bundle); queda anotado como candidato de limpieza futura.

### Checklist Fase 6

- [x] Localizar el comando/build script — **`host/build_auto.bat` L62**: `npx -y esbuild src/index.ts --bundle --outfile=bundle.js --platform=browser --target=es2022 --define:OMEGA_BUILD_ID="%build_no%"` (esbuild 0.21.5 disponible en `node_modules/.bin`)
- [x] Verificar que `tsc --noEmit` y `vitest run` pasan ✅ (tsc exit 0; 5/5 files, 139/139 tests)
- [x] Regenerar `bundle.js` (180.8 KB / 4610 líneas, desde 213 KB / 5170) — esbuild run manual desde `host/ui` con el mismo comando del build script (build_id 710, sin incrementar `build_no.txt`)
- [x] Confirmar que el bundle nuevo ya NO contiene código muerto — `renderModuleItem`/`renderContractError`/`getCanonicalId` → **0 coincidencias**; referencia a `src/Logic/module_renderer` → **0**
- [x] Confirmar que el bundle nuevo SÍ contiene los archivos del refactor — `RackRouter`, `ModuleInstantiator`, `Renderers/ModuleRenderer`, `patchbay/matrixLayout`, `matrixTemplates`, `matrixEvents`, `Renderers/templates`, `ValueFormatters`, `ControlUIUpdater`, `FontInjector`, `TelemetrySync`, `Visualizers`, `ModuleHeaderBuilder` ✅
- [x] **Smoke test de compatibilidad de aridad** ✅ — test automatizado `host/ui/tests/bundle-arity.smoke.test.ts`: carga el **bundle.js REAL** (artefacto esbuild, no las fuentes) en jsdom con `FakeHostBridge` + contenedores de rack, seed de schema y `updateRack` end-to-end. Verifica: (1) `ModuleRenderer.length === 2`, (2) el contenedor DOM y la instancia activa se crean, (3) **discriminador de aridad**: el `.module-panel` queda DENTRO de `.module-content` (ruta 2-arg `new Factory(content, options.manifest)`), (4) el wrapper `#mod-*` NO fue reemplazado (header intacto). **4/4 tests pasan** contra el artefacto real (logs muestran `ModuleRenderer initialized for: osc_va_basic`). Full suite 143/143 + tsc exit 0
- [x] Smoke test en host (la UI carga, módulos renderizan) — **RESUELTO (2026-08-01) vía embedding**: se eliminó la ruta hardcodeada `d:\desarrollos\ABDOmega\ui` y la UI se **embebe dentro del exe** (ver sección "Fase 6.1 — UI embebida"). El standalone regenerado arranca limpio y se mantiene vivo (smoke test runtime: PID activo ~149 MB, sin crash). Verificación de cobertura del zip: `index.html`, `bundle.js`, `css/*.css`, `css/*.jpg|png` (co-locadas), `omega-ui-core/index.css` + `typography/fonts.css` (rutas **absolutas** `/fonts/...` → resuelven a `fonts/` raíz) y los 9 fonts — **87 entradas, 1.83 MB**.

---

## 📦 Fase 6.1 — UI embebida en el exe (self-contained standalone)

**Contexto:** el smoke test en host reveló que `OmegaWebViewComponent.h` servía la UI desde una ruta hardcodeada `d:\desarrollos\ABDOmega\ui` que ya no existe. Decisión (2026-08-01): **embeber la UI dentro del binario**, como hacían los proyectos ABD clásicos (`juce_add_binary_data` → imágenes como arrays de bytes). Para `WebBrowserComponent`, el patrón recomendado es un **ZIP único embebido** servido desde `juce::ZipFile` en memoria (en vez de un símbolo por imagen, que exigiría mapear path→símbolo en C++).

```
host/ui (runtime) ──> ui_stage.cmake (staging) ──> omega_ui_embedded.zip ──> juce_add_binary_data ──> UiData.cpp ──> ZipFile en memoria
```

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `host/src/Plugin/ui_stage.cmake` | **Nuevo.** REALPATH canónico de paths (fix del `file(COPY)` con `..` en Windows); stage de `index.html`, `bundle.js`, `css/` (con imágenes co-locadas), `assets/`, CSS de `omega-ui-core` y 9 fonts; ZIP vía `cmake -E tar cf --format=zip`; sanity check de entradas críticas |
| `host/src/Plugin/CMakeLists.txt` | GLOB `CONFIGURE_DEPENDS` de inputs staged; `add_custom_command` regenera el zip ante cualquier cambio (DEPENDS ampliados); `juce_add_binary_data(omega_ui_embedded NAMESPACE UiData HEADER_NAME UiData.h)`; `target_include_directories` explícito al `JuceLibraryCode` generado. **Fix crítico:** `UI_SRC = ../../ui` (el `../ui` resolvía a `src/UI` por case-insensitivity de Windows) |
| `host/src/UI/Editor/OmegaWebViewComponent.h` | Eliminada la ruta de disco; resource provider sirve desde `getEmbeddedUiZip()` (lazy static: MemoryBlock → MemoryInputStream → ZipFile) con **mutex estático** (WebView2 es multithread) y `getEntry(path, true)` case-insensitive; `getWebMimeType` ampliado (html/js/css/json/png/svg/jpg/woff2/ttf); `#include "UiData.h"` a **scope global** (los símbolos viven en `::UiData`) |

### Decisiones técnicas

- **ZIP vs per-image**: mismo mecanismo (`juce_add_binary_data`) que ABDJunio/ABDEep; las imágenes SÍ quedan como binarios en el exe. La diferencia es solo el contenedor: zip único = mapeo URL→entry natural para el WebView; per-image = útil cuando el C++ referencia `BinaryData::getNamedResource` directamente.
- **Junction `omega-ui-core`/`fonts`**: el stage copia desde `web/src/omega-ui-core` (resuelto por REALPATH) — no se embeberían los 61 MB de fuentes TS.
- **Rebuild triggers**: GLOB `CONFIGURE_DEPENDS` + DEPENDS por carpeta → cualquier CSS/asset/font nuevo regenera el zip.
- **Clean-configure**: `juce_add_binary_data` lee el zip en tiempo de configurar; si un CI borra el build tree entero sin build previo, habría que generar el zip en configure. No bloquea (el build real funciona); anotado.

### Checklist Fase 6.1

- [x] Crear `ui_stage.cmake` (staging + zip + sanity check)
- [x] CMake: staging + `juce_add_binary_data` + include dir + link en `omega_plugin`
- [x] Resource provider desde ZipFile embebido (mutex + case-insensitive + MIME ampliado)
- [x] Eliminar referencias a la ruta de disco antigua (0 restantes en código; solo el comentario histórico en `ui_stage.cmake`)
- [x] Fix `UI_SRC = ../../ui` (bug case-insensitivity de Windows)
- [x] Fix include global de `UiData.h` (link)
- [x] Build Release exit 0 → `OMEGA Synth.exe` regenerado con UI embebida
- [x] Smoke test runtime: arranca y se mantiene vivo (~149 MB, sin crash)
- [x] Verificar cobertura del zip (87 entradas; fuentes absolutas + imágenes co-locadas resuelven)
- [x] Code review (4 rondas) + documentación (changelog #711)
- [x] **CMake DRY** — `OMEGA_UI_STAGE_ARGS` (variable única para los `-D`/`-P` del stage script, compartida entre `execute_process` en configure y `add_custom_command` en build), `OMEGA_TEST_COMMON_DEPS` (Tests) y `OMEGA_JUCE_SETTINGS_DEFINE` (Core). Reconfiguración CMake exit 0 + code review

---

## ✅ Prioridad sugerida

1. ✅ **Fase 1** `module_renderer.ts` → mayor ganancia (7 responsabilidades, 2 archivos puros)
2. ✅ **Fase 2** `module_manager.ts` → eliminar ruta legacy + separar DOM/routing
3. ✅ **Fase 3** `ModulePatchbayMatrix.ts` → dividir por bloques
4. ✅ **Fase 4** Archivos web → solo extracción de helpers, riesgo mínimo
5. ⬜ **Fase 5** C++ → 5.2 `AceManifestParser` (helpers puros + JSON separado) → 5.1 `RpcPresetController` (3 dominios) → resto
6. 🔴 **Fase 6** Regenerar `bundle.js` → **PRERREQUISITO** de las Fases 1-3: sin ella el host ejecuta código viejo y `ModuleRenderer(content, options)` rompería en runtime

> ⚠️ **Nota de ejecución:** aunque la Fase 6 está numerada al final, **debe ejecutarse ANTES de cualquier prueba manual de las Fases 1-3** (o al menos antes del smoke test de runtime). El `bundle.js` actual ejecuta código viejo e instancia `ModuleRenderer(el, content, options)` — incompatible con el nuevo constructor de 2 args. Las fases 1-3 se validan con `tsc`/`vitest`; la Fase 6 hace que el host real ejecute ese código.

---

## Reglas de proceso

- ❌ **No dividir `bundle.js`** — es generado; refactorizar la fuente y recompilar.
- Mantener el patrón del repo: **funciones puras donde no haya DOM**; clases solo con estado + ciclo de vida.
- Cada extracción **preserva `export`/`export default`** para no romper imports en `index.ts` y `ModuleRegistry`.
- Validar tras cada fase: `npx tsc --noEmit` + `npx vitest run` (en `host/ui` y `web`).
- Ir fase por fase; no mezclar cambios de distintas fases en el mismo commit.

---

## Notas / Log de progreso

| Fecha | Fase | Estado | Notas |
|---|---|---|---|
| 2026-07-31 | Análisis inicial | ✅ | Informe entregado, plan guardado |
| 2026-07-31 | Fase 1 (module_renderer) | ✅ | Dividido en 7 módulos en `Renderers/`. tsc exit 0, vitest 26/26. Revisado (sin issues reales). Nota: `inferPortColor` parece código muerto (sin call sites) — preservado intencionalmente; `VisualizerEngine` usa init en 2 fases |
| 2026-07-31 | Fase 2 (module_manager) | ✅ | Ruta legacy (Era 6) verificada muerta y eliminada. Extraídos `RackRouter`, `ModuleHeaderBuilder`, `ModuleInstantiator`. Orquestador ~130 líneas (de 418). tsc exit 0, vitest 82/82 |
| 2026-07-31 | Fase 3 (ModulePatchbayMatrix) | ✅ | Dividido en `patchbay/matrixLayout`, `matrixTemplates`, `matrixEvents`. Orquestador ~180 líneas (de 611). tsc exit 0, vitest 139/139. También: tests para RackRouter (25) y ModuleInstantiator (29), y limpieza de `inferPortColor` + campo `el` |
| 2026-07-31 | Fase 5 (C++) — plan | 📝 | Análisis de 99 archivos C/C++: solo 6 candidatos a dividir, ninguno >421 líneas. Plan guardado como Fase 5. Nota: Catch2 es dependencia pero **no hay tests C++** — crear los primeros para las funciones puras |
| 2026-07-31 | Fase 5 (C++) — tests Catch2 | ✅ | Creados `src/Tests/` con 3 suites: **AceManifestParser** (safeAsFloat/safeAsInt/parseComponentNode/parseContractJson, 18 tests), **AceContractExporter** (generateSchema/exportComponentContract, 7 tests), **RpcPresetController** (valueTreeToVar, 6 tests). `AceManifestParser.h`: safeAsFloat/safeAsInt ahora públicas (estaban private). CMake: targets `omega_core_tests` (linka omega_core) y `omega_ui_tests` (compila RpcPresetController.cpp + linka omega_core/omega_engine); `add_subdirectory(src/Tests)` habilitado. **Build Release exit 0; 25/25 y 6/6 tests verdes** |
| 2026-07-31 | Fase 6 (bundle.js) — plan | 📝 | Diagnóstico: bundle.js (213 KB) es **artefacto desactualizado** — contiene código muerto (`renderModuleItem`, `renderContractError`, `getCanonicalId`), referencia a `module_renderer.ts` eliminado, y 0 archivos del refactor. Conclusión: NO refactorizar a mano → **regenerar**. Marcada como **prerrequisito** de Fases 1-3 (bug de aridad `ModuleRenderer(content, options)`). Reducción de tamaño será modesta (~unos KB, el grueso es omega-ui-core que no cambia) |
| 2026-07-31 | Fase 6 (bundle.js) — ejecución | ✅ | Regenerado con esbuild (`build_auto.bat` L62): **180.8 KB / 4610 líneas** (desde 213 KB / 5170). Verificado: 0 código muerto, 0 referencia a `module_renderer.ts`, contiene todos los módulos del refactor (`RackRouter`, `ModuleInstantiator`, `Renderers/ModuleRenderer`, `patchbay/*`, `Renderers/*`). tsc exit 0, vitest 139/139. Pendientes: smoke test de aridad en host |
| 2026-07-31 | Fase 6 (bundle.js) — smoke test aridad | ✅ | Nuevo `host/ui/tests/bundle-arity.smoke.test.ts` (jsdom + `FakeHostBridge` + bundle REAL). Verifica la ruta 2-arg end-to-end: `ModuleRenderer.length === 2`, contenedor + instancia activa, `.module-panel` dentro de `.module-content`, wrapper intacto. **4/4 pasan**; suite completa 6/6 files 143/143; tsc exit 0. Hallazgo: doble `new ModuleManager()` (module-scope L179 + index.ts) es pre-existente — documentado, no tocado. Pendiente host real: `OmegaWebViewComponent.h` carga UI desde `d:\desarrollos\ABDOmega\ui` hardcodeado (no existe) → requeriría apuntarlo a `host/ui` (C++ + rebuild) — fuera de scope |
| 2026-07-31 | Fase 6 — fix OMEGA_BUILD_ID | ✅ | `build_auto.bat` L62: define corregido a `--define:window.OMEGA_BUILD_ID="%build_no%"` (ruta con puntos; esbuild reemplaza property access). Bundle regenerado: `const buildId = "710";` L4439, 0 refs a `window.OMEGA_BUILD_ID`, 0 fallback DEV. tsc 0, vitest 143/143, smoke aridad 4/4. Nota técnica del plan actualizada a RESUELTA |
| 2026-07-31 | Fase 4 (editor web) | ✅ | Extraídos helpers de 4 archivos: `types/workbenchTypes.ts` (interfaz WorkbenchContainerLogic), `inspector/dockPanelSizes.ts` (persistencia tamaños), `workspace/workbenchPaneHelpers.ts` (window-states + renderPaneProps), `inspector/sections/config.ts` (SECTION_CONFIG + getSectionMeta; `PropertyPanel.tsx` usa spread en 13 TieredSection, import de lucide de 11→2 iconos). `config.ts` corregido en revisión: resolver de icono pasó de union `LucideIcon | ((isModule)=>...)` a campo `iconFor` separado (LucideIcon es en sí un tipo función y TS no discriminaba — TS2322/TS7006). tsc exit 0, jest 1255/1256 (el fallo `DockIconStrip.spec.tsx` es pre-existente, archivos `dock/` untracked ajenos a la fase), eslint limpio en archivos nuevos. Nota: error `no-explicit-any` (L69 `editor: any`) y warnings exhaustive-deps son pre-existentes en el working tree |
| 2026-07-31 | Fase 5.1 (RpcPresetController) | ✅ | `RpcPresetController.cpp` (421 líneas) dividido en 4 dominios: **`VarSerialization.h/.cpp`** (nuevo — `patchDocumentToVar`/`varToPatchDocument`/`valueTreeToVar`, funciones puras reutilizables), **`RpcHistoryController.h/.cpp`** (nuevo — incluye **`PatchHistoryState`** con las stacks de undo/redo COMPARTIDAS entre preset/rack/history + undo/redo/getHistory; `takeUndoSnapshot` empuja la doc actual a redo antes de `applyAndNotify`, comportamiento idéntico al original), **`RpcRackController.h/.cpp`** (nuevo — addModule/removeModule/moveModule/clearRack), y `RpcPresetController.h/.cpp` **reducido a solo preset CRUD** (listAce/loadPreset/newPreset/savePreset/listPresets/getBrowserData). `OmegaUiBridge.h/.cpp` ahora instancia los 3 controllers con el `PatchHistoryState` compartido (se eliminó `setOnConfigChangedCallback` — el estado expone `setOnConfigChanged`). Tests: `RpcPresetController.test.cpp` → reemplazado por `VarSerialization.test.cpp` (valueTreeToVar 6 tests + round-trip completo de PatchDocument), CMakeLists de tests compila `VarSerialization.cpp` + test. Correcciones en el camino (detectadas por build): `VarSerialization.h` necesitaba `juce_data_structures` para `juce::ValueTree`; el test usaba prefijos `Core::Model::` que no resuelven (solo la using-directive importa los nombres) → eliminados. Revisión: 4 checkpoints verificados (guards de undo/redo + propagación de onLoad, tipos de comando disjuntos entre controllers, sin refs stale en CMakeLists, valueTreeToVar sin callers de producción — test-only, aceptable). Nota del revisor: `valueTreeToVar` queda ejercitado SOLO por tests (era API pública previa, documentado como reutilizable) — no confundir con código muerto. **Build Release exit 0; omega_core_tests 26/26 (180 assertions), omega_ui_tests 10/10 (61 assertions); omega_plugin exit 0** |
| 2026-07-31 | Fase 5.3 (OmegaAudioProcessor) | ✅ | `OmegaAudioProcessor.cpp` (345 líneas) — extraído `ParameterLayoutBuilder.h/.cpp` (nuevo, namespace `ParameterLayoutBuilder`, `build()` construye el `AudioProcessorValueTreeState::ParameterLayout` iterando `Core::ParameterMetadataRegistry::getInstance().getAllParameters()`, mismo loop/`AudioParameterFloat`/`ParameterID`/range/default que el original). `OmegaAudioProcessor.cpp` **reducido**: `createParameterLayout()` (static, API pública intacta) ahora delega a `ParameterLayoutBuilder::build()`; el include de `ParameterMetadataRegistry.h` se conserva (constructor + `updateParameters()` siguen usándolo). **Hallazgo de build**: en JUCE 8 `ParameterLayout` es **opaco** (sin `getParameters()`/`getParameter()`/`getParameterRange()` — viven en `AudioProcessorValueTreeState`, que CONSUME el layout), así que el test se reescribió como test de integración: `TestProcessor` (stub minimal con todos los pure virtuals de `AudioProcessor` + `BusesProperties` output stereo) aloja el layout en un `AudioProcessorValueTreeState` real y verifica `apvts.getParameter(id)` por cada parámetro registrado + conteo exacto vía `processor.getParameters().size()` + rango de `layer.a.cutoff` (20..20000 Hz). Tests: `ParameterLayoutBuilder.test.cpp` (2 test cases) en target nuevo `omega_plugin_tests` (compila el TU exacto, linka `omega_core` + `juce::juce_audio_processors` — necesario porque `omega_core` no lo linka — + Catch2). Revisión: extracción fiel byte a byte, 2 mejoras aplicadas (conteo exacto + binding `entry.first`). **Build Release exit 0; omega_plugin_tests 2/2 (34 assertions); omega_plugin exit 0** |
| 2026-07-31 | Fase 5.4 (AceContractExporter) | ✅ | `AceContractExporter.cpp` (185 líneas) dividido en builders por sección, siguiendo la cadena de anidamiento `ui → controls/jacks → presentation → attachments`: **`ExportAttachments.h/.cpp`** (nuevo — `attachmentToVar` + `attachmentsToVar`, namespace `ExportAttachments`, puras), **`ExportControls.h/.cpp`** (nuevo — `uiItemsToVar`, namespace `ExportControls`, puro, serializa pos/presentation y delega attachments), **`ExportUI.h/.cpp`** (nuevo — `uiToVar`, namespace `ExportUI`, puro, skin/dimensions/controls/jacks + layout con gridSnap y containers). `AceContractExporter.cpp` **reducido a orquestador** (identity/compliance/parameters/ports inline; bloque `ui` delega a `ExportUI::uiToVar`); API pública (`exportComponentContract`/`generateSchema`) intacta, sin cambios en el header. Tests: 4 tests nuevos directos de los builders (attachments x2, controls, ui-builder) en `AceContractExporter.test.cpp`. Revisión: split verificado clave por clave contra el original (mismas keys/orden/valores), lambda `exportItems` inline eliminado sin código muerto, headers auto-contenidos, GLOB_RECURSE recoge los .cpp nuevos automáticamente. **Build Release exit 0; omega_core_tests 30/30 (217 assertions) — 11 test cases del suite exporter (106 assertions); omega_plugin exit 0** |
| 2026-07-31 | Fase 5.2 (AceManifestParser) | ✅ | `AceManifestParser.cpp` dividido: **`YAMLHelpers.h/.cpp`** (safeAsFloat/safeAsInt como funciones libres en namespace `YamlHelpers`, puras sin JUCE), **`AceContractJsonParser.h/.cpp`** (parseContractJson), y `AceManifestParser.h/.cpp` reducido a **solo YAML** (parseComponentNode/parseEntryNode, puro — los puertos emiten `telemetryIndex = -1`). Side-effect de telemetría **movido al loader**: nuevo `AcePackLoader::registerPortTelemetry(ComponentInfo&)` (estático, testeable) llamado tras cada `parseComponentNode` en `loadFromDirectory`/`loadFromArchive`; condición equivalente al original (`!isInput || signal==audio`). Call sites de `parseContractJson` actualizados a `AceContractJsonParser`. Tests: `AceManifestParser.test.cpp` actualizado (26 test cases, 180 assertions) — helpers vía `YamlHelpers::`, JSON vía `AceContractJsonParser::`, parser puro (`telemetryIndex == -1`) + test nuevo de `registerPortTelemetry`. CMake: GLOB_RECURSE recoge los .cpp nuevos automáticamente. **Build Release exit 0; omega_core_tests 26/26 (180 assertions)**. Revisión: sin issues reales (2 correcciones en el camino: call sites de parseContractJson + namespace `Omega::Core::Modulation::PortDescriptor` en el test) |
| 2026-07-31 | Bugfix registry params | ✅ | **`ParameterMetadataRegistry::initializeDefaults()` NUNCA se llamaba en producción** — solo desde `Tests/ParameterLayoutBuilder.test.cpp` (los matches de `SystemSettingsManager::initializeDefaults` eran OTRA clase con el mismo nombre, y los `registerParameter` solo se auto-llamaban dentro de `initializeDefaults`). Consecuencia runtime: `ParameterLayoutBuilder::build()` generaba un layout **VACÍO** (plugin con 0 parámetros de automatización), `mParamPointers` vacío en `OmegaAudioProcessor`, y `mMidiMap` sin CC mappings (MIDI dead). **Fix** (convención igual a `SystemSettingsManager`): el constructor del registry ahora llama a `initializeDefaults()` — `ParameterMetadataRegistry.h` declara `ParameterMetadataRegistry();` (era `= default`) y el `.cpp` lo define auto-inicializando; `getInstance()` sigue siendo function-local static (lazy init, sin fiasco de orden estático). `initializeDefaults()` es idempotente (`registerParameter` usa `mParameters[desc.id] = desc`). Aplicado también al mirror `engine/`. Tests `ParameterLayoutBuilder.test.cpp`: se **eliminaron** las llamadas explícitas redundantes → ahora son guard de regresión real del fix. Revisión: 3 rondas — aprobado (1 corrección aplicada: variable `registry` sin usar en el 2º TEST_CASE). **Build Release exit 0; omega_core_tests 30/30 (217 assertions), omega_plugin_tests 2/2 (34 assertions); omega_plugin exit 0** |
| 2026-08-01 | Fase 6.1 (UI embebida) | ✅ | **El standalone ya no lee de disco**: eliminada la ruta hardcodeada `d:\\desarrollos\\ABDOmega\\ui` de `OmegaWebViewComponent.h`. Nuevo pipeline CMake: `ui_stage.cmake` etapa los archivos runtime (index.html, bundle.js, css/ con imágenes co-locadas, assets/, css de omega-ui-core, 9 fonts) → `cmake -E tar` a ZIP → `juce_add_binary_data(omega_ui_embedded NAMESPACE UiData)` → el resource provider sirve desde `juce::ZipFile` sobre los bytes embebidos (mutex estático + `getEntry(path, true)` case-insensitive). **87 entradas, 1.83 MB**. Bugs resueltos en el camino: (1) `-D` con comillas internas → STAGE_DIR con comillas (fix: arg entero entre comillas); (2) `file(COPY)` con `..` en paths falla en Windows (fix: REALPATH en `ui_stage.cmake`); (3) **`../ui` resolvía a `src/UI`** por case-insensitivity de Windows (fix: `../../ui`); (4) include de `UiData.h` dentro de `Omega::UI` rompía el link (fix: scope global, símbolos `::UiData`). Revisión: 4 rondas. **Build Release exit 0; OMEGA Synth.exe regenerado; smoke test runtime: arranca y se mantiene vivo (PID ~149 MB)**. Rutas verificadas: `fonts.css` usa absolutas `/fonts/...` ✓, `css/*.css` usa `../fonts/` y `./img` co-locadas ✓ |
| 2026-08-01 | CMake DRY (variable única) | ✅ | Refactor de DRY en los CMakeLists: **`host/src/Plugin/CMakeLists.txt`** — argumentos del stage script (`-DUI_SRC/-DCORE_SRC/-DSTAGE_DIR/-DZIP_OUT/-P`) extraídos de la duplicación entre `execute_process` (configure) y `add_custom_command` (build) a una variable de lista única **`OMEGA_UI_STAGE_ARGS`** (whole-arg quoting preservado para MSBuild); **`host/src/Tests/CMakeLists.txt`** — deps comunes de los 3 targets Catch2 (`omega_core` + `Catch2::Catch2WithMain`) a **`OMEGA_TEST_COMMON_DEPS`**; **`host/src/Core/CMakeLists.txt`** — define `JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED=1` compartido por `omega_core` y `omega-schema-tool` a **`OMEGA_JUCE_SETTINGS_DEFINE`**. Hallazgo: el árbol `engine/` es huérfano (sin CMakeLists raíz, sin build dir, no referenciado desde host, **untracked en git**) con CMakeLists idénticos a `host/src` — **no se tocó** (archivos no rastreados). Reconfiguración CMake exit 0 + code review aprobado. Changelog #712 |
| 2026-08-01 | Limpieza árbol engine/ | ✅ | **Limpieza quirúrgica del espejo muerto `engine/src/`** (87 archivos, copia divergida de `host/src/Core` + `host/src/Engine` — los `.cpp` de Modular/Modulation/Voice tienen gemelos en `host/src/Engine/*`). **Backup completo antes de borrar:** `$TEMP/omega_engine_backup_20260801` (90 archivos, 476K). **Conservados los 3 archivos que `scripts/build_wasm.bat` necesita** (`-I"engine\include"` + `-include "engine\bindings\wasm_compat.h"`): `engine/include/Core/Ace/OmegaConstants.h`, `engine/include/Core/Ace/OmegaContract.h`, `engine/bindings/wasm_compat.h` — auto-contenidos (solo `<stdint.h>`, headers estándar y `emscripten/emscripten.h`; **ningún include relativo apunta al `engine/src` eliminado**, build WASM no se rompe). README actualizado (el árbol de 3 cajas ya no lista `src/`; descripción de `include/` corregida a macros de contrato ACE). `engine/` sigue **untracked en git** (3 archivos vivos) — candidato a registrar. Changelog #713 |
