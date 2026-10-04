# 🛠️ Guía de Desarrollo de Módulos OMEGA

Especificación técnica para que terceros desarrollen módulos (osciladores, filtros, utilidades) compatibles con el motor OMEGA sin asistencia directa.

> [!NOTE]
> Documento heredado del repositorio `ABDOmega plugins` (fusionado en ABDOmegaUnified). **Las rutas, el ABI y las cifras de este documento se han verificado contra el código actual.** Donde la antigua documentación afirmaba algo que el código ya no hace, se indica explícitamente.

---

## 1. Las tres capas de un módulo

Un módulo OMEGA es una entidad compuesta por tres piezas que deben estar en sincronía absoluta:

1. **Lógica (`<id>.wasm`)** — binario WebAssembly con el algoritmo DSP.
2. **Arquitectura (`<id>.acemm`)** — manifiesto YAML con la interfaz visual, el chasis y la gobernanza.
3. **Contrato (`<id>.contract.json`)** — interfaz técnica que mapea los parámetros del WASM con la UI.

El contrato **no se escribe a mano**: se extrae del binario con `omega_get_contract()`. Ver [Extracción del contrato](#extracción-del-contrato).

---

## 2. Estructura del SDK

Ubicaciones en este repositorio:

| Ruta | Contenido |
| :--- | :--- |
| `engine/include/Core/Ace/` | Cabeceras oficiales del SDK (`OmegaContract.h`, `OmegaConstants.h`). |
| `modules/` | Estantería canónica de módulos. Cada módulo es `modules/<id>/` con su `.cpp`, `.acemm` y `.wasm`. |
| `scripts/build_wasm.bat` | Construcción de los binarios WASM. |
| `host/src/Core/Ace/` | Parser, validación y catálogo del host. |
| `web/src/omega-ui-core/` | Design system y renderers (fuente única, compartida con el host por junction). |

> [!IMPORTANT]
> La antigua ruta `/include` ya no existe: las cabeceras viven bajo `engine/include`. La carpeta `/toolchain` **tampoco existe** en el repositorio; el compilador es el toolchain de Emscripten del sistema.

---

## 3. WASM ABI

### Exports que tu módulo debe exportar

Usa `extern "C"` para evitar el *name mangling*.

| Función | Firma real | Descripción |
| :--- | :--- | :--- |
| `omega_get_contract` | `() -> const char*` | Devuelve el JSON del contrato. |
| `omega_process` | `(float* buffer, int length) -> void` | Procesamiento DSP. **`float*`, no `const float*`.** |
| `omega_on_param` | `(int paramId, float value) -> void` | Cambios de parámetro desde el host. |
| `omega_on_midi` | `(uint8_t status, uint8_t d1, uint8_t d2) -> void` | Hook de eventos MIDI. |
| `omega_init` | `(float sampleRate) -> void` | Inicialización del módulo. |

### Imports que el host proporciona

Declarados en `engine/include/Core/Ace/OmegaContract.h`:

| Función | Firma | Descripción |
| :--- | :--- | :--- |
| `omega_publish_telemetry` | `(float val) -> void` | Valores 0-1 para LEDs y scopes. |
| `omega_publish_midi` | `(uint32_t port, uint8_t s, uint8_t d1, uint8_t d2) -> void` | MIDI desde el módulo al host. |
| `omega_log` | `(const char* msg) -> void` | Mensajes a la consola del host. |
| `omega_log_terminal` | `(const char* bindId, const char* message) -> void` | Escritura en la primitiva `terminal`. |
| `omega_get_system_buffer` | `(const char* systemId) -> void*` | Buffers del sistema. |
| `omega_get_sample_rate` | `() -> float` | Frecuencia de muestreo del motor. |
| `omega_get_block_size` | `() -> int` | Tamaño de bloque del motor. |
| `omega_get_midi_protocol` | `() -> int` | Protocolo MIDI activo. |
| `omega_get_voice_frequency` | `() -> float` | Frecuencia de la voz en curso. |
| `omega_get_voice_gate` | `() -> float` | Gate de la voz. |
| `omega_get_voice_velocity` | `() -> float` | Velocidad de la voz. |

### El bus de voz

Existe además un segundo juego de imports, **el bus de voz**, que **no está declarado en el SDK** sino en el puente de buses del host:

| Función | Quién la usa |
| :--- | :--- |
| `omega_set_voice_freq` | `midi_2_cv` — convierte nota MIDI en `voice.freq`. |
| `omega_set_voice_gate` | `midi_2_cv` — convierte note on/off en `voice.gate`. |
| `omega_set_voice_vel` | `midi_2_cv` — velocidad. |
| `omega_set_voice_at` | `midi_2_cv` — presión (aftertouch). |

> [!WARNING]
> Estos cuatro se declaran a mano con la macro `WASM_IMPORT`, no con el SDK. Un módulo que los use debe declararlos explícitamente; incluirlos en `OmegaContract.h` es una mejora pendiente.

---

## 4. Implementación de referencia

```cpp
#include <Core/Ace/OmegaContract.h>

// 1. Contrato — fuente de verdad. El orden de OMEGA_PARAM fija los índices
//    que recibe omega_on_param.
BEGIN_OMEGA_PARAMETERS("my_osc", "Industrial Oscillator")
    OMEGA_PARAM(freq, "Frequency", 20, 20000, 440, "Hz")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(v_oct, "V/Oct", input,  cv)
        OMEGA_PORT(out,  "Out",   output, audio)
    END_OMEGA_PORTS
END_OMEGA_PARAMETERS

// 2. Imports del host
extern "C" {
    WASM_IMPORT(omega_get_voice_frequency) float omega_get_voice_frequency(void);
    WASM_IMPORT(omega_publish_telemetry)   void   omega_publish_telemetry(float v);
}

// 3. Estado
float frequency = 440.0f;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { (void)sampleRate; }

    EMSCRIPTEN_KEEPALIVE void omega_on_param(int id, float val) {
        if (id == 0) frequency = val;
    }

    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t s, uint8_t d1, uint8_t d2) {
        (void)s; (void)d1; (void)d2;
    }

    EMSCRIPTEN_KEEPALIVE void omega_process(float* buffer, int length) {
        for (int i = 0; i < length; i++) { /* DSP aquí */ }
        (void)buffer;
    }
}
```

---

## 5. Compilación

```bash
.\scripts\build_wasm.bat
```

> [!IMPORTANT]
> El script se llama `build_wasm.bat`, no `build_plugins.bat` (nombre del repo antiguo). Usa Emscripten; no hay toolchain LLVM incluido en el repositorio.

---

## 6. Extracción del contrato

El `.contract.json` se **genera desde el binario**, nunca se escribe a mano:

```bash
node scripts/gen_contracts.mjs
```

Lee `omega_get_contract()` de cada `.wasm` y escribe `modules/<id>/<id>.contract.json`.

---

## 7. El manifiesto `.acemm`

### Puertos

Los puertos viven en `ports:`, **no** en `jacks:` como decía la versión antigua. Cada uno lleva `direction` (`input`/`output`) y `type`:

```yaml
ports:
  - { id: v_oct, label: V/Oct, direction: input,  type: cv }
  - { id: out,   label: Out,   direction: output, type: audio }
```

### Parámetros

El bloque `params:` es opcional; cuando existe, el host lo usa para el control ligado (exponente, unidades, opciones):

```yaml
params:
  waveform:
    label: Waveform
    min: 0
    max: 4
    default: 0
    choices:
      - { label: Sine,   value: 0 }
      - { label: Triangle, value: 2 }
```

### Controles visuales

Van en `ui.controls`, y cada uno apunta a un parámetro o puerto por `bind`:

```yaml
ui:
  controls:
    - id: knob_waveform
      bind: waveform
      pos: { x: 30, y: 15 }
      presentation:
        container: main
        component: knob
        variant: cyan
```

---

## 8. MIDI

```cpp
extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
        // status: Note On/Off, CC…
        // d1: nota o número de CC
        // d2: velocidad o valor de CC
        omega_publish_telemetry(1.0f);
    }
}
```

Para publicar MIDI hacia la cadena, usa el puerto explícito. La constante `0` es el puerto principal:

```cpp
omega_publish_midi(MIDI_PORT_MAIN, status, d1, d2);
```

---

## 9. Ingesta de audio externo

```cpp
float* inL = omega_get_system_buffer("system.audio.in.0");
float* inR = omega_get_system_buffer("system.audio.in.1");
if (inL) { float s = *inL; /* procesar */ }
```

---

## 10. Verificación

### El guard de contratos

```bash
node scripts/review_module_contracts.mjs
```

Cruza los `bind` del `.acemm` contra los `OMEGA_PARAM`/`OMEGA_PORT` del `.cpp`. Falla si un bind no existe en el contrato, o si un parámetro del contrato se queda sin bind en el manifiesto. **Pasa hoy para los 11 módulos de `modules/`.**

### El verificador de audio

```bash
node scripts/verify_voice_chain_runtime.mjs
```

Carga los binarios reales en el motor WASM de Node y comprueba que la cadena de voz suena. No es un test unitario: es una prueba de audio de verdad.

### El guard de paridad de manifiestos

```bash
node scripts/check_manifest_parity.mjs
```

Verifica que `modules/` es la fuente única (las copias en `web/public/modules` y `host/Resources/modules` deben ser junctions, no copias) y que el catálogo generado está al día.

---

## 11. Lo que la documentación anterior daba por hecho y no era cierto

Registro explícito, para que nadie lo lea como vigente:

| Afirmación antigua | Estado real |
| :--- | :--- |
| `/include` contiene el SDK | Ahora es `engine/include` |
| `build_plugins.bat` construye | Ahora es `scripts/build_wasm.bat` |
| `/toolchain` incluye LLVM 22.1.4 | No existe; se usa el Emscripten del sistema |
| `omega_process` recibe `const float*` | La firma real es `float*` |
| `omega_set_voice_*` viene del SDK | No está en el SDK; se declara con `WASM_IMPORT` |
| Los puertos se declaran en `jacks:` | Van en `ports:`, con `type:` en vez de `color:` |
| `omega_publish_midi(0, …)` | Se usa la constante `MIDI_PORT_MAIN` |

---

*OMEGA — Engineering Standard V7.2.3. Rutas y ABI verificados en ABDOmegaUnified, 2026-10-04.*