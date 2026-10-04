# 📝 OMEGA Changelog

Este archivo registra todos los cambios significativos, mejoras y correcciones del sintetizador OMEGA.

## [2026-10-04] — Despliegue en READY tras el arreglo de la lambda `api/modules`, y eliminado un fichero muerto

### Fixed
- **Despliegue en Vercel: la lambda `api/modules` arrastraba el repo entero y Vercel la rechazaba.** La ruta resuelve la estantería con `..`, fuera de la raíz de Next, y Turbopack trazaba las llamadas a `fs`: `.next/server/app/api/modules/route.js.nft.json` medía **3827 ficheros / 294.07 MB** (frente a 113 ficheros / 26.74 MB de `app/api/audio`), colando `exports/` (105.81 MB), `src/` (62.96), `public/` (53.21), `docs/` (48.52) y `wasm-runtime/` (19.68). En Vercel: lambda de **264.38 MB**, por encima del límite de 250 MB, despliegue en ERROR. Con anotaciones `turbopackIgnore` la traza baja a **96 ficheros / 1.59 MB** y el aviso "the whole project was traced unintentionally" desaparece.
- **La colocación de la anotación no es la que recomienda el aviso del build.** El aviso sugiere annotar el `path.join`, pero vercel/next.js#95125 lo mide en esta misma versión de Next: solo silencia cuando la anotación va sobre una **variable desnuda** pasada directamente a la llamada `fs`. Por eso cada ruta se calcula en una variable aparte y no queda ningún `path.join` anidado dentro de un `fs`.
- **Puerta nueva del peso de la lambda** (`scripts/check-api-modules-trace.mjs`): mide los bytes reales de la traza y falla por encima de **200 MB**, más estricto que Vercel a propósito. Va en el CI **después** del build, porque la traza solo existe tras `next build`. Comprobada en rojo y en verde de extremo a extremo.

### Removed
- **`web/src/services/mockupService.ts` (41 líneas, código muerto confirmado).** `MockupService` no tenía ni un call site: `git grep` sobre el repo versionado solo devuelve su propia declaración. Ni barrel, ni import dinámico, ni test. Leía `ui.controls`/`ui.jacks`, campos que la proyección a listas planas ya no escribe. **El obstáculo era el guard DRY**: estaba en `consumerFiles.web` de `canonicalDefaults.config.json` y la spec hace `readFileSync` sin `try`, así que quitar el fichero sin quitar la entrada rompe la suite con `ENOENT` (verificado en rojo a propósito). Las entradas de los builds anteriores que lo citan como fixture de test negativo **se conservan**: registran lo que se verificó en su fecha.

### Validation
- Guard DRY verificado en los **TRES ejecutores**: jest 24/24 (25 → 24, uno menos por el fichero borrado), vitest host/ui 4/4, CLI `check_canonical_defaults.mjs` exit 0 con **19 ficheros escaneados** (antes 20).

---
## [Build #731] - 2026-08-06 — "Nuevo módulo MIDI 2 CV + 440demo ampliado a 3 params + verificaciones runtime (16/16, 13/13, player E2E)"

### Added
- **Nuevo módulo `modules/midi_2_cv/`** (estantería canónica, junctions a `web/public/modules` y `host/Resources/modules`): conversor **Pro MIDI-CV industrial** — convierte eventos MIDI (Note On/Off, Pitch Bend) en **CV/Gate/Velocity** para la vía de voz del host. Migrado del repo legacy `ABDOmega plugins` (`_historical/modules/midi_2_cv.cpp`).
  - **`midi_2_cv.cpp`**: módulo de **control** (no genera audio — los CV se publican vía imports del host `omega_set_voice_freq/vel/at` + telemetría de gate). DSP **zero-libm**: tabla de semitonos `SEMITONE_TABLE` + duplicación de octavas para MIDI→Hz (69 → 440 Hz, 60 → C4 ≈ 261,63 Hz), **pitch bend** normalizado con sensibilidad 0.7 frente al rango en semitonos (`bend_range`), **glide por rampa por muestra** (`glide_time` en ms, sin salto al target) y **omnicanal** por defecto (`midi_channel=0` responde a cualquier canal; con canal fijo filtra el resto). Constantes MIDI centralizadas en `OmegaConstants.h` — sin magic numbers.
  - **`midi_2_cv.contract.json`**: **5 parámetros** — `midi_channel` (0..16, default 0 = omnicanal), `glide_mode` (bin 0/1, default 0), `glide_time` (0..2000 ms, default 0), `bend_range` (0..24 st, default 2), `at_mode` (bin 0/1, default 0) — y **4 puertos**: `cv_out` (output/cv), `gate_out` (output/gate), `vel_out` (output/cv), `at_out` (output/cv, aftertouch). Family `control`.
  - **`midi_2_cv.acemm`**: **1U, 8 HP (120×140)** — 4 puertos en fila (CV cyan, GATE silver, VEL cyan, AT cyan) en container único `main` "CV/GATE", rejilla 5px; params expuestos como controles ocultos editables vía inspector/RPC.
  - **`midi_2_cv.wasm`** compilado con Emscripten (SIDE_MODULE) — **3.391 B**, exports ACE completos (`omega_get_contract`/`init`/`on_midi`/`on_param`/`process`). **`README.md`** con contrato, DSP y gaps conocidos (el `at_out` queda conectado a `omega_set_voice_at` sin fuente: el cpp histórico no emite Channel Pressure 0xD0 — implementación pendiente documentada).
- **`scripts/build_wasm.bat` — pipeline ampliado a 8 pasos**: [5/8] compila `midi_2_cv` (+ `copy /Y` a `modules/midi_2_cv/`) y **[8/8] verificación runtime del midi_2_cv en node** (fail-fast) — el pipeline queda simétrico al del 440demo ([7/8] verificación 440demo): **5 módulos compilados + 2 verificaciones runtime** integradas en el build.
- **`scripts/verify_midi_2_cv_runtime.mjs`** — verificador runtime del midi_2_cv (**16/16 checks**): instancia el `.wasm` **real** con stubs de host (`omega_publish_telemetry` + `omega_set_voice_*`) y verifica: contrato embebido == `contract.json`, **omnicanal** (canal 0 responde a cualquier canal), Note On → gate=1.0 + velocity=data2/127 + freq=midiToHz(note), Note Off (y Note On con velocity 0) → gate=0.0, pitch bend (freq sube con bend hacia arriba), **filtrado de canal** (`midi_channel=1` ignora canal 5, acepta canal 1) y **glide** (sin salto directo, rampa intermedia, target alcanzado exactamente). Valores esperados derivados de `OmegaConstants.h` — sin magic numbers.
- **440demo ampliado de 1 a 3 parámetros**: `enabled` (bin, default **1 ON**) + **`amplitude`** (0..1, default 0.5 — controla el volumen del tono) + **`led_rate`** (1..30 Hz, default 8 — cadencia del LED). Coherente en la triple fuente: `440demo.contract.json` ↔ `440demo.acemm` (knobs `k_amplitude`/`k_led_rate`) ↔ wasm embebido (`omega_get_contract`). `verify_440demo_runtime.mjs` **actualizado a 13/13 checks** (antes 11/11): los valores esperados ahora se derivan del contrato — `amplitude=1.0` → RMS ≈ 0.707 (doble del default), `led_rate=4` → 4 actualizaciones/s.
- **Catálogo ACEMM regenerado a 6 módulos** (`generate_acemm_catalog.mjs` → 440demo, midi_2_cv, midi_in, midi_trigger, omega_lab_monitor, test_parity) y **`host/ui/bundle.js` regenerado** con esbuild (posterior al source, al día).

### Fixed
- **Player 440demo (web): `fetch` no existe en el `AudioWorkletGlobalScope`** — el worklet `tone440.worklet.js` intentaba `fetch('/wasm/440demo.wasm')` dentro del worklet y fallaba con `fetch is not defined` → el badge quedaba en `⚠️ fetch is not defined` y el tono nunca sonaba en el player web (el DSP del binario estaba verificado, pero la cadena E2E del player estaba rota). Fix: el `fetch` del wasm se mueve al **hilo principal** (`RackPlayerContainer.tsx` — donde `fetch` sí existe) y los bytes se **transfieren al worklet por `postMessage({type:'loadWasm'})`** con transfer list; el worklet instancia desde los bytes recibidos. El guard de `setEnabled` se conserva (control futuro del switch). Verificado con `verify_440demo_player_audio.mjs` **6/6 PASS** (START → badge LIVE, PAUSE → cierre del grafo, reinicio, 0 errores de consola).

### Validation
- `verify_midi_2_cv_runtime.mjs` **16/16 PASS** contra el binario final · `verify_440demo_runtime.mjs` **13/13 PASS** · `wasm-smoke.mjs` **ALL OK** · `verify_440demo_player_audio.mjs` **6/6 PASS** (2 ejecuciones consecutivas) · `check_manifest_parity` **OK** (6 módulos, fuente única vía junctions) · `npm run test:smoke` host/ui **16/16** · `tsc --noEmit` web exit 0.
- `build_no.txt` = **731** == tope del changelog (**sin drift**).

## [Build #730] - 2026-08-05 — "Verificación runtime del 440demo + test de contrato + exe standalone + catálogo del player"

### Added
- **`scripts/verify_440demo_runtime.mjs`** — verificador runtime del 440demo (**11/11 checks**): instancia el `.wasm` **real** (el mismo que el host carga vía junction) con stubs de host (`memory`/`__memory_base`/`omega_publish_telemetry`) y verifica: contrato embebido (`omega_get_contract`) == `contract.json`, tono **440 Hz exacto** (440 cruces por cero/s), RMS 0.3533 (amplitud 0.5), bus 1 == bus 0 (vía voz, L/R duplicado), **LED: 8 actualizaciones/s con brillo oscilante**, switch **ON por defecto** (suena nada más instanciar) → OFF = silencio + LED 0 → ON = el tono vuelve. Integrado como paso **[6/6] en `build_wasm.bat`** (híbrido node: skip si no hay node en PATH, fail-fast si el verificador falla).
- **`host/ui/tests/440demo.contract.test.ts`** (5 tests, vitest): parsea el `.acemm` canónico (js-yaml vía `createRequire` anclado a `web/package.json` — sin instalar dependencias) y valida la cadena **manifiesto ↔ catálogo generado ↔ contract.json**: entrada del catálogo (1U/4HP, 60×140, controls), todo `bind` del panel resuelto contra el contrato (sin binds colgantes) + cobertura inversa (cada param/port del contrato enlazado), `enabled` binario 0/1 **default 1 (ON)**, puertos `audio_out` output/audio y `led_activity` output/led. Suite host/ui: **20 files / 293 tests**.
- **`scripts/wasm-smoke.mjs` extendido a los 4 módulos** — el 440demo se instancia y ejercita en el smoke canónico del repo (contract `id=440demo`, 1 param, 2 ports; `__wasm_call_ctors`/`init`/`on_midi`/`on_param`/`process` OK) — **RESULT: ALL OK**.
- **`web/src/services/sharedModuleCatalog.ts` — entrada del 440demo en el catálogo compartido del player**: `/en/player` lista módulos desde este catálogo **explícito** (tenía 4 entradas: midi_in, midi_trigger, omega_lab_monitor, test_parity_v7) — el 440demo no estaba registrado (su `.acemm`/`.wasm` ya se servían por HTTP vía junction). Añadida la entrada (utility, 4 HP, manifest `/modules/440demo/440demo.acemm`, wasm `/wasm/440demo.wasm`). El editor/workbench (mismo servicio) también lo ve.
- **Build #730 completo con el 440demo en el pipeline**: 0 paréntesis (14 archivos/0 issues) → 0.5 rpc_contract (26 tests) → 0.6 parity + catálogo regenerado (**5 módulos**) → 0.7 guard defaults (20 archivos/0 violaciones) → tsc + esbuild (**Build #730**) → **test:smoke 16/16** (canonicalDefaults 4 + arity 4 + visualParity 8) → CMake configure → `omega_plugin_Standalone` → **`OMEGA_Synth.exe`** (7,3 MB) con el catálogo 440demo embebido (verificado dentro de `omega_ui_embedded.zip`). **Standalone verificado en runtime**: arranca y se mantiene vivo (lanzado vía `Start-Process`, vivo a los 6 s, terminado limpiamente, 0 procesos residuales).

### Fixed
- **Bug crítico SIDE_MODULE self-import** (detectado por la verificación runtime): `omega_process` llamaba al **import** `_ZN7Tone4407processEPfi` (stub no-op) en vez de la implementación local — el módulo habría sonado **mudo también en el standalone real** (WAMR tendría que resolver el import). Confirmado con `llvm-objdump` (`call 0` → función importada). Fix: el DSP pasa a **funciones de enlace interno (anonymous namespace)** — el wasm solo importa `omega_publish_telemetry` + memory estándar, como los módulos preexistentes (de hecho 440demo queda más limpio: `midi_trigger`/`omega_lab_monitor` recompilados sí importan símbolos propios — patrón pre-existente del host).
- **LED congelado en 0 (lock de fase)** — corrección de lo descrito en #729: muestrear el seno de 440 Hz a exactamente 8 Hz fija el fasor en **55 ciclos exactos por hold** (440/8 = 55) → siempre `|sin(0)| = 0` (LED apagado constante). El LED ahora es **S&H a 8 Hz de un LFO rectificado de 3 Hz** (tasas coprimas → el fasor deriva en cada hold → brillo oscilante visible; **8 actualizaciones/s**, envolvente de brillo con periodo 0,5 s). README actualizado con la precisión.
- **Incidencia LNK1104 en el build #730** (no relacionada con el módulo): race de MSBuild en paralelo — el link de `omega_engine.lib` no pudo abrir `juce_gui_basics.obj` (25 MB, fase LTCG "Generando código...") porque `cl.exe` huérfano aún lo escribía/bloqueaba. Remedio: matar los procesos MSBuild/cl huérfanos y re-ejecutar **solo el paso CMake** (sin tocar `build_no` ni el bundle, ya en 730 validados) → build exit 0.

### Validation
- `verify_440demo_runtime.mjs` **11/11 PASS** contra el binario final · `wasm-smoke.mjs` **ALL OK (4/4)** · vitest contract **5/5** · suite host/ui **20 files / 293 tests** · tsc web + host/ui exit 0 · escáner paréntesis 0 issues · assets del 440demo por HTTP **200/200**.
- Chromium (browser-use) en `http://localhost:6789/en/player`: **440 DEMO renderizado** en el rack (switch ON, LED ACT, port OUT), contador **MÓDULOS: 5**, presente en el modal "AÑADIR MÓDULO AL RACK", **0 errores de consola**.
- `build_no.txt` = **730** == tope del changelog (**sin drift**; próximo build será #731).

## [Build #729] - 2026-08-05 — "Nuevo módulo 440demo: generador de tono de prueba 440 Hz (1U, switch ON por defecto, LED de actividad)"

### Added
- **Nuevo módulo `modules/440demo/`** (estantería canónica, junctions a `web/public/modules` y `host/Resources/modules`): generador de tono senoidal fijo **440 Hz (A4)** para pruebas de sonido.
  - **`440demo.cpp`**: contract ACE (`OMEGA_FAMILY("utility")` + param `enabled` bin **default 1** — suena nada más cargarse — + ports `audio_out` (output/audio) y `led_activity` (output/led)). Seno por **aproximación racional de Bhaskara I** (`sinApprox`) — **sin libm**, imprescindible para SIDE_MODULE de Emscripten (coherente con el estilo zero-stdlib del ecosistema). `omega_process(float*, length)` escribe el tono (amplitud 0.5) en los buses de la voz (bus 0=L, 1=R con length==1) y **LED por sample-and-hold del seno rectificado a ~8 Hz** (440 Hz crudo supera el flicker-fusion; el pulso es visible). Nota del revisor aplicada: el contador de telemetría acumula **muestras** (`+= length`), no llamadas — mantiene ~8 Hz tanto en la vía de voz (length==1) como en la de bloque (rack global).
  - **`440demo.acemm`**: **1U de alto, 4 HP (60px — ancho mínimo con switch + LED + port)**, container único `main` con `switch` (cyan, bind `enabled`), `led` (orange, bind `led_activity`) y `port` (cyan, bind `audio_out`), attachments de label; rejilla 5px.
  - **`440demo.wasm`** compilado con Emscripten 6.x (cabecera `\0asm` válida, 1.769 B) — exporta los 5 símbolos ACE (`omega_get_contract`, `omega_init/on_param/on_midi/process`).
  - **`440demo.contract.json`** coherente con el autogenerado por `omega_get_contract`; **`module_logo.svg`** (logo industrial "440" + onda seno, estilo omega_lab_monitor); **`README.md`** con contrato, DSP y compilación.
- **`scripts/build_wasm.bat` — paso [5/5] para 440demo + unificación de la copia canónica**: el host carga el `.wasm` desde `modules/<id>/` (vía junction, `ManifestSourceDir.cpp`), pero los pasos [2/4]-[4/4] solo emitían a `web/public/wasm/` — los `.wasm` de los 3 módulos preexistentes en `modules/` estaban **stale (Mayo)** frente a los de Agosto en `web/public/wasm`. Fix del revisor aplicado: `copy /Y` a `modules/<id>/<id>.wasm` en **los 4 módulos** (440demo + midi_in + midi_trigger + omega_lab_monitor) — el pipeline queda unificado y sincroniza siempre la copia que lee el host.
- **Catálogo ACEMM regenerado** (`generate_acemm_catalog.mjs` → **5 módulos**, 440demo con rack `{hp:4, units:1U, slot:upper}`) y **`host/ui/bundle.js` regenerado** (440demo presente, buildId 728, diff 0 vs regeneración limpia).

### Fixed
- **Bug DSP del contador de LED** (detectado en code review): `mSampleCounter++` por *llamada* a `process()` en vez de por *muestra* — en la vía del rack global (`ModulationRuntime::processNode`, length=blockSize) la telemetría habría disparado a ~1/8 del block rate en vez de ~8 Hz. Corregido a `mSampleCounter += length`.

### Validation
- `em++` compila exit 0; cabecera `\0asm` verificada; exports ACE confirmados con `llvm-nm` (`omega_get_contract`, `omega_init`, `omega_on_param`, `omega_on_midi`, `omega_process`).
- `check_manifest_parity` **exit 0** (5 módulos canónicos + catálogo al día) · dry-run del generador OK · guard de defaults canónicos (CLI) OK · tsc `--noEmit` exit 0 en web y host/ui · vitest host/ui **19 files / 288 tests** · escáner `check_bat_parens` **0 issues** en `build_wasm.bat` · junctions verificadas (módulo visible en `web/public/modules/440demo/` y `host/Resources/modules/440demo/`).
- Nota documentada en README: limitación pre-existente del host — `omega_publish_telemetry` registra el pin con `instanceId = "midi_in"` hardcodeado (fallback), la separación de telemetría por-módulo requeriría cambio de host.

## [Build #728] - 2026-08-05 — "Smoke de bundle integrado en build_auto.bat: validación post-regen de aridad + paridad visual"

### Added
- **`npm run test:smoke` en `host/ui/package.json`**: ejecuta **secuencialmente** los 3 archivos (proceso vitest fresco por archivo, evitando la **contención de transform/cache** observada al lanzar instancias en paralelo — timeout 240s en la sesión de validación): `tests/canonicalDefaults.test.ts` (4 tests — guard de defaults canónicos de host/ui), `tests/bundle-arity.smoke.test.ts` (4 tests — aridad 2-arg de `ModuleRenderer` contra el bundle **real**) y `tests/renderers/visualParity.test.ts` (8 tests — junction byte-idéntico, paridad editor/runtime, chassis unificado, golden snapshot). **Triple validación: guard + aridad + paridad** en un solo comando.
- **`build_auto.bat` — validación post-regen del bundle**: tras el `esbuild` (paso 1), `call npm run test:smoke || (popd & exit /b 1)` valida el bundle **recién generado** (con el `build_no` del build actual vía `--define:window.OMEGA_BUILD_ID`) **antes** de compilar el exe C++ — cualquier rotura de aridad o paridad aborta el build. Reutiliza el script npm (sin duplicar la lista de archivos entre bat y package.json). **Orden completo del pipeline de validación**: 0 escáner paréntesis → 0.5 RPC contract → 0.6 parity manifiestos → 0.7 guard defaults canónicos → esbuild → **smoke aridad+paridad** → CMake → exe.

### Validation
- `npm run test:smoke` desde host/ui: canonicalDefaults **4/4** (2,75s) + bundle-arity **4/4** (3,93s) + visualParity **8/8** (4,32s) — **16 tests, exit 0**.
- Patrón `call ... || (popd & exit /b 1)` verificado empíricamente con cmd.exe real: caso fallo → exit 1 (aborta, `npm run noscript`), caso éxito → exit 0 (continúa).
- Escáner `check_bat_parens.mjs` sobre `build_auto.bat`: **0 issues** (convención fail-fast del repo).
- Verificación runtime en Chromium re-ejecutada contra el bundle verificado (buildId 726): GlobalFxStrip **PASS** determinista — 5 sliders 200-204 desde el getState inicial, 0 errores de consola.

## [Build #727] - 2026-08-05 — "DRY de defaults canónicos: constantes DEFAULT_* compartidas + guard de literales en ambos pipelines"

### Refactor
- **Defaults canónicos extraídos a constantes exportadas** en `web/src/omega-ui-core/uca/panelGeometry.ts` (única fuente de verdad): `DEFAULT_SKIN` ('industrial'), `DEFAULT_ZOOM` (1), `DEFAULT_RUNTIME_VALUE` (0.5), `DEFAULT_STEPS` (100) — consumidas por `resolveRenderOptions` y los fallbacks defensivos de `buildCellOptions` (el drift entre ambos ya no es posible, no solo detectado por test); y `DEFAULT_PANEL_WIDTH` (120), `DEFAULT_PANEL_HEIGHT` (420), `DEFAULT_RACK_HP` (12) — consumidas por **17 archivos** (web services/features + host/ui `templates`/`AcemmCatalog`/`module_manager` + `flatToTree`). Todas exportadas desde el barrel `index.ts`.
- **Unificación de inconsistencia de default de HP**: `rack?.hp ?? 8` en `resolvePanelGeometry` y `|| 8` en `RackPlayerContainer` → `DEFAULT_RACK_HP` (12) — los manifiestos sin `hp` pasan de 8HP→12HP (el valor dominante en 10+ sitios).
- **Guard de literales DRY compartido**: nuevo `omega-ui-core/types/__tests__/canonicalDefaultsGuard.ts` (framework-agnóstico, sin imports de jest/vitest) — source-scan que falla si un literal canónico ('industrial'/1/0.5/100/120/420/12) reaparece fuera de su declaración `DEFAULT_*` en archivos core, o como fallback de dimensiones (`??`/`||`/`:`) en consumidores. Se ejecuta en **AMBOS pipelines**: jest de web (`resolvedRenderOptions.typeContract.spec.ts` refactorizada, **22 tests**, con ancla única de valores canónicos) y **nuevo vitest de host/ui** (`tests/canonicalDefaults.test.ts`, **4 consumidores** del runtime).
- **`bundle.js` regenerado** con esbuild (build_id 726): diffs mínimos verificados — última regeneración **byte-idéntica (0 líneas)**.
- **CLI de lint `scripts/check_canonical_defaults.mjs`** (node puro, sin dependencias): ejecuta el MISMO guard que los tests vía el **config JSON compartido** (`omega-ui-core/types/__tests__/canonicalDefaults.config.json` — reglas y listas de archivos centralizadas en única fuente, consumidas por jest, vitest y el CLI). Cubre los **builds sin tests**: integrado en `build_auto.bat` como paso **0.7 fail-fast** (`node ... || exit /b 1`, precedente `check_manifest_parity`). Exit 0 = limpio / 1 = violaciones / 2 = error de config.

### Fixed
- **Bug pre-existente en `build_auto.bat` (paso 0.6) descubierto por el escáner propio `check_bat_parens.mjs`**: el `echo [ERROR] Manifiestos desincronizados (copia real o catalogo obsoleto). Abortando build.` tenía **paréntesis sin escapar dentro del bloque `|| ( ... )`** — el `)` de "obsoleto)" cerraba el bloque prematuramente en cmd.exe ("No se esperaba . en este momento", verificado empíricamente con cmd.exe real; misma clase de bug #714). Fix: escape canónico `^(copia real o catalogo obsoleto^)`. Resultado: escáner del repo completo **14 archivos / 0 issues**.

### Validation
- jest (web): spec guard **25/25** (2 core + 1 ancla + 22 paridad/consumidores web+host); suite completa **63 suites / 1303 tests passed**. vitest (host/ui): **19 files / 288 tests**. `tsc --noEmit` exit 0 en web y host/ui.
- **Tests negativos de inyección** verificados en los 3 ejecutores: literal `|| 12` en mockupService (jest), ternario `: 420` en MockupModal (jest) y `|| 120` en templates.ts (**CLI: exit 1 con violaciones L59/L94 precisas** + vitest) → el guard falla en el target exacto; restaurados. **CLI**: exit 0 (20 archivos escaneados), exit 1 (inyección), exit 2 (config ausente) — todos verificados; bundle sigue byte-idéntico tras los restauros.
- `web/src/omega-ui-core/.version` actualizado (ContractVersion 1.0.0 → 1.1.0 — adición de API pública).

## [Build #726] - 2026-08-04 — "sync_omega_ui.bat eliminado: omega-ui-core como fuente canónica única vía junctions"

### Refactor
- **Eliminación definitiva de `host/sync_omega_ui.bat` + `host/sync_omega_ui.ps1`** (descarte documentado en roadmap RM-108 desde 2026-07-30): el script legacy copiaba `omega-ui-core` desde el repo hermano `ABDOmegaEditor/src/omega-ui-core` hacia `host/ui/omega-ui-core` con `robocopy /MIR`. Hoy ese destino es un **junction NTFS → `web/src/omega-ui-core`** (la fuente única de verdad), por lo que el script era redundante y además **peligroso** (sobrescribiría la fuente vía el junction y borraría `.version` con `/MIR`).
- **`host/build_auto.bat`**: eliminada la llamada `call sync_omega_ui.bat` (paso 4). El flujo de build pasa directo de BuildVersion.h a la validación RPC (0.5).
- **135 headers "DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core"** en `web/src/omega-ui-core` (100 ts, 20 tsx, 14 css, 1 md) reemplazados por headers canónicos ("OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified) ... Consumido por host/ui y web/public via junctions ... Editable en su lugar") — elimina la instrucción engañosa de editar en el repo hermano.
- **`web/src/omega-ui-core/.version`**, `host/ui/map.md`, `host/roadmap.md`, `host/docs/VISUAL_PARITY_CONTRACT.md` y `PATCH_CABLES_IMPLEMENTATION_PLAN.md` actualizados al nuevo mecanismo (junction, sin sync scripts).

### Validation
- Verificado en disco: `host/ui/omega-ui-core` → `web/src/omega-ui-core` (junction); `web/public/omega-ui-core` → `web/src/omega-ui-core` (junction); `web/public/host-ui` → `host/ui` (junction); md5 idénticos de `CellRenderer.ts` y todos los CSS en ambos lados del junction.
- El schema copiado por el script (`omega-schema-v7.json`) **no se usa en C++** (0 matches en `host/src`) y ya está trackeado en git con md5 idéntico a `web/src/data` — no requiere mecanismo de sync.
- 0 referencias restantes a `sync_omega_ui` en `.bat`/`.cmd` del repo; `check_bat_parens.mjs` sin issues; git status: `D host/sync_omega_ui.bat`.

### Sync de numeración (drift #723-725)
- **Drift de build_no eliminado**: `host/build_no.txt` estaba en **725** (3 builds de verificación de la serie runtime que nunca se documentaron) mientras el changelog saltaba de #726 a #722. Se añaden las entradas **#723, #724 y #725** (ver más abajo) documentando esos builds intermedios y se alinea `build_no.txt` a **726** (tope del changelog) — el próximo build será **#727** sin colisión. `BuildVersion.h` regenerado en el próximo `build_auto.bat`.

## [Build #725] - 2026-08-03 — "Verificación final conjunta de suites (Catch2 + vitest + jest + tsc) pre-commit"

### Validation
- **Verificación final conjunta** antes del commit del batch: **Catch2 3/3** (`omega_core_tests` 33/33·236 assertions, `omega_ui_tests` 16/16·129, `omega_plugin_tests` 2/2·34), **vitest `host/ui` 16 files / 275 tests**, **jest `web` 62 suites / 1278/1278** y `tsc --noEmit` exit 0 en ambos proyectos.
- Auditoría de cifras de tests: las únicas desactualizadas eran jest (creció de 1255/1256 en Fase 4 a 1277/1278) y la cifra vitest (14/262 → 16/275 por los tests de cables/) — sincronizadas en `REFACTORING_PLAN.md` y changelog con contexto histórico preservado.

## [Build #724] - 2026-08-03 — "Fix DockIconStrip.spec.tsx: jest 1278/1278 (fallo pre-existente resuelto)"

### Fixed
- **Fallo pre-existente de jest en `web`** (`DockIconStrip.spec.tsx`): el test asumía un orden de botones por índice (`buttons[3]` = "Blueprint Library") que no coincide con el array `ICONS` de `DockIconStrip.tsx` (el índice 3 es `window_compliance`; `window_blueprints` está en el 4 — orden intencional agrupado por categoría Structure→Edit→Quality→Diagnostics). **Fix en el test** (no en el componente): selección por `title` (`screen.getByTitle('Layers')`/`'Blueprint Library'`/`'Terminal Logs'`) — robusto ante reordenamientos futuros y consistente con el test de titles existente. Los otros 9 tests ya pasaban.
- **Resultado**: suite jest completa **62 suites / 1278/1278 tests passed, exit 0** (antes 1277/1278 con 1 fallo). Referencias de cifras actualizadas en `REFACTORING_PLAN.md` L155/L363.

## [Build #723] - 2026-08-02 — "Cierre serie runtime verified: GlobalFxStrip desde getState inicial + fix build standalone"

### Fixed
- **Verificación runtime del GlobalFxStrip desde el getState inicial** (Playwright + Chromium, ruta real del bridge `handleOmegaMessage`): **5 sliders 200-204** renderizados desde el primer estado con `0.75/0.25/0.5/0.1/0.9`, **0 errores de consola** — script reutilizable `web/scripts/verify_global_fx_runtime.mjs`. (Detalle completo en el apéndice "Cierre de la serie — runtime verified" bajo #722.)
- **Fix del build del standalone** (`RpcSystemController.cpp`): call-site muerto `mSettings.save()` eliminado (`setSettingValue` ya persiste internamente vía `mRepository.save`) → `omega_plugin_Standalone` **exit 0** → `OMEGA Synth.exe` regenerado. (Detalle completo en el apéndice "fix del build del standalone" bajo #722.)
- **Matriz E2E de `setParameter` completada** (6 tests, dispatcher real + spy en `omegaRPC.send`) + **cleanup del health-monitor en 4 tests** + **`detectOpenHandles: true` permanente en `vitest.config.ts`**.

## [Build #722] - 2026-08-01 — "globalFxParams: wire de extremo a extremo (TS + C++) — buildPatchWireVar + handler globalFx.<id>"

### Added
- **Consumo de `globalFxParams` en el frontend TS** (`host/ui`): tipo `globalFxParams?: Record<string, number>` en `PatchDocumentV7` (keyed por id-string, doc comment Era 7.2.3) + accessor `RuntimeStore::getGlobalFxParams()`. Nuevo componente **`GlobalFxStrip.ts`** (`GLOBAL_FX_PARAM_META` con los 5 ParamIds 200-204 MIX/FEEDBACK/TIME/SPEED/INTENSITY, helpers puros `readGlobalFxParams` — filtro estricto `typeof number && isFinite`, descarta booleans/strings/NaN — y `formatFxValue`; clase con render/sync desde runtimeStore con skip de escrituras redundantes). CSS `css/globalfx.css`, contenedor `#global-fx-strip` en `index.html` (normalizado a CRLF), wiring en `index.ts`. 9 tests vitest de los helpers puros.
- **Helper DRY `serializeParamsToVar()` movido a `VarSerialization`** (free function compartida): el patrón wire keyed por id-string se duplicaba entre `OmegaUiBridge` (private static) y `RpcParameterController::handleGetState` (loop inline idéntico). Eliminado el duplicado y la declaración/include de `PatchDocument.h` en `OmegaUiBridge.h`; 2 call sites de `forceRepaint` + 1 de `handleGetState` ahora delegan. La telemetría NO usa este formato (pinData keyed por pinId) — verificada y no tocada.
- **Alineación de `handleGetState` con `forceRepaint`** vía nuevo builder compartido **`VarSerialization::buildPatchWireVar(doc)`** — fuente única de verdad del patch shape wire: `name`/`author`/`masterGainDb` + `modules[]` (instanceId/typeId/componentId/rack/slot/`parameters` keyed) + `globalFxParams` (keyed) + `patchbayMatrix` (source/target/amount/via/viaAmount/color/active). **Antes** `getState` emitía un shape incompleto (sin `globalFxParams`/`patchbayMatrix`/`slot`) — el `GlobalFxStrip` solo aparecía tras el primer `onStateUpdate`; **ahora aparece desde el primer estado**. `forceRepaint` reducido a ~12 líneas (const-ref directa sin copia); include `PatchIdentifiers.h` eliminado de `OmegaUiBridge.cpp` (0 usos directos). 2 TEST_CASE nuevos del builder (shape completo + doc vacío).
- **Handler C++ `globalFx.<id>` en `RpcParameterController::handleSetParameter`** — write-path completo de los sliders: helpers puros `isGlobalFxParamId` (rango 200-204) y `getGlobalFxParamId(target)` en `PatchIdentifiers.h` (prefijo `globalFx.` case-sensitive, sufijo 1-3 dígitos, rango validado, `ParamId::None` en cualquier fallo); `EngineConfigManager::updateGlobalFxParameter(paramId, value)` hace upsert en `doc.globalFxParams` + `recompile()`; `updateParameter(instanceId, ...)` ahora **rutea por rango de ParamId** (no por instanceId), lo que **arregla el no-op silencioso del timer** `OmegaAudioProcessor::updateParameters()` (llamaba `updateParameter(0, ...)` para los FX — instanceId 0 no existe como módulo). 3 TEST_CASE de parseo en `GlobalFxTarget.test.cpp` (5 IDs conocidos + 11 rechazos + bounds) registrado en `omega_core_tests`.

### Validation
- Build Release exit 0 (3 targets de test); **suite completa Catch2: `omega_core_tests` ✅ 33/33 (236 assertions), `omega_ui_tests` ✅ 15/15 (122 assertions), `omega_plugin_tests` ✅** — `ctest` 3/3 passed.
- vitest (frontend): 9/9 tests de `GlobalFxStrip`; `tsc --noEmit` exit 0; `bundle.js` regenerado con esbuild (build_id 721).
- Code review (3 rondas): aprobado — routing por rango seguro (los ParamId de módulo son 1-8/50-55/100-103/150; el rango 200-204 es exclusivo FX), wire coherente con `PatchDocumentV7` TS, const-ref sin dangling, include eliminado seguro (símbolos transitivos).
- **Nota del revisor aplicada (fallback `componentId: "unknown"` en `buildPatchWireVar`)**: el `componentId` de cada módulo se calcula ahora en una variable local con guard explícito (`auto componentId = mapTypeToId(m.typeId); if (componentId.empty()) componentId = "unknown";`) — el wire **nunca emite un `componentId` vacío** para typeIds no mapeados (blinda además el caso hipotético de cadena vacía, más allá del `default: "unknown"` que ya tiene `mapTypeToId`). Nuevo TEST_CASE `buildPatchWireVar falls back to 'unknown' for unmapped typeIds` (usa `ModuleTypeId::None`, fuera del switch) — el TEST_CASE sube la suite de **15/15 a 16/16 (129 assertions)**, ctest 3/3.

### Cierre de la serie — runtime verified (apéndice, 2026-08-02)
- **Verificación runtime del GlobalFxStrip desde el getState inicial** (Playwright + Chromium, no browser-use): se sirvió la UI real (`host/ui/index.html` + `bundle.js`) en local y se inyectó el estado por la ruta real del bridge (`window.handleOmegaMessage(state)` → OmegaRPC → `omega:state` → RuntimeEventHub → runtimeStore → `syncFromStore`). Resultado: **5 sliders (200-204) renderizados desde el primer estado** con valores `0.75/0.25/0.5/0.1/0.9`, label `75%`, título `GLOBAL FX` y **0 errores de consola** — confirmando el objetivo de la serie en un navegador real. Script reutilizable nuevo: `web/scripts/verify_global_fx_runtime.mjs`.
- **Matriz de validación E2E de `setParameter` completada** en `GlobalFxStrip.writePath.test.ts` (6 tests, dispatcher REAL del bundle + spy en `omegaRPC.send`): cubre los 3 caminos de `handleCoreCommand` — `target: globalFx.<id>` (sliders), IDs numéricos completos (`instanceId`+`paramId` → llega a `rpc.send` intacto), y bloqueos (payload vacío / asimétrico `instanceId` sin `paramId` → nunca llega a `rpc.send`).
- **Cleanup del health-monitor (setInterval 2s de OmegaRPC) en los 4 tests** que tocan bundle/OmegaRPC (`bundle-arity`, `GlobalFxStrip.boot`, `GlobalFxStrip.writePath`, `rpc_contract` — este último instanciaba `new OmegaRPC()` en cada test sin limpiar) + **`detectOpenHandles: true` permanente en `vitest.config.ts`** (vitest 1.6.1 lo soporta como config, no CLI) — cada CI verificará que no quedan timers vivos.

### Validation (cierre)
- vitest **16 files / 275 tests passed** (6 write-path + 2 boot + 4 bundle-arity + 26 rpc_contract + 45 cableInteraction + 23 patchCableManager + 22 cableRenderer + 6 inspectorColorSwatches + resto) con `detectOpenHandles: true` activo y **sin warnings de open handles**; `tsc --noEmit` exit 0; **runtime en Chromium: PASS** (5 sliders desde el getState inicial).

### Apéndice — fix del build del standalone (compilación #722, 2026-08-02)
- **Error de compilación resuelto** (`omega_plugin_Standalone`): `RpcSystemController.cpp(59,19): error C2039: "save": no es un miembro de "Omega::Core::Service::SystemSettingsManager"` — la llamada `mSettings.save()` era un **call-site muerto** que referenciaba el método `save()` eliminado en el refactor de `SystemSettingsManager` (la persistencia se delegó a `SettingsRepository`).
- **Fix aplicado** en `host/src/UI/Controllers/System/RpcSystemController.cpp` (`handleSetSystemSetting`): eliminada la línea `mSettings.save();` — `setSettingValue` **ya persiste internamente** (L47, `mRepository.save(mValues)` tras el clamp), así que no se pierde persistencia; `SETTING_ACK` sigue devolviendo `true`. Verificado: era el **único call-site** del método eliminado.
- **Resultado**: `cmake --build build --config Release --target omega_plugin_Standalone` **exit 0** → `OMEGA Synth.exe` regenerado (7.3 MB) y lanzable con ventana (`MainWindowTitle: OMEGA Synth`). Intento de verificación CDP in-exe (`--remote-debugging-port=9222` + `WEBVIEW2_USER_DATA_FOLDER` exclusivo): el standalone **no spawnó procesos WebView2 propios** en la sesión no-interactiva → limitación de entorno, no prueba de fallo; la verificación runtime quedó cubierta por el apéndice anterior (Playwright + Chromium sobre los artefactos reales `index.html` + `bundle.js`, que son los que embebe el exe). Residuos limpiados (exe terminado, script temporal `_webview2_relaunch.mjs` y user-data-dir eliminados). Code review: APROBADO.

## [Build #721] - 2026-08-01 — "VarSerialization: round-trip completo + globalFxParams + push bridge"

### Fixed
- **Bug de round-trip preexistente en `patchDocumentToVar` (color del patchbayMatrix)**: la serialización de los slots de matrix escribía `source/target/amount/via/viaAmount/active` pero **omitía `color`** — mientras que `varToPatchDocument` sí lo lee (`so->getProperty("color")`). Resultado: el color de cable se perdía al guardar/restaurar un patch (`"" == "#ff8800"` en el test preexistente `VarSerialization.test.cpp:164`, el 1 fallo que arrastraban los `omega_ui_tests` 9/10). **Fix de 1 línea**: `so->setProperty("color", juce::String(s.color));` entre `viaAmount` y `active`. Verificado que `OmegaUiBridge::forceRepaint()` ya escribía `color` correctamente — el bug era exclusivo del módulo extraído en la Fase 5.1.

### Added
- **Serialización completa de `globalFxParams`** (antes omitida simétricamente en ambos sentidos — no rompía el round-trip pero perdía datos): `patchDocumentToVar` ahora escribe `doc.globalFxParams` con el mismo esquema que `parameters` (`id`/`value`/`modulationBindingId`) y `varToPatchDocument` lo parsea (saltando elementos no-objeto, robusto ante clave ausente). El vector se puebla en `OmegaAudioProcessor.cpp` vía `writeParams`/`readParams` (L201/L264) — ahora persiste en presets/saves.
- **Push preparatorio de `globalFxParams` en `OmegaUiBridge::forceRepaint()`** (formato wire del bridge: DynamicObject keyed por `juce::String((int)p.id)` → `p.value`, idéntico al de los params de módulos). El frontend TS aún no lo consume (0 matches) — queda el canal listo en `onStateUpdate`.
- **Helper DRY `serializeParamsToVar()`** en `OmegaUiBridge` (método privado estático + include de `PatchDocument.h`): elimina la duplicación del patrón de serialización de params entre el bloque de módulos y el nuevo `globalFxParams` de `forceRepaint()`.

### Tests
- **`VarSerialization.test.cpp` ampliado**: aserciones de `via`/`viaAmount` con valores no triviales en el round-trip completo (antes `via=""`/`viaAmount=0` hacían que pasaran trivialmente) + aserciones de `globalFxParams` (size/id/value/modulationBindingId) + `REQUIRE(globalFxParams.empty())` en los tests de "missing keys" y "unexpected field types" + nuevo TEST_CASE de slot 100% default (verifica que via="", viaAmount=0, active=false, color="" sobreviven el round-trip).

### Validation
- Build Release exit 0 (3 targets de test); **suite completa Catch2: `omega_core_tests` ✅, `omega_ui_tests` ✅ 11/11 (83 assertions), `omega_plugin_tests` ✅** — el fallo preexistente de `VarSerialization.test.cpp:164` queda cerrado y la cobertura sube de 66 a 83 aserciones (65→83 passed).
- Code review: fix simétrico (misma clave/tipo), sin omisiones restantes en `PatchbayMatrixSlot` (7/7 campos), `ParamId::Mix` = 200 existe, helper wire-preserving con lifetime correcto.

## [Build #720] - 2026-08-01 — "Escáner: detección de '::' dentro de bloques (convención REM automatizada)"

### Added
- **`scripts/check_bat_parens.mjs` ahora detecta también `::` dentro de bloques parenthesized multilínea** (regresión de #717): si una línea `::` aparece mientras el stack de paréntesis tiene un `(` abierto de una línea anterior, se flaggea `L#: '::' comment inside multi-line block - use REM (#717)`. Esto **automatiza la convención REM** — cualquier `::` en bloque hace fallar `build_auto.bat` (paso 0) y los launchers (exit 1).
- **NO flaggea**: `::` top-level (headers de sección, stack vacío), labels de un colon (`:label` — `startsWith('::')` solo matchea doble colon), ni `REM` dentro de bloques. La lógica de paréntesis (#714) se preserva (stack compartido, mismo orden de mutación).
- **Fixtures canónicos permanentes en `scripts/_bat_test/`**: `colond_in_block.bat` (debe flaggear), `colond_top_level.bat`, `label_in_block.bat`, `rem_in_block.bat` (no deben flaggear). `_bat_test/` se excluyó de `collectBats` para no ensuciar el conteo del repo.

### Validation
- Fixtures: `::` en bloque → issue L4 + exit 1 (correcto); `::` top-level → exit 0; `:label` en bloque → exit 0; `REM` en bloque → exit 0.
- Repo completo: **0 issues** en los 15 `.bat` reales (ninguno tiene `::` en bloques tras #717); `node --check` OK.
- Gate confirmado: la detección es un **hard gate** (no warn) para build_auto.bat y launchers.

## [Build #719] - 2026-08-01 — "Normalización de line endings a CRLF en .bat/.cmd"

### Refactor
- **14 archivos batch normalizados de LF a CRLF** (convención de `build_wasm.bat` / #714): `host/lint.bat`, `host/pack_lab_monitor.bat`, `host/scripts/build_plugins.bat`, `host/show_build_errors.bat`, `host/start-editor.bat`, `host/sync_omega_ui.bat`, `scripts/check_bat_parens.cmd`, `start.bat`, `start_synth.bat`, `web/omega-audit.bat`, `web/scripts/generate_delta.bat`, `web/scripts/start_editor.bat`, `web/scripts/start_watchdog.bat`, `web/start.bat`. Incluye los `.bat` gitignored de `host/` (sync_omega_ui.bat, pack_lab_monitor.bat, show_build_errors.bat, start-editor.bat) que se usan en runtime.
- **Nuevo `.gitattributes` en la raíz** que fija la convención a nivel de repo: `*.bat text eol=crlf` y `*.cmd text eol=crlf`. Con `core.autocrlf=true` (ya activo), git almacena LF en el index y produce CRLF en checkout — el diff de git solo muestra los archivos con cambios de contenido reales.
- Conversión sin doble CRLF (`\r\n` canónico, verificado 0 `\r\r\n`).
- **Whitelist en `host/.gitignore`**: `sync_omega_ui.bat`, `pack_lab_monitor.bat`, `show_build_errors.bat` y `start-editor.bat` (antes gitignored) ahora se trackean — el `.gitattributes` los protege y la convención CRLF "pega" a nivel repo (precedente: `build_auto.bat`/`lint.bat` en #718).

### Validation
- Escáner `check_bat_parens.mjs`: **0 issues** en los 15 `.bat` del repo tras la conversión (sigue parseando CRLF correctamente vía `split(/\r?\n/)`).
- Smoke test cmd.exe real con guardia en CRLF (réplica desde root): `[OK] Scripts .bat validados.` + flujo continúa, exit 0.
- `git add --renormalize` + reset: los 10 archivos de solo line-endings quedan limpios en git (el index almacena LF normalizado); solo quedan como ` M` los 4 con cambios de contenido de #718 (build_auto.bat, start.bat, start_synth.bat, web/start.bat) + 2 nuevos (`.gitattributes`, `scripts/check_bat_parens.cmd`).

## [Build #718] - 2026-08-01 — "Guardia pre-arranque de paréntesis en launchers"

### Added
- **Nuevo `scripts/check_bat_parens.cmd`** — guardia `call`-able que envuelve al escáner `check_bat_parens.mjs`, con dos modos:
    - **Híbrido (default)**: si `node` o el escáner faltan → `[WARN]` y continúa (exit 0); si el escáner detecta issues → `[ERROR]` y aborta (exit 1). Crítico para `start_synth.bat` (lanza un binario nativo, no requiere node).
    - **`/strict`** (usado por `build_auto.bat`): tooling ausente → `[ERROR]` y aborta (exit 1).
- **Launchers integrados como guardia de pre-arranque**: `start.bat` y `start_synth.bat` (raíz) → `call "%~dp0scripts\check_bat_parens.cmd"`; `web/start.bat` → `call "%~dp0..\scripts\check_bat_parens.cmd"` — todos seguidos de `if errorlevel 1 (... exit /b 1)`.
- **DRY — `build_auto.bat` ya NO duplica el bloque inline (#716)**: su paso 0 ahora delega en `call "%~dp0..\scripts\check_bat_parens.cmd" /strict` (mismo fail-fast de antes, un único punto de invocación del escáner).

### Validation
- Probado end-to-end con cmd.exe real:
    - Con `.bat` roto temporal (`(emsdk).`) → `[ERROR] ... abortando arranque.` exit 1.
    - Repo limpio (réplica root y réplica web) → `[OK] Scripts .bat validados.` + flujo continúa, exit 0.
    - Escáner renombrado temporalmente → modo híbrido `[WARN] ... Continuando...` exit 0; modo `/strict` `[ERROR] ...` exit 1.
- Escáner: **0 issues** en los 3 launchers modificados, en `build_auto.bat` y en el repo completo (15 `.bat`); line endings LF de los launchers y CRLF de `build_auto.bat` preservados.

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
