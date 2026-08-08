/** 
 * @file OmegaConstants.h
 * OMEGA SDK — FUENTE CANÓNICA (ABDOmegaUnified).
 * engine/include es la fuente única de verdad del SDK de módulos WASM.
 * Editable en su lugar: todos los módulos de modules/ compilan contra esta copia.
 */

#pragma once

#include <stdint.h>

namespace Omega::Constants {

    // ── Math ───────────────────────────────────────────────────────────────
    constexpr float PI  = 3.141592653589793F;
    constexpr float TAU = 6.283185307179586F; // 2 * PI

    // MIDI Status Bytes
    constexpr uint8_t MIDI_NOTE_OFF         = 0x80;
    constexpr uint8_t MIDI_NOTE_ON          = 0x90;
    constexpr uint8_t MIDI_POLY_AFTERTOUCH  = 0xA0;
    constexpr uint8_t MIDI_CONTROL_CHANGE   = 0xB0;
    constexpr uint8_t MIDI_PROGRAM_CHANGE   = 0xC0;
    constexpr uint8_t MIDI_CHANNEL_PRESSURE = 0xD0;
    constexpr uint8_t MIDI_PITCH_BEND       = 0xE0;
    constexpr uint8_t MIDI_SYSTEM_MESSAGE   = 0xF0;

    // MIDI Masks & Limits
    constexpr uint8_t MIDI_CHANNEL_MASK     = 0x0F;
    constexpr uint8_t MIDI_STATUS_MASK      = 0xF0;
    constexpr uint8_t MIDI_MAX_VALUE        = 127;
    constexpr float   MIDI_NORM_FACTOR      = 1.0F / 127.0F;
    constexpr uint16_t MIDI_BEND_CENTER     = 8192;
    constexpr float   MIDI_BEND_NORM_FACTOR = 1.0F / 8192.0F;

    // Audio & DSP
    constexpr float   DEFAULT_SAMPLE_RATE   = 44100.0F;
    constexpr float   CONCERT_A_FREQ        = 440.0F;
    constexpr int     SEMITONES_PER_OCTAVE  = 12;
    constexpr float   TELEMETRY_FULL_SIGNAL = 1.0F;
    constexpr float   TELEMETRY_OFF         = 0.0F;
    constexpr float   GLIDE_MIN_THRESHOLD   = 0.001F;
    constexpr float   MS_TO_S_FACTOR        = 1000.0F;

    // ── Host routing & voice bus layout ─────────────────────────────────────
    // Puerto MIDI por defecto del host para publicación de eventos.
    constexpr uint32_t MIDI_PORT_MAIN = 0;
    // Layout de la voz del host: 16 buses float por voz; 0 = L, 1 = R.
    // Constantes de contrato del host: documentan el layout que los módulos
    // asumen (los módulos usan VOICE_BUS_RIGHT/LEFT y la ruta de voz).
    constexpr int VOICE_BUS_COUNT = 16;
    constexpr int VOICE_BUS_LEFT  = 0;
    constexpr int VOICE_BUS_RIGHT = 1;

    // ── Parámetros binarios (0/1) ───────────────────────────────────────────
    // Umbral de activación: un valor estrictamente superior se considera ON.
    // Los switches/params "bin" de todos los módulos usan este mismo criterio.
    constexpr float BIN_ON_THRESHOLD = 0.5F;

    // ── Defaults de comportamiento ajustable (referenciados por OMEGA_PARAM) ─
    // Valores canónicos para los params de manifiesto de los módulos; el
    // contrato embebido y el estado interno del DSP derivan de aquí (única fuente).
    constexpr float TONE_AMPLITUDE_DEFAULT   = 0.5F; // 440demo: amplitud del tono (0..1)
    constexpr float LED_HOLD_RATE_HZ_DEFAULT = 8.0F; // 440demo: cadencia del LED S&H (Hz)

} // namespace Omega::Constants
