# OMEGA Module: 440 DEMO
## Era 7.2.3 — Fixed 440 Hz Test Tone Generator

### 1. Overview
El módulo **440 DEMO** genera un tono senoidal fijo de **440 Hz (A4)** para pruebas de sonido. Es el módulo de referencia más simple del ecosistema: un generador sin entradas, con switch de encendido/apagado (ON por defecto — suena nada más cargarse), LED de actividad y salida de audio.

### 2. Interface Design (VPC Compliance)

*   **Switch (ON/OFF)**: Interruptor cian que activa/desactiva el tono. **Por defecto en ON** (`enabled` default 1) — el módulo suena inmediatamente al ser instanciado.
*   **LED de Actividad (ACT)**: Naranja. Muestra la actividad del oscilador mediante **sample & hold a ~8 Hz de un LFO rectificado de 3 Hz** (tasas coprimas: el fasor deriva en cada hold y el brillo oscila visiblemente — **8 actualizaciones/s**, envolvente de brillo con periodo 0,5 s). Muestrear la propia senoide de 440 Hz a 8 Hz congelaría el valor en 0 (440/8 = 55 ciclos exactos por hold → siempre `|sin(0)| = 0`).
*   **Salida de Audio (OUT)**: Puerto cian (convención audio) donde se emite el tono.

### 3. Technical Contract
*   **ID**: `440demo`
*   **Family**: `utility`
*   **Form Factor**: 1U (4 HP — ancho mínimo con switch + LED + port)
*   **Parameters** (parte del manifiesto — editables desde el frontal vía inspector/RPC; `amplitude` y `led_rate` son nodos lógicos `hidden` en el panel):
    1. `enabled`: Interruptor binario (0/1). **Default 1 (ON)**.
    2. `amplitude`: Amplitud del tono (0..1). **Default 0.5** (`TONE_AMPLITUDE_DEFAULT`).
    3. `led_rate`: Cadencia del S&H del LED (1..30 Hz). **Default 8** (`LED_HOLD_RATE_HZ_DEFAULT`).
*   **Ports**:
    1. `audio_out` (output, audio): Tono 440 Hz.
    2. `led_activity` (output, led): Telemetría del LED.
*   **DSP**: Seno por aproximación racional de Bhaskara I (`sinApprox`) — **sin dependencia de libm** (SIDE_MODULE de Emscripten sin imports de math), coherente con el estilo zero-stdlib del ecosistema. Amplitud desde el param `amplitude` (default 0.5), fase acumulativa por muestra, cadencia del LED desde el param `led_rate` (default 8 Hz).
*   **Constantes**: sin magic numbers — las constantes compartidas (PI/TAU, `BIN_ON_THRESHOLD`, `CONCERT_A_FREQ`, buses de voz, defaults) viven en `engine/include/Core/Ace/OmegaConstants.h`; las específicas del módulo (LFO 3 Hz, coeficientes de Bhaskara) en `constexpr` anónimos del propio `.cpp`.

> ⚠️ **Nota telemetría (limitación pre-existente del host)**: `omega_publish_telemetry` en `WasmHostInterface.cpp` registra el pin con `instanceId = "midi_in"` hardcodeado (fallback) — el LED de cualquier módulo comparte el registro con midi_in. No es culpa del módulo; la separación por-módulo requeriría un cambio de host.

### 4. Compilation & Deployment
1. Compila con `scripts/build_wasm.bat` (Emscripten `em++`, `-s SIDE_MODULE=1`).
2. El `.wasm` canónico vive en `modules/440demo/` (estantería fuente única — junctions a `web/public/modules` y `host/Resources/modules`).
3. El catálogo se regenera con `scripts/generate_acemm_catalog.mjs` (paso 0.6 de `build_auto.bat`).

---
*ABD-SynthEngine Industrial Standards — 2026*
