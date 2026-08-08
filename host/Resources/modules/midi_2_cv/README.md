# OMEGA Module: MIDI 2 CV
## Era 7.2.3 — Pro MIDI-CV Converter (Industrial)

### 1. Overview
El módulo **MIDI 2 CV** convierte eventos MIDI (Note On/Off, Pitch Bend) en **CV / Gate / Velocity** para la vía de voz del host. Migrado desde el repositorio legacy `ABDOmega plugins` (`_historical/modules/midi_2_cv.cpp`). Es un módulo de **control** (no genera audio): los CV se publican vía imports del host (`omega_set_voice_*`).

### 2. Interface Design (VPC Compliance)

*   **Puerto CV Out (cyan)**: Frecuencia en Hz del pitch (nota + bend), escalada a la vía de voz vía `omega_set_voice_freq`.
*   **Puerto Gate Out (silver)**: 1.0 mientras hay nota (Note On), 0.0 en Note Off / Note On con velocity 0.
*   **Puerto Velocity (cyan)**: Velocity normalizada 0..1 (`omega_set_voice_vel`).
*   **Puerto Aftertouch (cyan)**: Reservado — publica vía `omega_set_voice_at` (el host lo expone; el cpp actual no emite aftertouch MIDI, ver §5).
*   **Params ocultos** (editables desde el frontal vía inspector/RPC): `midi_channel`, `glide_mode`, `glide_time`, `bend_range`, `at_mode`.

### 3. Technical Contract
*   **ID**: `midi_2_cv`
*   **Family**: `control`
*   **Form Factor**: 1U (8 HP — 4 puertos en fila)
*   **Parameters**:
    1. `midi_channel`: Canal MIDI (0..16). **Default 0** = omnicanal.
    2. `glide_mode`: Glide binario (0/1). **Default 0**.
    3. `glide_time`: Tiempo de glide (0..2000 ms). **Default 0**.
    4. `bend_range`: Rango de pitch bend (0..24 st). **Default 2**.
    5. `at_mode`: Modo aftertouch (0/1). **Default 0**.
*   **Ports**:
    1. `cv_out` (output, cv): Frecuencia de la nota + bend.
    2. `gate_out` (output, gate): Estado de la nota.
    3. `vel_out` (output, cv): Velocity 0..1.
    4. `at_out` (output, cv): Aftertouch (reservado).
*   **DSP**: Tabla de semitonos `SEMITONE_TABLE` + duplicación de octavas para MIDI→Hz (zero-libm); glide por pendiente por muestra; pitch bend normalizado con sensibilidad 0.7 frente al rango en semitonos.
*   **Constantes**: sin magic numbers — las constantes MIDI (`MIDI_NOTE_ON/OFF`, `MIDI_PITCH_BEND`, `MIDI_CHANNEL_MASK`, `MIDI_BEND_CENTER`, `MIDI_NORM_FACTOR`, etc.) viven en `engine/include/Core/Ace/OmegaConstants.h`; las específicas del módulo en `constexpr` anónimos.

### 4. Compilation & Deployment
1. Compila con `scripts/build_wasm.bat` (Emscripten `em++`, `-s SIDE_MODULE=1`).
2. El `.wasm` canónico vive en `modules/midi_2_cv/` (estantería fuente única — junctions a `web/public/modules` y `host/Resources/modules`).
3. El catálogo se regenera con `scripts/generate_acemm_catalog.mjs` (paso 0.6 de `build_auto.bat`).
4. Verificación de convergencia: `scripts/check_manifest_parity.mjs`.

### 5. Notes & Known Gaps
*   El cpp histórico **no emite aftertouch MIDI** (mensaje Channel Pressure 0xD0 sin manejar); el puerto `at_out` queda conectado a `omega_set_voice_at` pero sin fuente — implementación pendiente.
*   El módulo no escribe en `buffer` (módulo de control): `omega_process` solo resuelve el glide por bloque.

---
*ABD-SynthEngine Industrial Standards — 2026*
