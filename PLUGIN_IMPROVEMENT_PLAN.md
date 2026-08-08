# Plan de Mejora del Plugin — ABD OMEGA (host JUCE)

> Documento vivo para seguir y actualizar las mejoras del plugin (host).
> **Última actualización:** 2026-08-06 (P0 completo + P1 completo + P2-1/P2-4/P2-5)
> **Estado global:** 🔴 P0: 3/3 (P0-1 ✅, P0-2 ✅, P0-3 ✅) · 🟠 P1: 4/4 (P1-1 ✅, P1-2 ✅, P1-3 ✅, P1-4 ✅) · 🟡 P2: 3/5 (P2-1 ✅, P2-4 ✅, P2-5 ✅) · 🟢 P3 pendiente (4)
> **Contexto:** informe de revisión generado el 2026-08-06. Los P0 son bugs reales con impacto de crash o funcionalidad rota; los P1 son perf/robustez; P2 son features de producto; P3 es proceso/higiene.
>
> ⚠️ **Correcciones de la 2ª revisión (2026-08-06, feedback del usuario):**
> - **P0-1 reescrito**: la polifonía **ya es configurable desde settings** (`numVoices` 1-16 en `system_settings.yaml`, expuesto en la UI web). En OMEGA cada "voz" es una **instancia completa del rack** (el voice plan se ejecuta por voz), no polifonía por módulo. El fix real es limpiar el **duplicado `polyphony`** (hardcodeado, max 32) que no coincide con el ID leído (`numVoices`) y ligar el array de voces al valor clampeado del setting.
> - **P0-2 reescrito**: la arquitectura MIDI es **modular** — los módulos (excepto `midi_in`) reciben MIDI **de otros módulos vía cables**, no del sistema. El puente diseñado (`dispatchMidi` → `omega_on_midi` del módulo `midi_in` → `omega_publish_midi` → cables) está **definido pero sin cablear**: `dispatchMidi` no tiene callers y `setMidiPublishCallback` nunca se registra. El fix NO es mapear CC→params directamente (enfoque de synth no-modular descartado), sino **cablear el puente sistema → `midi_in` → cables → rack**.

---

## 📋 Resumen ejecutivo

El plugin (JUCE 8, VST3 + Standalone, WebView2) tiene una base sólida: pipeline de build blindado, refactorización completa (Fases 1-6 + 5.x C++), suites de test maduras (Catch2 51 tests, vitest 20 files/293, jest 63 suites/1303). Los hallazgos de la revisión se concentran en **3 bugs P0** (polifonía, MIDI CC, persistencia de patches) y una serie de mejoras de perf, producto y proceso.

**Prioridad sugerida:** P0 → P1 → P2 → P3. Cada item tiene checklist propia y se registra en la tabla de progreso al final.

---

## 🔴 P0 — Bugs (crash / funcionalidad rota)

### P0-1. Polifonía dinámica: setting duplicado e inconsistente (`polyphony` vs `numVoices`) + array de voces no ligado

- **Archivos:** `host/src/Core/Service/Config/SettingsDefaults.cpp`, `host/Resources/system_settings.yaml`, `host/src/Core/Service/Config/SystemSettingsManager.h` (`getNumVoices`), `host/src/Engine/Modular/VirtualAnalogEngine.h/.cpp`
- **Semántica modular (aclarada):** OMEGA no es un polifónico clásico. Cada "voz" es **una instancia completa del rack** (el `CompiledVoicePlan` se ejecuta por voz en `renderNextBlock`; los módulos se replican por voz). La "polifonía" = número de racks simultáneos.
- **Estado actual (verificado):** la polifonía **YA es configurable desde settings**: `host/Resources/system_settings.yaml` define `numVoices` (default 16, min 1, max 16, opciones 1/2/4/6/8/12/16) y la UI web la expone (`calibration-data.ts` — "Maximum Polyphony", 1-16). El engine lee `getSettingValue("numVoices")`.
- **Problema real:** existe un **setting hardcodeado duplicado** `polyphony` en `SettingsDefaults.cpp` (default 8, **max 32**) cuyo ID **no coincide** con el que lee el engine (`numVoices`). Es una trampa: permite 32 contra un array fijo de 16 (`std::array<OmegaAsepticVoice, 16>`). Hoy el YAML prevalece (16) así que no hay OOB activo, pero el duplicado es confuso y `getNumVoices()` no clampea contra el tamaño real del array.
- **Fix propuesto:**
  - [ ] **Eliminar el duplicado `polyphony`** de `SettingsDefaults.cpp` (dejar `numVoices` del YAML como única fuente; mantener el hardcoded solo como fallback si el YAML no existe, con el MISMO id `numVoices` y max 16)
  - [ ] **Clamp defensivo** en `getNumVoices()` (o en `renderNextBlock`) contra el tamaño real del array de voces
  - [ ] **Constante compartida `kMaxVoices = 16`** usada por el array, el loop del render, `triggerNote` y el clamp — eliminar el `16` literal de `OmegaAudioProcessor.cpp` (`for (i = 1; i < 16; ++i)`)
  - [ ] Test: Catch2 que fuerce `numVoices` a un valor extremo y verifique que el clamp lo acota al array
- **Validación:** build Release exit 0 · `omega_core_tests` + `omega_ui_tests` verdes · smoke runtime cambiando `numVoices` desde la UI

### P0-2. Puente MIDI sistema → módulo `midi_in` sin cablear (arquitectura modular)

- **Archivos:** `host/src/Plugin/OmegaAudioProcessor.cpp` (`processBlock`), `host/src/Core/Wasm/Service/WasmModuleService.h/.cpp` (`dispatchMidi`, `setMidiPublishCallback`), `host/src/Core/Input/Midi/MidiProcessor.cpp/.h`
- **Arquitectura (aclarada):** los módulos, **excepto `midi_in`**, reciben MIDI **desde otros módulos vía cables**, no del sistema. El camino diseñado es: sistema → `midi_in.omega_on_midi` → `omega_publish_midi` (puerto de salida) → cables → `midi_trigger` y resto del rack.
- **Estado actual (verificado):** el puente está **definido pero sin cablear**: `WasmModuleService::dispatchMidi()` llama al `omega_on_midi` de los módulos pero **no tiene ningún caller**; `setMidiPublishCallback()` (que recibe la salida MIDI de un módulo) **nunca se registra**. `OmegaAudioProcessor::processBlock` usa un camino "teclado directo" (NoteOn/Off → `engine.noteOn`) que **se salta el módulo `midi_in`** — no es el modelo modular. `MidiProcessor` (mapeo CC→parámetros) no tiene callers y ese enfoque **NO aplica** a OMEGA (no es un synth no-modular).
- **Fix propuesto:**
  - [ ] **Cablear `dispatchMidi`**: en `processBlock` (y en `RpcInputController::handleTriggerNote`), enrutar los mensajes MIDI del sistema hacia el módulo `midi_in` vía `dispatchMidi(voiceIdx, status, d1, d2)` en vez del mapeo directo a voces
  - [ ] **Registrar `setMidiPublishCallback`**: la salida del módulo `midi_in` debe fluir a los cables/rack (bus MIDI del voice plan) — cerrar el bucle sistema → módulo → rack
  - [ ] **Decidir el destino de NoteOn/Off**: tras `midi_in`, las notas llegan a los módulos consumidores vía cables (p. ej. `midi_trigger`); el engine ya expone `omega_set_voice_freq/gate/vel` para que los módulos modulen la voz — verificar que esa cadena cierra
  - [ ] `MidiProcessor`: **eliminar o conservar solo como utilidad** (no como ruta de parámetros del plugin) — decisión tras cablear el puente
  - [ ] Tests: test de integración que inyecte un NoteOn por `processBlock` y verifique que llega a `omega_on_midi` del módulo `midi_in` y de ahí al bus MIDI
- **Validación:** build Release exit 0 · suites Catch2 verdes · test de integración MIDI · smoke runtime (teclado → módulo midi_in → cable → midi_trigger)

### P0-3. `saveCurrentPatch()` es un TODO vacío — sin persistencia de patches

- **Archivos:** `host/src/Plugin/OmegaAudioProcessor.cpp` (L80 `// [TODO] Serialize ...`), `host/src/Core/Service/Config/EngineConfigManager.h`
- **Problema:** el plugin no puede guardar/cargar patches a disco por el usuario. `getNumPrograms()` devuelve 1. El estado solo sobrevive vía `getStateInformation` (DAW).
- **Fix propuesto:**
  - [ ] Implementar `saveCurrentPatch()`: serializar `mEngineConfig.getPatchDocument()` a archivo (reutilizando `serializePatchDocument` ya existente) en `%AppData%/ABD/OMEGA/patches/`
  - [ ] Añadir carga: método `loadPatchFromFile()` + UI (botón en el editor web embebido, vía bridge/RPC)
  - [ ] Considerar `getNumPrograms()` > 1 o un browser de presets simple en el standalone
  - [ ] Tests: round-trip save/load del PatchDocument desde disco (Catch2)
- **Validación:** build exit 0 · test round-trip · smoke runtime con guardado manual

---

## 🟠 P1 — Rendimiento / robustez

### P1-1. Tormenta de recompilación: timer 30 ms + recompile incondicional

- **Archivos:** `host/src/Plugin/OmegaAudioProcessor.cpp` (`timerCallback`/`updateParameters`), `host/src/Core/Service/Config/EngineConfigManager.h` (`recompile()`)
- **Problema:** `updateParameters()` recorre **todos** los parámetros cada 30 ms y llama `mEngineConfig.updateParameter(...)` → `recompile()` **por cada uno, cada tick, aunque el valor no cambie**. Con N parámetros = N compilaciones de snapshot por tick.
- **Fix propuesto:**
  - [ ] Comparar valor anterior (`mLastParamValues` keyed por id) y saltar si no cambió
  - [ ] Recompilar **una sola vez por tick** (marcar `dirty` y compilar al final del loop)
  - [ ] Evaluar listeners JUCE (`AudioProcessorParameter::addListener`) en lugar de polling
  - [ ] Test de regresión: verificar que un tick sin cambios no llama a `recompile()` (contador/spy)
- **Validación:** build exit 0 · test de regresión · medición de CPU (si hay PerformanceMonitor ya integrado)

### P1-2. Ruta hardcodeada de debug en `SettingsDefaults.cpp` ✅

- **Archivos:** `host/src/Core/Service/Config/SettingsDefaults.cpp` (L19)
- **Problema:** `juce::File("d:/desarrollos/ABDOmega/Resources/system_settings.yaml")` es una ruta legacy que ya no existe (el proyecto es `ABDOmegaUnified`). El fallback silencioso devolvía defaults hardcodeados.
- **Fix aplicado:**
  - [x] **Nuevo `SettingsDefaults::resolveSystemSettingsYaml(exeFile, cwd)`** público y puro: walk-up desde el exe buscando `Resources/system_settings.yaml` en cada ancestro (mismo patrón que el catálogo en `prepareToPlay`, max 15 niveles) + fallback a `cwd/Resources` — cubre el layout real del build (exe en `build/src/Plugin/omega_plugin_artefacts/Release/`, Resources en `host/`) y el despliegue suelto en DAW
  - [x] **Ruta absoluta `d:/desarrollos/ABDOmega/...` eliminada**
  - [x] Test: `SettingsYamlResolution.test.cpp` (4 tests en `omega_core_tests` — walk-up profundo, Resources hermano del exe, cwd como último recurso, File vacío sin YAML)
- **Validación:** build exit 0 · `omega_core_tests` **43/271** (4 nuevos) · `omega_plugin` exit 0

### P1-3. Hardcodings en `RuntimeCompiler::compile` ✅

- **Archivos:** `host/src/Core/Compiler/Orchestration/RuntimeCompiler.cpp`
- **Problema:**
  - `snapshot.snapshotId = 1234;` — ID falso (debería ser derivado del contenido o un contador real)
  - `snapshot.voiceConfig.cutoff = 2000.0f;` — ignora el cutoff del patch (`layer.a.cutoff`)
  - `cc.amount = 1.0f;` — ignora el amount de la conexión
- **Fix aplicado:**
  - [x] **`snapshotId` + `planId` deterministas**: hash FNV-1a (32-bit, sin dependencias) del contenido — `hashPatchDocument` (módulos, params, conexiones, patchbayMatrix, FX globales) y `hashVoicePlan` (plan compilado). Antes: `snapshotId=1234` falso y `planId` nunca rellenado. Estables entre recompilaciones del mismo contenido, sensibles a cualquier cambio
  - [x] **`voiceConfig.cutoff` propagado**: `resolveVoiceConfigCutoff` busca el módulo `JunoFilter` del doc, resuelve el slot `"cutoff"` del catálogo y lee el ParamValue (id = slot+1, contrato `:44`); sin parámetro → defaultValue del catálogo; sin filtro → 2000 Hz (default VoiceConfig)
  - [x] **`cc.amount` desde el Patchbay Matrix**: `resolveConnectionAmount` correlaciona `PatchConnection` (instancias + índices de puerto) con `PatchbayMatrixSlot` (IDs `"instanceId.portId"` resueltos por los nombres de puerto del catálogo); slot activo → amount real; sin slot → 1.0 (default)
  - [x] Tests: `CompilerHardcodings.test.cpp` (3 tests, 16 assertions en `omega_core_tests`)
- **Validación:** build exit 0 · `omega_core_tests` **46/287** (3 nuevos) · `omega_plugin` exit 0

### P1-4. `getTailLengthSeconds()` = 0.1 s con release máximo de 10 s ✅

- **Archivos:** `host/src/Plugin/OmegaAudioProcessor.cpp`, `host/src/Plugin/TailLength.h` (nuevo), `host/src/Tests/TailLength.test.cpp`
- **Problema:** `env.release` llega a 10000 ms pero la cola declarada era 0.1 s → **clics al parar el transporte** cuando el sonido aún tiene cola de release.
- **Fix aplicado:**
  - [x] **Helper puro `computeTailLengthSeconds(releaseMs)`** en `TailLength.h`: `releaseMs/1000 + 0.5 s` de margen, mínimo 1.5 s — la cola nunca es insuficiente para el release real
  - [x] **Cache atómica `mTailLengthSeconds`** en `OmegaAudioProcessor`: inicializada al PEOR caso (max del registro 10000 ms → 10.5 s) en el constructor y refrescada por el timer con el valor REAL del APVTS (desnormalización 0-1 → rango físico 1-10000 ms del registro). `getTailLengthSeconds()` lee la cache (seguro desde el hilo de audio)
  - [x] Test: `TailLength.test.cpp` en `omega_plugin_tests` (helper + fuente de verdad del registro `layer.a.env.release`)
- **Validación:** build exit 0 · `omega_plugin_tests` **5/49** · sin clics en smoke runtime con release largo

---

## 🟡 P2 — Features / producto

### P2-1. Formato CLAP vía clap-juce-extensions ✅ (macOS/AU: item aparte, no viable en esta máquina)

- **Archivos:** `host/CMakeLists.txt`, `host/src/Plugin/CMakeLists.txt`, `host/third_party/clap-juce-extensions/` (gitignored), `host/.gitignore` (`/third_party/`)
- **Problema:** solo VST3 + Standalone (Windows). El mercado de DAWs modernos (Bitwig, Reaper 7, Studio One, FL Studio) favorece CLAP.
- **Diagnóstico corregido (2026-08-06, verificado 3 vías):** el JUCE **oficial** 8.x (8.0.12, 8.0.15 y `master` — API GitHub + tarballs) **NO incluye el formato CLAP**; las copias locales (host/JUCE, C:/JUCE, ABDOmega/JUCE) son 8.0.12 estándar, nunca estuvieron "podadas". Añadir `CLAP` a `FORMATS` no compilaría. La vía estándar del ecosistema (Surge XT, ChowDSP, Dexed) es el extension **`free-audio/clap-juce-extensions`** (MIT, forkless).
- **Fix aplicado:**
  - [x] **Dependencia local gitignored** `host/third_party/clap-juce-extensions` (misma convención que JUCE; `/third_party/` añadido a `host/.gitignore`), clonada con `--recursive`
  - [x] **`add_subdirectory(third_party/clap-juce-extensions EXCLUDE_FROM_ALL)`** en `host/CMakeLists.txt` tras `add_subdirectory(JUCE)` (requisito de orden del extension)
  - [x] **`clap_juce_extensions_plugin(TARGET omega_plugin CLAP_ID "com.abd-ia.omega" CLAP_FEATURES instrument synthesizer)`** en `host/src/Plugin/CMakeLists.txt` → genera `omega_plugin_CLAP` junto a VST3/Standalone (mismos sources, editor WebView2 y get/setStateInformation)
  - [x] **Compatibilidad JUCE 8.0.12**: el tag `0.26.0` del extension NO compila con JUCE 8.0.11+ (incluye `juce_audio_processors/format_types/juce_LegacyAudioParameter.cpp`, eliminado en 8.0.11) → **checkout al commit `645ed2f` "Compatibility with JUCE 8.0.11 (#169)"** (guards `#if JUCE_VERSION >= 0x08000B` + API CLAP 0.26) + `git submodule update --recursive` (los submodulos `clap-libs/*` en el tag 0.26.0 no tenían `CLAP_REMOTE_CONTROLS_COUNT`)
  - [x] **Validado que el plugin no usa `wrapperType`** → sin workaround necesario para CLAP (deja `Undefined`, aceptable)
  - [x] **Verificado el contrato CLAP en el binario**: `clap_entry` exportado (grep en el PE) y CLAP_ID `com.abd-ia.omega` == `BUNDLE_ID` de `juce_add_plugin` (consistencia con el VST3)
  - [ ] **Pendiente (fuera de scope de esta máquina):** macOS/AU (requiere macOS + Xcode; WebView2 es Windows-only → decisión de UI nativa) y smoke manual en DAW real (Bitwig/Reaper)
  - [ ] **Pendiente (decidir):** `omega_plugin_CLAP` NO está en el target por defecto (`EXCLUDE_FROM_ALL`) — `build_auto.bat` no lo produce. Añadir al pipeline (≈ duplica el tiempo de compilación del plugin) o mantener como paso explícito documentado en `BUILD.md` (setup del extension también documentado allí)
- **Validación:** build `omega_plugin_CLAP` exit 0 → **`omega_plugin_artefacts/Release/CLAP/OMEGA Synth.clap` (6.7 MB, PE32+ x86-64, `clap_entry` exportado)** · VST3/Standalone intactos · suites: core **53/312**, engine 10/38, ui **27/257**, plugin 5/49 — verdes tras el cambio · `omega_plugin` exit 0. **Nota de build:** los timeouts de 10 min mataron cl.exe a mitad de escritura → `LNK1136` en `juce_gui_extra.obj` (borrar el obj corrupto y recompilar). Si JUCE 9 trae CLAP nativo (APv2, 2026), migrar y eliminar el bloque del extension.

### P2-2. Sustain pedal (CC 64) y voicing

- **Archivos:** `host/src/Core/Input/Midi/MidiProcessor.cpp`, `host/src/Plugin/OmegaAudioProcessor.cpp` (depende del puente del P0-2)
- **Problema:** el sustain está registrado (CC 64) pero no se procesa. En el modelo modular, el CC 64 debe viajar como señal MIDI por el rack (vía `midi_in` → cables), no mapearse a un parámetro global.
- **Fix propuesto:**
  - [ ] Tras cablear el puente (P0-2): el CC 64 fluye como evento MIDI por el rack; los módulos consumidores (p. ej. `midi_trigger`) lo interpretan
  - [ ] Mantener las notas sostenidas a nivel de voz (no liberar voz mientras el pedal sostiene la nota) si el diseño lo requiere
  - [ ] Tests: secuencia NoteOn → pedal down → NoteOff → pedal up → verificar que la voz persiste (Catch2 o test de integración)
- **Validación:** build exit 0 · test de secuencia MIDI

### P2-3. Distribución: instalador y bootstrapper WebView2

- **Archivos:** raíz del proyecto (scripts de packaging), `host/src/Plugin/CMakeLists.txt`
- **Problema:** no hay instalador (InnoSetup/NSIS) ni zip portable; `COPY_PLUGIN_AFTER_BUILD FALSE`. El standalone depende de WebView2 runtime.
- **Fix propuesto:**
  - [ ] Script de empaquetado: VST3 + Standalone + `Resources/` + `system_settings.yaml`
  - [ ] Instalador InnoSetup (o NSIS) con bootstrapper de WebView2
  - [ ] Verificar firma/digi (opcional, roadmap)
- **Validación:** instalar en máquina limpia · standalone arranca sin WebView2 preinstalado

### P2-4. Presets / browser de patches ✅

- **Archivos:** `host/src/Core/Model/Patch/PatchDocument.h` (`createFactoryPresets`), `host/src/UI/Controllers/Library/RpcPresetController.cpp`, `host/src/UI/Persistence/PatchRepository.cpp`, `host/ui/src/Components/PresetBrowser.ts`, `host/ui/src/RPC/RpcCommandDispatcher.ts`
- **Problema (diagnóstico):** el backend y la UI ya estaban casi completos por P0-3 (PatchRepository + RPC + browser de 3 columnas), pero la librería **FACTORY era falsa**: el backend devolvía solo "Aseptic Init Patch" hardcodeado y el fallback de la UI mostraba 5 nombres de fábrica que **no existían en disco** → pulsar cualquiera cargaba el patch inicial en silencio (UX engañosa). Además no existía borrado de presets.
- **Fix aplicado:**
  - [x] **Librería de fábrica PROGRAMÁTICA**: `Core::Model::createFactoryPresets()` (fuente única, a prueba de versiones — sin JSON en disco que pueda quedar obsoleto): **Aseptic Init Patch** (midi_in) + **MIDI Monitor** (midi_in + omega_lab_monitor/TestParity). Solo módulos del catálogo runtime real
  - [x] **getBrowserData** lista la fábrica real (2 patches) — no el literal hardcodeado
  - [x] **loadPreset { target }**: 1) preset de usuario (disco, gana si el usuario guardó con el mismo nombre) → 2) patch de fábrica programático (se aplica el documento REAL, ya no el INIT silencioso) → 3) nombre desconocido → INIT (seguridad)
  - [x] **deletePreset** (RPC nuevo → `PatchRepository::remove`, con fix de honradez: `deleteFile()` de juce devuelve true aunque no exista → ahora `remove` falla si el archivo no está) + botón 🗑 en el browser (solo presets de usuario; los de fábrica no son borrables) + comando registrado en `RpcCommandDispatcher`
  - [x] Tests: 2 nuevos en `PresetPersistence.test.cpp` (fábrica lista/carga + precedencia usuario, delete con desconocidos/vacío)
- **Notas del revisor aplicadas:** nombre de fábrica coherente con el estado cargado (`Aseptic Init Patch` alinea `metadata.name` del doc — antes quedaba "Aseptic Initial Patch" en el wire/LCD) y comentario honesto del mapeo omega_lab_monitor→TestParity→"test_parity_v7" (el WASM instanciado en runtime es el de test_parity; gap de paridad catalog→typeId documentado)
- **Validación:** `omega_ui_tests` **27/257** (+2 tests) · core 53/312 · engine 10/38 · plugin 5/49 · plugin build exit 0 · vitest host/ui **294/294** + tsc exit 0 · bundle regenerado (contiene deletePreset) + smoke aridad 4/4 + paridad visual 8/8

### P2-5. Sincronización cables ↔ matrix + derivación del grafo de audio ✅

- **Origen:** nota del revisor del P1-3 — `doc.connections` solo se puebla vía round-trip de `VarSerialization`; los cables reales de la UI viven en `patchbayMatrix` con IDs `"instanceId.portId"` y **nunca llegaban al grafo de audio** del compilador (`connectionCount = 0` en uso real → cables decorativos).
- **Semántica (aclarada por el usuario):** sync **bidireccional** cables ↔ matrix (crear desde el frontal → matrix; matrix → cables) con soporte estructural de **grupos de entrada/salida** (crear/cambiar/eliminar).
- **Fix aplicado:**
  - [x] **Matrix → grafo de audio (lado funcional)**: `deriveAudioConnections` en `RuntimeCompiler::compile` — slots ACTIVOS con **ambos** puertos `ModPortType::Audio` (por catálogo) derivan `PatchConnection(Audio)` con `srcBus/dstBus` = índices de puerto y `amount` del slot (ruta primaria del P1-3). CV/Gate/MIDI no entran al grafo de audio (ruta futura `modRoutes` de `CompiledVoicePlan`). Las conexiones explícitas de un patch guardado **mandan** (sin doble enrutado). Nada se persiste: el grafo se re-deriva en cada compile desde la matrix (SOT, sin estado duplicado que se desincronice)
  - [x] **Matrix → recompile**: `handleUpdatePatchbayMatrixSlot` con guard de valor idéntico (patrón P1-1) + `mEngineConfig.recompile()` — un cable editado enruta audio en el siguiente snapshot (antes solo `forceRepaint`)
  - [x] **Grupos de I/O — lado eliminar**: `PatchCableSync.h` nuevo — `pruneOrphanedMatrixSlots(doc, instanceId)` elimina los slots (source/target/via) y conexiones que referencian el módulo removido; cableado en `RpcRackController::handleRemoveModule`. **Crear/cambiar**: cubiertos por el RPC (slots on-demand en drag-to-patch) + re-derivación en cada compile
  - [x] Tests: `PatchCableSync.test.cpp` (6 tests / 22 assertions en `omega_core_tests` — derivación audio, filtro de tipo CV/Gate, inactivos/desconocidos/ausentes, explícitas mandan, prune numérico, IDs legacy no numéricos)
- **Notas del revisor aplicadas:**
  - [x] **Dedup de conexiones derivadas**: dos slots activos con el mismo par audio→audio (matrix corrupta/preset) no enrutan la señal dos veces por el mismo bus — solo el primer slot cuenta (test de regresión añadido)
  - [x] **Sin copia incondicional de `doc.connections`** en `compile()` (antes copiaba el vector en cada recompile): el loop se extrajo a lambda `compileConnections` que itera por referencia; el vector derivado es temporal local
  - [x] **Guard `instanceId == 0`** en `handleRemoveModule` (las instancias empiezan en 1): un payload inválido no prunearía slots "0.*"
  - [x] **Cable fantasma DESCARTADO** (verificado): una mutación de matrix → recompile + `forceRepaint` → `RuntimeStore.applyState` notifica `Structure | Parameters` → `PatchCableManager.syncCablesFromState()` re-sincroniza y elimina el cable del SVG. Sin cambios frontend necesarios
- **Validación:** build exit 0 · core **53/312** (7 tests P2-x) · engine 10/38 · ui 25/237 · plugin 5/49 · `omega_plugin` exit 0

---

## 🟢 P3 — Proceso / higiene

### P3-1. CI pipeline (GitHub Actions + Windows runner)

- **Problema:** todo el tooling local (checks, smokes, builds) vive en `.bat`. Un CI lo automatizaría y daría visibilidad de regresiones.
- **Fix propuesto:**
  - [ ] Workflow con Windows runner: escáner paréntesis → parity manifiestos → guard defaults → jest (web) → vitest (host/ui) → tsc → build CMake Release → tests Catch2 → build WASM + smokes
  - [ ] Caché de dependencias (node_modules, emsdk, JUCE)
  - [ ] Artefactos: exe standalone + VST3 + módulos WASM
- **Validación:** ejecución verde en PR

### P3-2. Commit de migración a junctions incompleto

- **Problema:** los borrados staged de `host/Resources/modules/*` y `web/public/modules/*` están listos, pero el cambio de `.gitignore` (ignora `web/public/modules/` y `host/Resources/modules/`) **no está staged**. El commit de la migración quedaría a medias.
- **Fix propuesto:**
  - [ ] `git add .gitignore` junto con los borrados staged
  - [ ] Commit único documentando la migración a junctions (fuente canónica `modules/`)
  - [ ] Verificar `git status` limpio tras el commit
- **Validación:** `git status` sin pendientes · build desde checkout limpio

### P3-3. Limpieza de código muerto

- **Archivos:** `host/src/Plugin/OmegaAudioProcessor.h` (`mUiMidiQueue`/`mUiMidiLock`), `host/src/Core/Input/Midi/MidiProcessor.*` (si no se cablea en P0-2)
- **Problema:** miembros declarados y nunca usados; clase MIDI sin callers.
- **Fix propuesto:**
  - [ ] Eliminar `mUiMidiQueue`/`mUiMidiLock` si se confirma 0 usos
  - [ ] Tras P0-2, eliminar o cablear `MidiProcessor` (decisión según implementación)
  - [ ] Escaneo final de símbolos sin referencia (script o manual)
- **Validación:** build exit 0 · grep 0 referencias

### P3-4. Tests DSP golden values + arreglo de branding

- **Problema:** el engine (osciladores, filtros, envolventes, voice-stealing) no tiene tests de valores dorados — los bugs P0-1/P0-2 no los habría pillado ningún test actual. Además `getName()` devuelve `"ABD OMEGA 2.0"` mientras `PRODUCT_NAME` es `"OMEGA Synth"`.
- **Fix propuesto:**
  - [ ] Tests golden de `OmegaAsepticVoice` (frecuencia, envolvente, salida esperada a N muestras)
  - [ ] Test de voice-stealing (robo de voz LRU correcto)
  - [ ] Unificar `getName()` con `PRODUCT_NAME` ("OMEGA Synth")
- **Validación:** nuevos tests verdes · build exit 0

---

## ✅ Prioridad sugerida

1. 🔴 **P0-1** Polifonía > 16 voces (crash potencial) — acotado, alto impacto
2. 🔴 **P0-2** MIDI CC (funcionalidad completa rota)
3. 🔴 **P0-3** `saveCurrentPatch` + persistencia de patches
4. 🟠 **P1-1** Timer 30 ms + recompile (CPU)
5. 🟠 **P1-2 → P1-4** Hardcodings y tail length
6. 🟡 **P2-2 → P2-3** sustain, distribución
7. 🟢 **P3-1 → P3-4** CI, commit junctions, dead code, tests DSP

---

## 📊 Log de progreso

| Fecha | Item | Estado | Notas |
|---|---|---|---|
| 2026-08-06 | Informe de revisión + plan | ✅ | Generado `PLUGIN_IMPROVEMENT_PLAN.md` con P0-P3 (15 items) |
| 2026-08-06 | 2ª revisión — diagnóstico corregido | ✅ | Feedback del usuario: polifonía ya configurable en settings (`numVoices`, 1-16) y semántica por-voz-del-rack; MIDI modular vía `midi_in`→cables. P0-1/P0-2/P2-2 reescritos |
| 2026-08-06 | **P0-1 Polifonía (duplicado `polyphony` + clamp)** | ✅ | `SettingsDefaults.cpp`: id `polyphony`→`numVoices` (1-16, default 16, alineado al YAML). `SystemSettingsManager.h`: `kMaxVoices=16` + `clampNumVoices()` puro + clamp en `getNumVoices()`. `VirtualAnalogEngine.h/.cpp`: arrays/loops/`%16` → `kVoiceCount`. `OmegaAudioProcessor.h/.cpp`: `mVoiceLastUsed[kMaxVoices]`, loops → kMaxVoices, **fix OOB AllNotesOff** (`mNoteToVoice[mVoiceLastUsed[v]]` usaba timestamp como índice → corrupción) y **fix stealing** (indexado por voz en array nota→voz). Nuevo `SettingsPolyphony.test.cpp` (3 tests). Suite: core 36/250, engine 6/21, ui 16/129, plugin 2/34 — todos verdes; `omega_plugin` compila exit 0 |
| 2026-08-06 | **P0-2 Puente MIDI sistema→midi_in** | ✅ | **Modular puro** (decisión del usuario) + `midi_in` en el patch por defecto. `CompiledVoicePlan.h`: nuevo `midiTargets[]` (kMaxMidiTargets=8). `RuntimeCompiler`: rellena midiTargets con units cuyo módulo del catálogo tiene puerto `ModPortType::MIDI` input. `WasmModuleService`: overload `dispatchMidi(manifestId, voiceIdx, ...)` + `setVoiceTriggerCallback`. `WasmHostInterface::omega_publish_midi`: resuelve la voz del exec_env → inyecta al bus `modularMidi` de la voz + dispara la voz del engine (NoteOn/Off). `VirtualAnalogEngine`: registra callback (`onModuleMidi` → noteOn/noteOff con freq MIDI) y despacha el bus de cada voz a los midiTargets del plan (despacho independiente de isActive — fix revisor: los CC a voz inactiva no quedan atrapados; count capturado antes del loop — sin ecos en cadena). `OmegaAudioProcessor`: `dispatchSystemMidi` (enruta sistema → módulo midi_in del rack; sin midi_in no entran notas) + `processBlock` procesa CC como eventos MIDI (no params). `PatchDocument.h`: `createDefaultPatch()` con midi_in (fuente única) usada en `handleNewPreset` y en `prepareToPlay` (arranque). Nuevo `MidiBridge.test.cpp` (3 tests). Suite: core 39/263, engine 6/21, ui 16/129, plugin 2/34 — todos verdes; `omega_plugin` exit 0. **Notas del revisor aplicadas**: (a) despacho del bus sin gate de voz activa + count capturado; (b) desync `mNoteToVoice` documentado (paths sistema/module coexistente); (c) **simplificación aceptada**: los CC del sistema se enrutan por el midi_in de la **voz 0** (solo los targets de la voz 0 los ven) — revisar si se quiere broadcast en una fase posterior |
| 2026-08-06 | **P0-3 Persistencia de patches a disco** | ✅ | **PatchRepository** nuevo (`host/src/UI/Persistence/`): save/load/list/remove/saveCurrent/loadCurrent en JSON (round-trip COMPLETO vía `VarSerialization` — metadata, módulos, conexiones, globalFxParams y patchbayMatrix 7/7, campos que el binario del plugin omite), en `%AppData%/ABDOmega/patches`, con `sanitizeName` y autosave `current.patch.json` excluido del listado. **RpcPresetController** conectado al disco: `savePreset {name}` escribe archivo (legacy `{data}` conservado), `loadPreset {target}` carga por nombre (target desconocido → patch inicial, p. ej. patches de fábrica), `listPresets` lee el directorio (antes literal hardcodeado), `getBrowserData` devuelve FACTORY + USER PRESETS reales, nuevo comando `saveCurrentPatch`. **OmegaAudioProcessor**: `saveCurrentPatch()` implementado (stub TODO → autosave), destructor guarda la sesión, `prepareToPlay` restaura `current.patch.json` (fallback `createDefaultPatch`). **UI TS**: `index.ts` envía `savePreset {name}`; `PresetBrowser.selectPreset` → `loadPreset {target}` (antes payload vacío = no-op). Tests: `PatchRepository.test.cpp` (6) + `PresetPersistence.test.cpp` (4, integración RPC con repo temporal) en `omega_ui_tests` → **25 tests / 237 assertions** (antes 16/129); core 39/263 intacto. Notas: `include_directories(src/UI/Persistence)` añadido al CMake raíz; en este JUCE `File::replaceWithText` devuelve **bool** (no Result) |
| 2026-08-06 | **P1-1 Tormenta de recompilación (timer 30 ms)** | ✅ | **Guards de valor idéntico** en `EngineConfigManager::updateParameter` (numérico, `updateGlobalFxParameter`, `LAYERAMAINVCAGAIN`): si el valor no cambia → sin `recompile()`. **Modo lote** (`beginBatch`/`endBatch` + `markDirty()` privado como ÚNICO punto de decisión): el timer envuelve su loop con el lote → a lo sumo **1 recompilación por tick** (0 si nada cambió; antes N por tick incondicionalmente). Fuera del lote el comportamiento es el previo (recompile inmediata por cambio — RPC/UI intactos). **Listeners JUCE evaluados y descartados por ahora**: el polling con guards es el fix mínimo sin cambiar el modelo de sincronización APVTS→config; migrar a listeners = cambio arquitectónico a evaluar en P2+. Test de regresión: `SnapshotRecompileGuard.test.cpp` (4 tests) en `omega_engine_tests` — verifica vía identidad del puntero del snapshot (doble buffer) que un valor idéntico no recompila, que un lote con N cambios recompila una vez sin perder valores, y que endBatch sin lote / beginBatch anidado son no-ops seguros. **Nota del revisor aplicada**: `beginBatch` anidado ya no resetea el dirty del lote exterior y `endBatch` sin lote activo es no-op defensivo |
| 2026-08-06 | **P1-2 Ruta legacy settings** | ✅ | **`SettingsDefaults::resolveSystemSettingsYaml(exeFile, cwd)`** nuevo (público + puro): walk-up desde el exe (patrón del catálogo en prepareToPlay, max 15 niveles) + fallback cwd/Resources — elimina `juce::File("d:/desarrollos/ABDOmega/...")`. Nuevo `SettingsYamlResolution.test.cpp` (4 tests: walk-up profundo, Resources hermano, cwd último recurso, File vacío). Suite: core **43/271** (4 nuevos), `omega_plugin` exit 0 |
| 2026-08-06 | **P1-3 Hardcodings compiler** | ✅ | **RuntimeCompiler sin literales falsos**: `snapshotId`/`planId` = hash FNV-1a determinista del contenido (doc fuente / plan compilado, incl. executionOrder) — antes `snapshotId=1234` fijo y `planId` sin rellenar. `voiceConfig.cutoff` propagado desde el módulo JunoFilter (ruta `layer.a.cutoff`, slot del catálogo, ParamId=slot+1; fallbacks: defaultValue del catálogo → default canónico `VoiceConfig{}.cutoff`). `cc.amount` leído del Patchbay Matrix activo (correlación `"instanceId.portId"` vía nombres de puerto del catálogo; sin slot → 1.0). Nuevo `CompilerHardcodings.test.cpp` (3 tests / 16 assertions, nombres de puerto realistas `out`/`in`/`cutoff_cv`). **Notas del revisor aplicadas**: contrato `sourcePortId = índice en catalog.ports` documentado en `PatchConnection.h` + nota en `resolveConnectionAmount` (hoy `doc.connections` solo se puebla vía round-trip VarSerialization; fallback 1.0 seguro); duplicación de la ruta cutoff con `semanticRoutes()` señalizada en AMBOS sitios; `executionOrder` incorporado al hash del plan. Suite: core **46/287**, engine 10/38, ui 25/237, `omega_plugin` exit 0 |
| — | P1-4 Tail length | ✅ | **`computeTailLengthSeconds(releaseMs)`** puro (`TailLength.h`): release/1000 + 0.5 s margen (min 1.5 s). Cache atómica `mTailLengthSeconds` en `OmegaAudioProcessor` (peor caso 10.5 s en arranque; timer refresca con el release real desnormalizado del APVTS). `getTailLengthSeconds()` lee la cache atómica. Nuevo `TailLength.test.cpp` (3 tests) en `omega_plugin_tests`. Suite: plugin **5/49**, core 52/309, engine 10/38, ui 25/237 — verdes; `omega_plugin` exit 0 |
| — | P2-5 Sync cables ↔ matrix | ✅ | **Derivación del grafo de audio desde el patchbayMatrix** (`deriveAudioConnections` en `RuntimeCompiler::compile`): slots activos audio→audio → `PatchConnection(Audio)` con índices de puerto y amount del slot; explícitas de patch guardado mandan; CV/Gate/MIDI excluidos (ruta futura `modRoutes`). **`handlePatchbayMatrixSlot` recompila** con guard de valor idéntico (antes solo repintaba → los cables no enrutaban audio). **`PatchCableSync.h`** (nuevo): `pruneOrphanedMatrixSlots` en `removeModule` — grupos de I/O huérfanos eliminados. **Notas del revisor aplicadas**: dedup de pares duplicados, lambda `compileConnections` sin copia incondicional, guard `instanceId==0` en removeModule, cable fantasma descartado (forceRepaint → applyState → Structure → re-sync). Nuevo `PatchCableSync.test.cpp` (7 tests / 25 assertions). Suite: core **53/312**, engine 10/38, ui 25/237, plugin 5/49 — verdes; `omega_plugin` exit 0 |
| — | P2-4 Presets reales | ✅ | **Librería de fábrica programática** `createFactoryPresets()` (Aseptic Init Patch + MIDI Monitor — solo módulos del catálogo runtime) en `getBrowserData` (antes 1 hardcodeado) y `loadPreset` (fábrica real aplicada, precedencia del usuario que guarde con el mismo nombre, desconocido → INIT). **deletePreset** RPC nuevo + `PatchRepository::remove` honesto (deleteFile de juce devolvía true sin archivo) + botón 🗑 en `PresetBrowser.ts` (solo user, fábrica no borrable) + comando en el dispatcher. Tests: 2 nuevos en `PresetPersistence.test.cpp` (19 assertions). Suite: ui **27/257**, core 53/312, engine 10/38, plugin 5/49 — verdes; vitest host/ui **294/294** + tsc 0; bundle regenerado + smoke aridad/paridad ✅ |
| — | P2-1 CLAP (formato) | ✅ | **CLAP via clap-juce-extensions** (forkless, MIT) en `host/third_party` (gitignored). Diagnóstico corregido: el JUCE oficial 8.x NO trae CLAP (ni 8.0.12/8.0.15/master) — las copias locales nunca estuvieron podadas. `clap_juce_extensions_plugin(...)` genera `omega_plugin_CLAP` → **`OMEGA Synth.clap` (6.7 MB)** en `omega_plugin_artefacts/Release/CLAP/`. Tag 0.26.0 incompatible con JUCE 8.0.11+ (LegacyAudioParameter eliminado) → checkout commit `645ed2f` (compat 8.0.11, API CLAP 0.26) + submodulos actualizados. Suites C++ verdes (core 53/312, engine 10/38, ui 27/257, plugin 5/49). macOS/AU pendiente (requiere macOS + decisión de UI) |
| — | P2-2 Sustain pedal | ⬜ | Pendiente — depende del puente P0-2 |
| — | P2-3 Distribución | ⬜ | Pendiente |

| — | P3-1 CI | ⬜ | Pendiente |
| — | P3-2 Commit junctions | ⬜ | Pendiente |
| — | P3-3 Dead code | ⬜ | Pendiente |
| — | P3-4 Tests DSP + branding | ⬜ | Pendiente |

---

## Reglas de proceso

- Ir **item por item**; no mezclar cambios de distintos items en el mismo commit (misma convención que `REFACTORING_PLAN.md`).
- Validar tras cada item: `build_auto.bat` (o build CMake Release) + suites afectadas (Catch2 / vitest / jest según área).
- Los P0 son bloqueantes: corregir antes de cualquier feature nueva.
- Marcar en la tabla de progreso al cerrar cada item, con fecha y número de changelog si aplica.
- Los tests deben acompañar a cada fix (regresión), no solo validación manual.
