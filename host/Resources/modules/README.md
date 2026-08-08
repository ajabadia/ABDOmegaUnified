# 📦 Estantería de Módulos (ABDOmega Modules)

Esta carpeta contiene todos los módulos del sintetizador OMEGA. Es la **fuente única**
canónica: las junctions `web/public/modules/` y `host/Resources/modules/` apuntan aquí,
y el catálogo de la UI se regenera desde los `.acemm` de esta carpeta.

## Estructura de cada Módulo

Cada módulo vive en su propio subdirectorio:

```
modules/
├── 440demo/
│   ├── 440demo.cpp            # DSP: oscilador 440 Hz + LED (mínimo viable)
│   ├── 440demo.acemm          # Manifiesto visual del panel (UI & bindings)
│   ├── 440demo.contract.json  # Contrato embebido (paridad con omega_get_contract)
│   ├── 440demo.wasm           # Binario compilado (canónico, sincronizado por build)
│   └── README.md
├── midi_in/
├── midi_2_cv/                 # MIDI → CV/Gate/Vel (importa omega_set_voice_*)
├── midi_trigger/
└── omega_lab_monitor/
```

Módulos reales actuales: `midi_in`, `midi_2_cv`, `midi_trigger`, `omega_lab_monitor`, `440demo`.

---

## Reglas de Desarrollo

1. **Aislamiento**: El C++ de un módulo solo depende del SDK de `engine/include`
   (incluir con `<Core/Ace/...>`, compilar con `-I engine/include`). JUCE se mockea
   para emscripten vía `-include engine/bindings/wasm_compat.h`.
2. **Rejilla Visual de 5px**: Los controles del `.acemm` se alinean a múltiplos de 5px.
3. **Contrato de Puertos**:
   * Audio / Pitch: Cyan
   * CV / Modulación: Ámbar
   * Gate / Trigger: Blanco
   * MIDI: Naranja
4. **Paridad contrato ↔ manifiesto**: los puertos y parámetros declarados en
   `OMEGA_PARAM`/`OMEGA_PORT` (cpp) deben coincidir con `*.contract.json` y con los
   `bind:` del `*.acemm`. Se verifica en build con `scripts/check_manifest_parity.mjs`.

---

## Programar un Módulo DSP (Guía Rápida)

### 1. Contrato self-describing (cpp)

```cpp
#include <Core/Ace/OmegaContract.h>
#include <Core/Ace/OmegaConstants.h>
using namespace Omega::Constants;

BEGIN_OMEGA_PARAMETERS("mid", "My Module")
    OMEGA_FAMILY("control")                       // control | audio | generator | fx | utility
    OMEGA_PARAM(cutoff, "Cutoff", 20, 20000, 1000, "Hz")
    OMEGA_PORT(cv_out, "CV Out", output, cv)      // output|input, audio|cv|gate|led|...
END_OMEGA_PARAMETERS
```

`omega_get_contract()` (definido por las macros) expone el JSON embebido; el host lo
lee para instanciar params/puertos sin tabla externa.

### 2. Imports del host (servicios que el módulo puede llamar)

```cpp
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
    WASM_IMPORT(omega_set_voice_freq)     void omega_set_voice_freq(float frequency);
    WASM_IMPORT(omega_set_voice_gate)     void omega_set_voice_gate(float gate);
    WASM_IMPORT(omega_set_voice_vel)      void omega_set_voice_vel(float velocity);
    WASM_IMPORT(omega_set_voice_at)       void omega_set_voice_at(float pressure);
}
```

Implementados en `host/src/Core/Wasm/Host/WasmHostInterface.cpp`.

### 3. Exports obligatorios (ABI del host — NO cambiar firmas)

| Símbolo | Firma ABI (host) | Uso |
|---|---|---|
| `omega_init` | `void(float)` | init a sampleRate |
| `omega_process` | `void(float*, int)` `"(*i)f"` | procesa un bloque de audio (vía voz: length==1) |
| `omega_on_param` | `void(int, float)` | cambio de parámetro (paramId = orden del OMEGA_PARAM) |
| `omega_on_midi` | `void(uint8_t, uint8_t, uint8_t)` | MIDI: status, data1, data2 (opcional) |

```cpp
extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sr) { ... }
    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) { ... }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int id, float v) { ... }
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t s, uint8_t d1, uint8_t d2) { ... }
}
```

`EMSCRIPTEN_KEEPALIVE` tiene fallback propio en `OmegaContract.h` si no está definido.

### 4. ⚠️ Linkage: DSP en anonymous namespace (OBLIGATORIO)

Con `-s SIDE_MODULE=1`, una clase/var con **external linkage se promueve a un IMPORT
del propio módulo** (self-import) y el instanciado falla. Todo el DSP va en
`namespace { ... }` (internal linkage). Ver `modules/440demo/440demo.cpp` y
`modules/midi_2_cv/midi_2_cv.cpp` como referencia.

### 5. Compilar y verificar

```
# activar Emscripten una vez por shell
call C:\emsdk\emsdk_env.bat

# compila TODOS los módulos + verifica 440demo y midi_2_cv en runtime
scripts\build_wasm.bat
```

El script compila cada `modules/<id>/<id>.cpp` con
`em++ -O3 -s WASM=1 -s SIDE_MODULE=1 -I engine/include -include engine/bindings/wasm_compat.h`
y sincroniza la copia canónica `<id>.wasm` a la carpeta del módulo.

Verificación de convergencia (junctions + catálogo + paridad):

```
node scripts/check_manifest_parity.mjs
node scripts/generate_acemm_catalog.mjs
```

Para un módulo de control tipo `midi_2_cv`, replicar `scripts/verify_midi_2_cv_runtime.mjs`
(stubs de `omega_set_voice_*` en JS y asserts sobre el estado del módulo).

---

## Notas del host

* El host carga el `.wasm` desde `modules/<id>/<id>.wasm` vía la junction
  `host/Resources/modules/` (ver `WasmModuleService.cpp`: ABI `omega_process` = `"(*i)f"`,
  `dispatchMidi` = `omega_on_midi`).
* Los parámetros "ocultos" (component `hidden` en el `.acemm`) son editables vía
  inspector/RPC sin ocupar el panel — patrón usado en `440demo` y `midi_2_cv`.
