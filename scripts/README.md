# scripts/ — Tooling

Utilidades de validación y build del proyecto ABDOmegaUnified.

| Script | Propósito | Uso |
|---|---|---|
| `build_wasm.bat` | Compila los 3 módulos WASM (`midi_in`, `midi_trigger`, `omega_lab_monitor`) desde `modules/` con Emscripten (`em++ -s SIDE_MODULE=1`) hacia `web/public/wasm/`. Requiere `em++` en el PATH (activar con `emsdk_env.bat`). | `scripts/build_wasm.bat` |
| `check_bat_parens.mjs` | **Diagnóstico preventivo del bug de `build_wasm.bat`**: escanea los `.bat` del proyecto en busca de `)` sin escapar dentro de bloques `if (...)`/`for ... do (...)`/`else (` multilínea que rompen cmd.exe ("No se esperaba X en este momento"). Modelo calibrado empíricamente contra cmd.exe real: omite regiones `%...%` y escapes `^x`; flaggea cualquier `)` sin escapar dentro de un bloque multilínea con contenido sobrante; excluye los patrones legítimos `) else (` y `) do (`. | `node scripts/check_bat_parens.mjs` (exit 0 = sin issues) |
| `wasm-smoke.mjs` | **Smoke test runtime de los 3 `.wasm` regenerados**: compila e instancia cada binario con un importObject PIC (stack/GOT mutables, bases inmutables), ejecuta `__wasm_call_ctors`, extrae el contrato vía `omega_get_contract` (clave `parameters`) y ejercita `omega_init`/`omega_on_midi`/`omega_on_param`/`omega_process`. Nota: valida la validez binaria + superficie de API, NO la relocación completa (el host real es WAMR en C++). | `node scripts/wasm-smoke.mjs` (exit 0 = los 3 OK) |

## Notas

- **`build_wasm.bat` — bug de paréntesis (fix #714)**: el texto `(emsdk)` dentro del bloque `if (...)` cerró el bloque prematuramente en cmd.exe. El escape canónico `^(emsdk^)` + finales CRLF lo resuelven. `check_bat_parens.mjs` detecta esta clase de bug preventivamente.
- **Escáner `check_bat_parens.mjs`**: acepta rutas de archivo opcionales (`node scripts/check_bat_parens.mjs path/to/x.bat`); sin argumentos escanea todos los `.bat` del repo (excluye `node_modules`, `JUCE`, `build`, `.next`, `.git` y plantillas Squish de CMake).
- **`build_auto.bat` integra el escáner como paso 0 (fail-fast)**: aborta el build si algún `.bat` del repo reintroduce el bug de paréntesis (#714 → #716).
- **Convención de comentarios en `.bat`**: dentro de bloques parenthesized usar `REM` (forma canónica segura), no `::` — el footgun de `::` dentro de bloques es sutil (interacción con `goto`/re-parseo de labels). A nivel top-level ambas formas son válidas (#717).
- Ambos `.mjs` son standalone (solo Node estándar, sin dependencias).
